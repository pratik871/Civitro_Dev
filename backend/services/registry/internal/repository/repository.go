package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/civitro/services/registry/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository defines the data access interface for the registry service.
type Repository interface {
	ListAll(ctx context.Context) ([]model.Representative, error)
	GetByID(ctx context.Context, id string) (*model.Representative, error)
	GetByBoundaryID(ctx context.Context, boundaryID string) ([]model.Representative, error)
	GetByDesignation(ctx context.Context, designation string, boundaryID string) ([]model.Representative, error)
	GetByOfficialType(ctx context.Context, officialType string, boundaryID string) ([]model.Representative, error)
	Create(ctx context.Context, req *model.CreateRepresentativeRequest) (*model.Representative, error)
	UpdateClaim(ctx context.Context, repID, userID string) error
	CreateStaff(ctx context.Context, staff *model.StaffAccount) error
	GetStaffByRepID(ctx context.Context, repID string) ([]model.StaffAccount, error)
	GetSeatReservation(ctx context.Context, boundaryID, electionCycleID string) (*model.SeatReservation, error)
	GetRepresentativeStats(ctx context.Context, id string) (map[string]interface{}, error)
	GetRecentActivity(ctx context.Context, repID string, limit int) ([]map[string]interface{}, error)
}

// ErrNotFound is returned when a record is not found.
var ErrNotFound = errors.New("record not found")

// PostgresRepository implements Repository using PostgreSQL.
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository creates a new PostgresRepository.
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// repColumns is the standard SELECT list for representatives.
const repColumns = `id, name, COALESCE(party, ''), position, level,
	COALESCE(boundary_id::text, ''), COALESCE(photo_url, ''),
	claimed, COALESCE(claimed_by_user_id::text, ''), verified,
	COALESCE(rating, 0), COALESCE(contact_info, '{}'),
	COALESCE(official_type, 'elected'), COALESCE(designation, ''),
	COALESCE(state_designation, ''), term_start::text, term_end::text,
	COALESCE(election_cycle_id::text, '')`

