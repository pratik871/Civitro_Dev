package repository

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	"github.com/civitro/services/identity/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// splitWardName splits "Ward 45 - Andheri East" into ["Ward 45", "Andheri East"]
func splitWardName(name string) [2]string {
	if idx := strings.Index(name, " - "); idx > 0 {
		return [2]string{name[:idx], name[idx+3:]}
	}
	return [2]string{name, ""}
}

func itoa(n int) string {
	return strconv.Itoa(n)
}

// Repository defines the data access interface for the identity service.
type Repository interface {
	// Users
	CreateUser(ctx context.Context, user *model.User) error
	GetUserByPhone(ctx context.Context, phone string) (*model.User, error)
	GetUserByID(ctx context.Context, id string) (*model.User, error)
	UpdateVerificationLevel(ctx context.Context, userID string, level model.VerificationLevel, aadhaarHash string) error
	UpdatePreferredLanguage(ctx context.Context, userID string, language string) error

	// Refresh tokens
	CreateRefreshToken(ctx context.Context, token *model.RefreshToken) error
	GetRefreshTokenByHash(ctx context.Context, tokenHash string) (*model.RefreshToken, error)
	DeleteRefreshToken(ctx context.Context, id string) error
	DeleteRefreshTokensByUser(ctx context.Context, userID string) error

	// Aadhaar verifications
	CreateAadhaarVerification(ctx context.Context, v *model.AadhaarVerification) error
	GetAadhaarVerificationByUser(ctx context.Context, userID string) (*model.AadhaarVerification, error)
	GetAadhaarVerificationByUIDHash(ctx context.Context, uidHash string) (*model.AadhaarVerification, error)

	// Location
	UpdateLocation(ctx context.Context, userID string, lat, lng float64, boundaryID string) error
	GetUserLocation(ctx context.Context, userID string) (*float64, *float64, string, string)

	// Civic score
	GetCivicScore(ctx context.Context, userID string) (int, string)

	// Dashboard
	GetDashboardStats(ctx context.Context, userID string) (*model.DashboardStats, error)

	// Governance chain
	GetGovernanceChain(ctx context.Context, wardID string) ([]model.GovernanceChainEntry, error)

	// Ward mood
	GetWardMood(ctx context.Context, wardID string) (*model.WardMood, error)
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

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

// CreateUser inserts a new user into the database.
func (r *PostgresRepository) CreateUser(ctx context.Context, user *model.User) error {
	query := `
		INSERT INTO users (id, phone, name, email, verification_level, aadhaar_hash, device_fingerprint, preferred_language, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.pool.Exec(ctx, query,
		user.ID, user.Phone, user.Name, user.Email,
		user.VerificationLevel, user.AadhaarHash, user.DeviceFingerprint,
		user.PreferredLanguage,
		user.CreatedAt, user.UpdatedAt,
	)
	return err
}

// GetUserByPhone retrieves a user by their phone number.
func (r *PostgresRepository) GetUserByPhone(ctx context.Context, phone string) (*model.User, error) {
	query := `
		SELECT id, phone, name, email, COALESCE(role, 'citizen'), verification_level, aadhaar_hash, device_fingerprint, preferred_language, created_at, updated_at
		FROM users WHERE phone = $1
	`
	user := &model.User{}
	err := r.pool.QueryRow(ctx, query, phone).Scan(
		&user.ID, &user.Phone, &user.Name, &user.Email, &user.Role,
		&user.VerificationLevel, &user.AadhaarHash, &user.DeviceFingerprint,
		&user.PreferredLanguage,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return user, nil
}

// GetUserByID retrieves a user by their ID.
func (r *PostgresRepository) GetUserByID(ctx context.Context, id string) (*model.User, error) {
	query := `
		SELECT id, phone, name, email, COALESCE(role, 'citizen'), verification_level, aadhaar_hash, device_fingerprint, preferred_language, created_at, updated_at
		FROM users WHERE id = $1
	`
	user := &model.User{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Phone, &user.Name, &user.Email, &user.Role,
		&user.VerificationLevel, &user.AadhaarHash, &user.DeviceFingerprint,
		&user.PreferredLanguage,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return user, nil
}

// GetCivicScore fetches the user's civic score from the civic_scores table.
// Returns (score, tier). Returns (0, "new_citizen") if no record exists.
func (r *PostgresRepository) GetCivicScore(ctx context.Context, userID string) (int, string) {
	var score int
	var tier string
	err := r.pool.QueryRow(ctx,
		`SELECT COALESCE(credibility_score, 0), COALESCE(tier, 'new_citizen') FROM civic_scores WHERE user_id = $1`,
		userID,
	).Scan(&score, &tier)
	if err != nil {
		return 0, "new_citizen"
	}
	return score, tier
}

// UpdateVerificationLevel updates a user's verification level and aadhaar hash.
func (r *PostgresRepository) UpdateVerificationLevel(ctx context.Context, userID string, level model.VerificationLevel, aadhaarHash string) error {
	query := `
		UPDATE users SET verification_level = $1, aadhaar_hash = $2, updated_at = NOW()
		WHERE id = $3
	`
	tag, err := r.pool.Exec(ctx, query, level, aadhaarHash, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// UpdatePreferredLanguage updates a user's preferred language.
func (r *PostgresRepository) UpdatePreferredLanguage(ctx context.Context, userID string, language string) error {
	query := `UPDATE users SET preferred_language = $1, updated_at = NOW() WHERE id = $2`
	tag, err := r.pool.Exec(ctx, query, language, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

// UpdateLocation updates a user's GPS location and primary boundary.
func (r *PostgresRepository) UpdateLocation(ctx context.Context, userID string, lat, lng float64, boundaryID string) error {
	query := `
		UPDATE users
		SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
		    primary_boundary_id = NULLIF($3, '')::uuid,
		    location_updated_at = NOW(),
		    updated_at = NOW()
		WHERE id = $4
	`
	tag, err := r.pool.Exec(ctx, query, lng, lat, boundaryID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetUserLocation returns lat, lng, boundary_id, boundary_name for a user.
func (r *PostgresRepository) GetUserLocation(ctx context.Context, userID string) (*float64, *float64, string, string) {
	var lat, lng *float64
	var boundaryID, boundaryName string
	err := r.pool.QueryRow(ctx, `
		SELECT ST_Y(u.location), ST_X(u.location),
		       COALESCE(u.primary_boundary_id::text, ''),
		       COALESCE(b.name, '')
		FROM users u
		LEFT JOIN boundaries b ON b.id = u.primary_boundary_id
		WHERE u.id = $1 AND u.location IS NOT NULL
	`, userID).Scan(&lat, &lng, &boundaryID, &boundaryName)
	if err != nil {
		return nil, nil, "", ""
	}
	return lat, lng, boundaryID, boundaryName
}

// ---------------------------------------------------------------------------
// Refresh Tokens
// ---------------------------------------------------------------------------

// CreateRefreshToken inserts a new refresh token.
func (r *PostgresRepository) CreateRefreshToken(ctx context.Context, token *model.RefreshToken) error {
	query := `
		INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.pool.Exec(ctx, query,
		token.ID, token.UserID, token.TokenHash, token.DeviceInfo,
		token.ExpiresAt, token.CreatedAt,
	)
	return err
}

// GetRefreshTokenByHash retrieves a refresh token by its SHA256 hash.
func (r *PostgresRepository) GetRefreshTokenByHash(ctx context.Context, tokenHash string) (*model.RefreshToken, error) {
	query := `
		SELECT id, user_id, token_hash, device_info, expires_at, created_at
		FROM refresh_tokens WHERE token_hash = $1
	`
	t := &model.RefreshToken{}
	err := r.pool.QueryRow(ctx, query, tokenHash).Scan(
		&t.ID, &t.UserID, &t.TokenHash, &t.DeviceInfo,
		&t.ExpiresAt, &t.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return t, nil
}

// DeleteRefreshToken removes a single refresh token by ID.
func (r *PostgresRepository) DeleteRefreshToken(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE id = $1`, id)
	return err
}

// DeleteRefreshTokensByUser removes all refresh tokens for a user.
func (r *PostgresRepository) DeleteRefreshTokensByUser(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE user_id = $1`, userID)
	return err
}

// ---------------------------------------------------------------------------
// Aadhaar Verifications
// ---------------------------------------------------------------------------

// CreateAadhaarVerification inserts a new Aadhaar verification record.
func (r *PostgresRepository) CreateAadhaarVerification(ctx context.Context, v *model.AadhaarVerification) error {
	query := `
		INSERT INTO aadhaar_verifications
			(id, user_id, reference_id, uid_hash, name, dob, gender, address, photo_key, signature_valid, xml_timestamp, verified_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := r.pool.Exec(ctx, query,
		v.ID, v.UserID, v.ReferenceID, v.UIDHash,
		v.Name, v.DOB, v.Gender, v.Address, v.PhotoKey,
		v.SignatureValid, v.XMLTimestamp, v.VerifiedAt,
	)
	return err
}

// GetAadhaarVerificationByUser retrieves the Aadhaar verification for a user.
func (r *PostgresRepository) GetAadhaarVerificationByUser(ctx context.Context, userID string) (*model.AadhaarVerification, error) {
	query := `
		SELECT id, user_id, reference_id, uid_hash, name, dob, gender, address, photo_key, signature_valid, xml_timestamp, verified_at
		FROM aadhaar_verifications WHERE user_id = $1
	`
	v := &model.AadhaarVerification{}
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&v.ID, &v.UserID, &v.ReferenceID, &v.UIDHash,
		&v.Name, &v.DOB, &v.Gender, &v.Address, &v.PhotoKey,
		&v.SignatureValid, &v.XMLTimestamp, &v.VerifiedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return v, nil
}

// GetAadhaarVerificationByUIDHash checks for existing verification by UID hash (dedup).
func (r *PostgresRepository) GetAadhaarVerificationByUIDHash(ctx context.Context, uidHash string) (*model.AadhaarVerification, error) {
	query := `
		SELECT id, user_id, reference_id, uid_hash, name, dob, gender, address, photo_key, signature_valid, xml_timestamp, verified_at
		FROM aadhaar_verifications WHERE uid_hash = $1
	`
	v := &model.AadhaarVerification{}
	err := r.pool.QueryRow(ctx, query, uidHash).Scan(
		&v.ID, &v.UserID, &v.ReferenceID, &v.UIDHash,
		&v.Name, &v.DOB, &v.Gender, &v.Address, &v.PhotoKey,
		&v.SignatureValid, &v.XMLTimestamp, &v.VerifiedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return v, nil
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Governance Chain
// ---------------------------------------------------------------------------

// GetGovernanceChain retrieves the governance escalation chain for a ward.
func (r *PostgresRepository) GetGovernanceChain(ctx context.Context, wardID string) ([]model.GovernanceChainEntry, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, ward_id, tier, level, is_department_routed, department_category,
		       name, title, initials, party, is_elected,
		       response_time_days, rating, issues_label
		FROM governance_chain
		WHERE ward_id = $1::uuid
		ORDER BY tier, level
	`, wardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chain []model.GovernanceChainEntry
	for rows.Next() {
		var e model.GovernanceChainEntry
		var respDays, rating *float64
		var deptCat, party, issuesLabel *string
		if err := rows.Scan(
			&e.ID, &e.WardID, &e.Tier, &e.Level, &e.IsDepartmentRouted, &deptCat,
			&e.Name, &e.Title, &e.Initials, &party, &e.IsElected,
			&respDays, &rating, &issuesLabel,
		); err != nil {
			return nil, err
		}
		if deptCat != nil {
			e.DepartmentCategory = *deptCat
		}
		if party != nil {
			e.Party = *party
		}
		if respDays != nil {
			e.ResponseTimeDays = respDays
		}
		if rating != nil {
			e.Rating = rating
		}
		if issuesLabel != nil {
			e.IssuesLabel = *issuesLabel
		}
		chain = append(chain, e)
	}
	if chain == nil {
		chain = []model.GovernanceChainEntry{}
	}
	return chain, nil
}

// ---------------------------------------------------------------------------
// Ward Mood
// ---------------------------------------------------------------------------

// GetWardMood retrieves the precomputed ward mood/sentiment data.
func (r *PostgresRepository) GetWardMood(ctx context.Context, wardID string) (*model.WardMood, error) {
	var mood model.WardMood
	var topicsJSON, sparklineJSON []byte
	err := r.pool.QueryRow(ctx, `
		SELECT ward_id, mood, score, topics, trend_direction, trend_change_percent, trend_sparkline, updated_at
		FROM ward_mood WHERE ward_id = $1::uuid
	`, wardID).Scan(
		&mood.WardID, &mood.Mood, &mood.Score, &topicsJSON,
		&mood.TrendDirection, &mood.TrendChangePercent, &sparklineJSON, &mood.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	json.Unmarshal(topicsJSON, &mood.Topics)
	json.Unmarshal(sparklineJSON, &mood.TrendSparkline)
	return &mood, nil
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

// GetDashboardStats aggregates dashboard statistics for the given user.
func (r *PostgresRepository) GetDashboardStats(ctx context.Context, userID string) (*model.DashboardStats, error) {
	stats := &model.DashboardStats{}

	// 1. Civic score + tier
	var score int
	var tier string
	err := r.pool.QueryRow(ctx,
		`SELECT COALESCE(credibility_score, 0), COALESCE(tier, 'new_citizen') FROM civic_scores WHERE user_id = $1`,
		userID,
	).Scan(&score, &tier)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	stats.CivicScore = score
	stats.CivicLevel = tier

	// 2. User's ward info
	var wardID, wardName string
	err = r.pool.QueryRow(ctx, `
		SELECT COALESCE(u.primary_boundary_id::text, ''), COALESCE(b.name, '')
		FROM users u
		LEFT JOIN boundaries b ON b.id = u.primary_boundary_id
		WHERE u.id = $1
	`, userID).Scan(&wardID, &wardName)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	stats.WardID = wardID
	stats.WardName = wardName

	// 3. Issues reported by this user
	err = r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM issues WHERE user_id = $1`, userID,
	).Scan(&stats.IssuesReported)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// 4. Polls voted
	err = r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM poll_votes WHERE user_id = $1`, userID,
	).Scan(&stats.PollsVoted)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// 5. Validations (issue confirmations by this user)
	err = r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM issue_confirmations WHERE user_id = $1`, userID,
	).Scan(&stats.Validations)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// 6. Actions supported
	err = r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM action_supporters WHERE user_id = $1`, userID,
	).Scan(&stats.ActionsSupported)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// 7. Actions started (created)
	err = r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM community_actions WHERE creator_id = $1`, userID,
	).Scan(&stats.ActionsStarted)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// 8. Streak days (civic_scores has no streak_days column; use reports_filed as proxy)
	// stats.StreakDays stays 0

	// 9. Active citizens in user's ward (users table has no last_active; use updated_at)
	if wardID != "" {
		err = r.pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM users WHERE primary_boundary_id = $1::uuid AND updated_at > NOW() - INTERVAL '30 days'`,
			wardID,
		).Scan(&stats.ActiveCitizensInWard)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}

		// Trend: compare last 30 days vs previous 30 days
		var previousCount int
		err = r.pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM users
			WHERE primary_boundary_id = $1::uuid
			  AND updated_at > NOW() - INTERVAL '60 days'
			  AND updated_at <= NOW() - INTERVAL '30 days'
		`, wardID).Scan(&previousCount)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if previousCount > 0 {
			stats.ActiveCitizensTrend = ((stats.ActiveCitizensInWard - previousCount) * 100) / previousCount
		}
	}

	// 10. Active polls count
	err = r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM polls WHERE active = true AND ends_at > NOW()`,
	).Scan(&stats.ActivePollsCount)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// 11. Unread messages
	err = r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false`, userID,
	).Scan(&stats.UnreadMessages)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// 12. Recently resolved issues in user's ward (last 30 days)
	// issues table uses: text (not title), boundary_id (not ward_id), status='resolved', updated_at (not resolved_at)
	stats.RecentlyResolved = []model.RecentlyResolved{}
	if wardID != "" {
		rows, err := r.pool.Query(ctx, `
			SELECT i.id, i.text, i.updated_at,
			       (SELECT COUNT(*) FROM issues sub WHERE sub.category = i.category AND sub.boundary_id = i.boundary_id) as citizen_reports
			FROM issues i
			WHERE i.boundary_id = $1::uuid
			  AND i.status = 'resolved'
			  AND i.updated_at > NOW() - INTERVAL '30 days'
			ORDER BY i.updated_at DESC
			LIMIT 5
		`, wardID)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		for rows.Next() {
			var r model.RecentlyResolved
			var resolvedAt interface{}
			if err := rows.Scan(&r.ID, &r.Title, &resolvedAt, &r.CitizenReports); err != nil {
				return nil, err
			}
			if t, ok := resolvedAt.(interface{ Format(string) string }); ok {
				r.ResolvedAt = t.Format("2006-01-02T15:04:05Z")
			}
			stats.RecentlyResolved = append(stats.RecentlyResolved, r)
		}
	}

	// 13. Ward area (extract from ward name e.g. "Ward 45 - Andheri East" → "Andheri East")
	if wardName != "" {
		parts := splitWardName(wardName)
		stats.WardName = parts[0]
		stats.WardArea = parts[1]
	}

	// 14. Active community actions count
	if wardID != "" {
		err = r.pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM community_actions WHERE ward_id = $1::uuid AND status IN ('open','acknowledged','committed','in_progress')`,
			wardID,
		).Scan(&stats.ActiveActionsCount)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	}

	// 15. Promises tracked
	err = r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM promises WHERE status IN ('detected','on_track')`,
	).Scan(&stats.PromisesTracked)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// 16. CHI score for user's ward
	if wardID != "" {
		err = r.pool.QueryRow(ctx,
			`SELECT COALESCE(overall_score, 0) FROM chi_scores WHERE boundary_id = $1::uuid ORDER BY computed_at DESC LIMIT 1`,
			wardID,
		).Scan(&stats.ChiScore)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	}

	// 17. Ward rank + total wards (rank by resolved issue count descending)
	if wardID != "" {
		err = r.pool.QueryRow(ctx, `
			WITH ward_resolved AS (
				SELECT boundary_id, COUNT(*) as resolved_count
				FROM issues WHERE status = 'resolved' AND boundary_id IS NOT NULL
				GROUP BY boundary_id
			),
			ranked AS (
				SELECT boundary_id, resolved_count,
				       RANK() OVER (ORDER BY resolved_count DESC) as rank
				FROM ward_resolved
			)
			SELECT COALESCE(rank, 0), (SELECT COUNT(DISTINCT boundary_id) FROM issues WHERE boundary_id IS NOT NULL)
			FROM ranked WHERE boundary_id = $1::uuid
		`, wardID).Scan(&stats.WardRank, &stats.TotalWards)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if stats.WardRank == 0 {
			stats.WardRank = 1
		}
		if stats.TotalWards == 0 {
			stats.TotalWards = 1
		}
	}

	// 18. Resolution trend + sparkline (7-day daily resolved counts)
	if wardID != "" {
		var yourResolved int
		err = r.pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM issues WHERE boundary_id = $1::uuid AND status = 'resolved' AND updated_at > NOW() - INTERVAL '7 days'`,
			wardID,
		).Scan(&yourResolved)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		stats.YourResolvedCount = yourResolved

		var prevResolved int
		err = r.pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM issues WHERE boundary_id = $1::uuid AND status = 'resolved' AND updated_at > NOW() - INTERVAL '14 days' AND updated_at <= NOW() - INTERVAL '7 days'`,
			wardID,
		).Scan(&prevResolved)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}

		if prevResolved > 0 {
			pct := ((yourResolved - prevResolved) * 100) / prevResolved
			if pct >= 0 {
				stats.ResolutionTrend = "up " + itoa(pct) + "%"
				stats.SparklineTrend = "+" + itoa(pct) + "%"
			} else {
				stats.ResolutionTrend = "down " + itoa(-pct) + "%"
				stats.SparklineTrend = itoa(pct) + "%"
			}
		} else if yourResolved > 0 {
			stats.ResolutionTrend = "up 100%"
			stats.SparklineTrend = "+100%"
		} else {
			stats.ResolutionTrend = "stable"
			stats.SparklineTrend = "0%"
		}

		// 7-day sparkline
		stats.SparklineData = make([]int, 7)
		sparkRows, err := r.pool.Query(ctx, `
			SELECT (NOW()::date - updated_at::date) as days_ago, COUNT(*)
			FROM issues
			WHERE boundary_id = $1::uuid AND status = 'resolved' AND updated_at > NOW() - INTERVAL '7 days'
			GROUP BY days_ago ORDER BY days_ago
		`, wardID)
		if err == nil {
			defer sparkRows.Close()
			for sparkRows.Next() {
				var daysAgo, count int
				if err := sparkRows.Scan(&daysAgo, &count); err == nil && daysAgo >= 0 && daysAgo < 7 {
					stats.SparklineData[6-daysAgo] = count
				}
			}
		}
	}

	// 19. Ward comparison (find a neighbor ward with more resolved issues)
	if wardID != "" {
		err = r.pool.QueryRow(ctx, `
			SELECT b.name, COUNT(*) as resolved
			FROM issues i JOIN boundaries b ON b.id = i.boundary_id
			WHERE i.status = 'resolved' AND i.boundary_id != $1::uuid
			  AND i.updated_at > NOW() - INTERVAL '7 days'
			GROUP BY b.name
			ORDER BY resolved DESC LIMIT 1
		`, wardID).Scan(&stats.ComparisonWard, &stats.ComparisonCount)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	}

	// 20. Citizen initials (top 5 recently active citizens in ward)
	stats.CitizenInitials = []string{}
	if wardID != "" {
		initRows, err := r.pool.Query(ctx, `
			SELECT COALESCE(UPPER(LEFT(name, 1)), '?') FROM users
			WHERE primary_boundary_id = $1::uuid AND name IS NOT NULL AND name != ''
			ORDER BY updated_at DESC LIMIT 5
		`, wardID)
		if err == nil {
			defer initRows.Close()
			for initRows.Next() {
				var initial string
				if err := initRows.Scan(&initial); err == nil {
					stats.CitizenInitials = append(stats.CitizenInitials, initial)
				}
			}
		}
		if len(stats.CitizenInitials) < 5 {
			stats.CitizenInitials = append(stats.CitizenInitials, "+")
		}
	}

	return stats, nil
}
