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
	GetByID(ctx context.Context, id string) (*model.Representative, error)
	GetByBoundaryID(ctx context.Context, boundaryID string) ([]model.Representative, error)
	UpdateClaim(ctx context.Context, repID, userID string) error
	CreateStaff(ctx context.Context, staff *model.StaffAccount) error
	GetStaffByRepID(ctx context.Context, repID string) ([]model.StaffAccount, error)
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

// GetByID retrieves a representative by ID.
func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*model.Representative, error) {
	query := `
		SELECT id, name, party, position, level, boundary_id, photo_url,
		       claimed, COALESCE(claimed_by_user_id, ''), verified, rating, contact_info
		FROM representatives WHERE id = $1
	`

	rep := &model.Representative{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&rep.ID, &rep.Name, &rep.Party, &rep.Position, &rep.Level,
		&rep.BoundaryID, &rep.PhotoURL, &rep.Claimed, &rep.ClaimedByUserID,
		&rep.Verified, &rep.Rating, &rep.ContactInfo,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return rep, nil
}

// GetByBoundaryID retrieves all representatives for a given boundary.
func (r *PostgresRepository) GetByBoundaryID(ctx context.Context, boundaryID string) ([]model.Representative, error) {
	query := `
		SELECT id, name, party, position, level, boundary_id, photo_url,
		       claimed, COALESCE(claimed_by_user_id, ''), verified, rating, contact_info
		FROM representatives WHERE boundary_id = $1
		ORDER BY position, name
	`

	rows, err := r.pool.Query(ctx, query, boundaryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reps []model.Representative
	for rows.Next() {
		var rep model.Representative
		if err := rows.Scan(
			&rep.ID, &rep.Name, &rep.Party, &rep.Position, &rep.Level,
			&rep.BoundaryID, &rep.PhotoURL, &rep.Claimed, &rep.ClaimedByUserID,
			&rep.Verified, &rep.Rating, &rep.ContactInfo,
		); err != nil {
			return nil, err
		}
		reps = append(reps, rep)
	}

	return reps, rows.Err()
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
		INSERT INTO staff_accounts (id, rep_id, user_id, role, permissions)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err := r.pool.Exec(ctx, query, staff.ID, staff.RepID, staff.UserID, staff.Role, staff.Permissions)
	return err
}

// GetStaffByRepID retrieves all staff accounts for a representative.
func (r *PostgresRepository) GetStaffByRepID(ctx context.Context, repID string) ([]model.StaffAccount, error) {
	query := `
		SELECT id, rep_id, user_id, role, permissions
		FROM staff_accounts WHERE rep_id = $1
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

func generateID() string {
	data := fmt.Sprintf("%d", time.Now().UnixNano())
	h := sha256.Sum256([]byte(data))
	return hex.EncodeToString(h[:16])
}