// scanRep scans a row into a Representative.
func scanRep(row pgx.Row) (*model.Representative, error) {
	rep := &model.Representative{}
	err := row.Scan(
		&rep.ID, &rep.Name, &rep.Party, &rep.Position, &rep.Level,
		&rep.BoundaryID, &rep.PhotoURL,
		&rep.Claimed, &rep.ClaimedByUserID, &rep.Verified,
		&rep.Rating, &rep.ContactInfo,
		&rep.OfficialType, &rep.Designation,
		&rep.StateDesignation, &rep.TermStart, &rep.TermEnd,
		&rep.ElectionCycleID,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return rep, nil
}

// scanReps scans multiple rows into a slice of Representatives.
func scanReps(rows pgx.Rows) ([]model.Representative, error) {
	var reps []model.Representative
	for rows.Next() {
		rep := model.Representative{}
		if err := rows.Scan(
			&rep.ID, &rep.Name, &rep.Party, &rep.Position, &rep.Level,
			&rep.BoundaryID, &rep.PhotoURL,
			&rep.Claimed, &rep.ClaimedByUserID, &rep.Verified,
			&rep.Rating, &rep.ContactInfo,
			&rep.OfficialType, &rep.Designation,
			&rep.StateDesignation, &rep.TermStart, &rep.TermEnd,
			&rep.ElectionCycleID,
		); err != nil {
			return nil, err
		}
		reps = append(reps, rep)
	}
	return reps, rows.Err()
}

// ListAll retrieves all verified representatives.
func (r *PostgresRepository) ListAll(ctx context.Context) ([]model.Representative, error) {
	query := `SELECT ` + repColumns + ` FROM representatives WHERE verified = true ORDER BY level, name LIMIT 100`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanReps(rows)
}

// GetByID retrieves a representative by ID.
// GetRepresentativeStats returns enriched stats for a representative.
func (r *PostgresRepository) GetRepresentativeStats(ctx context.Context, id string) (map[string]interface{}, error) {
	stats := map[string]interface{}{
		"total_ratings":          0,
		"issues_total":           0,
		"issues_resolved":        0,
		"response_rate":          0.0,
		"promises_total":         0,
		"promises_fulfilled":     0,
		"promise_completion_rate": 0.0,
		"chi_score":              0,
		"boundary_name":          "",
		"avg_response_days":      0.0,
		"citizen_satisfaction":   0.0,
		"active_since":          "",
	}

	// Total ratings + breakdown averages
	var totalRatings int
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM satisfaction_surveys WHERE representative_id = $1`, id).Scan(&totalRatings)
	stats["total_ratings"] = totalRatings

	var avgResp, avgTransp, avgDelivery, avgAccess, avgImpact float64
	_ = r.pool.QueryRow(ctx, `
		SELECT COALESCE(AVG(responsiveness),0), COALESCE(AVG(transparency),0),
			   COALESCE(AVG(delivery_on_promises),0), COALESCE(AVG(accessibility),0),
			   COALESCE(AVG(overall_impact),0)
		FROM satisfaction_surveys WHERE representative_id = $1 AND responsiveness > 0
	`, id).Scan(&avgResp, &avgTransp, &avgDelivery, &avgAccess, &avgImpact)
	stats["responsiveness"] = avgResp
	stats["transparency"] = avgTransp
	stats["delivery_on_promises"] = avgDelivery
	stats["accessibility"] = avgAccess
	stats["overall_impact"] = avgImpact

	// Citizen satisfaction — average overall score
	if totalRatings > 0 {
		var avgScore float64
		_ = r.pool.QueryRow(ctx, `SELECT COALESCE(AVG(score),0) FROM satisfaction_surveys WHERE representative_id = $1 AND score > 0`, id).Scan(&avgScore)
		stats["citizen_satisfaction"] = avgScore
	}

	// Active since — term_start from representatives
	var termStart *time.Time
	_ = r.pool.QueryRow(ctx, `SELECT term_start FROM representatives WHERE id = $1`, id).Scan(&termStart)
	if termStart != nil {
		stats["active_since"] = termStart.Format("2006-01-02")
	}

	// Get boundary_id and name
	var boundaryID, boundaryName string
	_ = r.pool.QueryRow(ctx, `
		SELECT COALESCE(r.boundary_id::text, ''), COALESCE(b.name, '')
		FROM representatives r LEFT JOIN boundaries b ON b.id = r.boundary_id
		WHERE r.id = $1
	`, id).Scan(&boundaryID, &boundaryName)
	stats["boundary_name"] = boundaryName

	if boundaryID != "" {
		// Issues
		var issuesTotal, issuesResolved int
		_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM issues WHERE boundary_id = $1::uuid`, boundaryID).Scan(&issuesTotal)
		_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM issues WHERE boundary_id = $1::uuid AND status = 'resolved'`, boundaryID).Scan(&issuesResolved)
		stats["issues_total"] = issuesTotal
		stats["issues_resolved"] = issuesResolved
		if issuesTotal > 0 {
			stats["response_rate"] = float64(issuesResolved) / float64(issuesTotal)
		}

		// Avg response time (days between created_at and updated_at for resolved issues)
		var avgDays float64
		_ = r.pool.QueryRow(ctx, `
			SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400), 0)
			FROM issues WHERE boundary_id = $1::uuid AND status = 'resolved'
		`, boundaryID).Scan(&avgDays)
		stats["avg_response_days"] = avgDays

		// CHI
		var chiScore float64
		_ = r.pool.QueryRow(ctx, `SELECT COALESCE(overall_score, 0) FROM chi_scores WHERE boundary_id = $1::uuid ORDER BY computed_at DESC LIMIT 1`, boundaryID).Scan(&chiScore)
		stats["chi_score"] = int(chiScore)
	}

	// Promises
	var promisesTotal, promisesFulfilled int
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM promises WHERE leader_id = $1`, id).Scan(&promisesTotal)
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM promises WHERE leader_id = $1 AND status = 'fulfilled'`, id).Scan(&promisesFulfilled)
	stats["promises_total"] = promisesTotal
	stats["promises_fulfilled"] = promisesFulfilled
	if promisesTotal > 0 {
		stats["promise_completion_rate"] = float64(promisesFulfilled) / float64(promisesTotal)
	}

	return stats, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*model.Representative, error) {
	query := `SELECT ` + repColumns + ` FROM representatives WHERE id = $1`
	return scanRep(r.pool.QueryRow(ctx, query, id))
}

// GetByBoundaryID retrieves all representatives for a given boundary.
func (r *PostgresRepository) GetByBoundaryID(ctx context.Context, boundaryID string) ([]model.Representative, error) {
	query := `SELECT ` + repColumns + ` FROM representatives WHERE boundary_id = $1 ORDER BY official_type, position, name`

	rows, err := r.pool.Query(ctx, query, boundaryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanReps(rows)
}

// GetByDesignation retrieves representatives by canonical designation within a boundary.
// If boundaryID is empty, searches across all boundaries.
func (r *PostgresRepository) GetByDesignation(ctx context.Context, designation string, boundaryID string) ([]model.Representative, error) {
	var query string
	var args []interface{}

	if boundaryID != "" {
		query = `SELECT ` + repColumns + ` FROM representatives WHERE designation = $1 AND boundary_id = $2 ORDER BY name`
		args = []interface{}{designation, boundaryID}
	} else {
		query = `SELECT ` + repColumns + ` FROM representatives WHERE designation = $1 ORDER BY name`
		args = []interface{}{designation}
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanReps(rows)
}

// GetByOfficialType retrieves representatives by type (elected/appointed) within a boundary.
func (r *PostgresRepository) GetByOfficialType(ctx context.Context, officialType string, boundaryID string) ([]model.Representative, error) {
	var query string
	var args []interface{}

	if boundaryID != "" {
		query = `SELECT ` + repColumns + ` FROM representatives WHERE official_type = $1 AND boundary_id = $2 ORDER BY designation, name`
		args = []interface{}{officialType, boundaryID}
	} else {
		query = `SELECT ` + repColumns + ` FROM representatives WHERE official_type = $1 ORDER BY designation, name`
		args = []interface{}{officialType}
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanReps(rows)
}

// Create inserts a new representative.
func (r *PostgresRepository) Create(ctx context.Context, req *model.CreateRepresentativeRequest) (*model.Representative, error) {
	query := `
		INSERT INTO representatives (
			name, party, position, level, boundary_id, photo_url,
			official_type, designation, state_designation,
			term_start, term_end, election_cycle_id, contact_info
		) VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''),
				  $7, $8, NULLIF($9, ''),
				  $10::date, $11::date, NULLIF($12, '')::uuid, COALESCE($13, '{}'))
		RETURNING id
	`

	var id string
	err := r.pool.QueryRow(ctx, query,
		req.Name, req.Party, req.Position, req.Level, req.BoundaryID, req.PhotoURL,
		req.OfficialType, req.Designation, req.StateDesignation,
		req.TermStart, req.TermEnd, req.ElectionCycleID, req.ContactInfo,
	).Scan(&id)
	if err != nil {
		return nil, err
	}

	return r.GetByID(ctx, id)
}

// UpdateClaim marks a representative profile as claimed by a user.
func (r *PostgresRepository) UpdateClaim(ctx context.Context, repID, userID string) error {
	query := `
		UPDATE representatives SET claimed = true, claimed_by_user_id = $1
		WHERE id = $2 AND claimed = false
	`

	tag, err := r.pool.Exec(ctx, query, userID, repID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("representative not found or already claimed")
	}
	return nil
}

// CreateStaff creates a new staff account for a representative.
func (r *PostgresRepository) CreateStaff(ctx context.Context, staff *model.StaffAccount) error {
	if staff.ID == "" {
		staff.ID = generateID()
	}

	query := `
		INSERT INTO staff_accounts (id, representative_id, user_id, role, permissions)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err := r.pool.Exec(ctx, query, staff.ID, staff.RepID, staff.UserID, staff.Role, staff.Permissions)
	return err
}

// GetStaffByRepID retrieves all staff accounts for a representative.
func (r *PostgresRepository) GetStaffByRepID(ctx context.Context, repID string) ([]model.StaffAccount, error) {
	query := `
		SELECT id, representative_id, user_id, role, permissions
		FROM staff_accounts WHERE representative_id = $1
		ORDER BY role, user_id
	`

	rows, err := r.pool.Query(ctx, query, repID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var staff []model.StaffAccount
	for rows.Next() {
		var s model.StaffAccount
		if err := rows.Scan(&s.ID, &s.RepID, &s.UserID, &s.Role, &s.Permissions); err != nil {
			return nil, err
		}
		staff = append(staff, s)
	}

	return staff, rows.Err()
}

// GetSeatReservation retrieves the reservation for a boundary in a given election cycle.
func (r *PostgresRepository) GetSeatReservation(ctx context.Context, boundaryID, electionCycleID string) (*model.SeatReservation, error) {
	query := `
		SELECT id, boundary_id, election_cycle_id, reservation_category
		FROM seat_reservations
		WHERE boundary_id = $1 AND election_cycle_id = $2
	`

	sr := &model.SeatReservation{}
	err := r.pool.QueryRow(ctx, query, boundaryID, electionCycleID).Scan(
		&sr.ID, &sr.BoundaryID, &sr.ElectionCycleID, &sr.ReservationCategory,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return sr, nil
}

func generateID() string {
	data := fmt.Sprintf("%d", time.Now().UnixNano())
	h := sha256.Sum256([]byte(data))
	return hex.EncodeToString(h[:16])
}

// GetRecentActivity returns recent activity entries for a representative.
func (r *PostgresRepository) GetRecentActivity(ctx context.Context, repID string, limit int) ([]map[string]interface{}, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, type, title, description, created_at
		FROM representative_activity
		WHERE representative_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, repID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		var id, actType, title, desc string
		var createdAt time.Time
		if err := rows.Scan(&id, &actType, &title, &desc, &createdAt); err != nil {
			return nil, err
		}
		result = append(result, map[string]interface{}{
			"id":          id,
			"type":        actType,
			"title":       title,
			"description": desc,
			"timestamp":   createdAt,
		})
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	return result, nil
}
