package repository

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/civitro/services/issues/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository defines the data access interface for the issues service.
type Repository interface {
	Create(ctx context.Context, issue *model.Issue) error
	GetByID(ctx context.Context, id string) (*model.Issue, error)
	UpdateStatus(ctx context.Context, id string, status model.IssueStatus, assignedTo string) error
	GetByBoundaryID(ctx context.Context, boundaryID string, limit int) ([]model.Issue, error)
	IncrementUpvotes(ctx context.Context, issueID string) error
	CreateConfirmation(ctx context.Context, confirmation *model.IssueConfirmation) error
	GetNearby(ctx context.Context, lat, lng, radiusKm float64, limit int) ([]model.Issue, error)
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

// Create inserts a new issue into the database.
func (r *PostgresRepository) Create(ctx context.Context, issue *model.Issue) error {
	query := `
		INSERT INTO issues (id, user_id, text, photo_urls, gps_lat, gps_lng,
		                     category, severity, status, assigned_to, boundary_id,
		                     upvotes_count, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`

	_, err := r.pool.Exec(ctx, query,
		issue.ID, issue.UserID, issue.Text, issue.PhotoURLs,
		issue.GPSLat, issue.GPSLng, issue.Category, issue.Severity,
		issue.Status, issue.AssignedTo, issue.BoundaryID,
		issue.UpvotesCount, issue.CreatedAt, issue.UpdatedAt,
	)
	return err
}

// GetByID retrieves an issue by its ID.
func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*model.Issue, error) {
	query := `
		SELECT id, user_id, text, photo_urls, gps_lat, gps_lng,
		       category, severity, status, COALESCE(assigned_to, ''), COALESCE(boundary_id, ''),
		       upvotes_count, created_at, updated_at
		FROM issues WHERE id = $1
	`

	issue := &model.Issue{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&issue.ID, &issue.UserID, &issue.Text, &issue.PhotoURLs,
		&issue.GPSLat, &issue.GPSLng, &issue.Category, &issue.Severity,
		&issue.Status, &issue.AssignedTo, &issue.BoundaryID,
		&issue.UpvotesCount, &issue.CreatedAt, &issue.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return issue, nil
}

// UpdateStatus updates the status and optionally the assignee of an issue.
func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, status model.IssueStatus, assignedTo string) error {
	query := `
		UPDATE issues SET status = $1, assigned_to = $2, updated_at = NOW()
		WHERE id = $3
	`

	tag, err := r.pool.Exec(ctx, query, status, assignedTo, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetByBoundaryID retrieves issues for a specific boundary.
func (r *PostgresRepository) GetByBoundaryID(ctx context.Context, boundaryID string, limit int) ([]model.Issue, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, user_id, text, photo_urls, gps_lat, gps_lng,
		       category, severity, status, COALESCE(assigned_to, ''), COALESCE(boundary_id, ''),
		       upvotes_count, created_at, updated_at
		FROM issues WHERE boundary_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, boundaryID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var issues []model.Issue
	for rows.Next() {
		var issue model.Issue
		if err := rows.Scan(
			&issue.ID, &issue.UserID, &issue.Text, &issue.PhotoURLs,
			&issue.GPSLat, &issue.GPSLng, &issue.Category, &issue.Severity,
			&issue.Status, &issue.AssignedTo, &issue.BoundaryID,
			&issue.UpvotesCount, &issue.CreatedAt, &issue.UpdatedAt,
		); err != nil {
			return nil, err
		}
		issues = append(issues, issue)
	}

	return issues, rows.Err()
}

// IncrementUpvotes atomically increments the upvote count for an issue.
func (r *PostgresRepository) IncrementUpvotes(ctx context.Context, issueID string) error {
	query := `UPDATE issues SET upvotes_count = upvotes_count + 1, updated_at = NOW() WHERE id = $1`

	tag, err := r.pool.Exec(ctx, query, issueID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// CreateConfirmation records a citizen confirmation of issue resolution.
func (r *PostgresRepository) CreateConfirmation(ctx context.Context, confirmation *model.IssueConfirmation) error {
	query := `
		INSERT INTO issue_confirmations (issue_id, user_id, confirmed)
		VALUES ($1, $2, $3)
		ON CONFLICT (issue_id, user_id) DO UPDATE SET confirmed = $3
	`

	_, err := r.pool.Exec(ctx, query, confirmation.IssueID, confirmation.UserID, confirmation.Confirmed)
	return err
}

// GetNearby retrieves issues within a radius of a given point.
// Uses the Haversine formula for distance calculation.
func (r *PostgresRepository) GetNearby(ctx context.Context, lat, lng, radiusKm float64, limit int) ([]model.Issue, error) {
	if limit <= 0 {
		limit = 50
	}

	// Haversine distance calculation in SQL
	query := `
		SELECT id, user_id, text, photo_urls, gps_lat, gps_lng,
		       category, severity, status, COALESCE(assigned_to, ''), COALESCE(boundary_id, ''),
		       upvotes_count, created_at, updated_at,
		       (6371 * acos(
		           cos(radians($1)) * cos(radians(gps_lat)) *
		           cos(radians(gps_lng) - radians($2)) +
		           sin(radians($1)) * sin(radians(gps_lat))
		       )) AS distance_km
		FROM issues
		WHERE (6371 * acos(
		           cos(radians($1)) * cos(radians(gps_lat)) *
		           cos(radians(gps_lng) - radians($2)) +
		           sin(radians($1)) * sin(radians(gps_lat))
		       )) <= $3
		ORDER BY distance_km
		LIMIT $4
	`

	rows, err := r.pool.Query(ctx, query, lat, lng, radiusKm, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var issues []model.Issue
	for rows.Next() {
		var issue model.Issue
		var distanceKm float64
		if err := rows.Scan(
			&issue.ID, &issue.UserID, &issue.Text, &issue.PhotoURLs,
			&issue.GPSLat, &issue.GPSLng, &issue.Category, &issue.Severity,
			&issue.Status, &issue.AssignedTo, &issue.BoundaryID,
			&issue.UpvotesCount, &issue.CreatedAt, &issue.UpdatedAt,
			&distanceKm,
		); err != nil {
			return nil, err
		}
		issues = append(issues, issue)
	}

	return issues, rows.Err()
}

// GenerateIssueID creates a CIV-YYYY-XXXXX format ID.
func GenerateIssueID() string {
	year := time.Now().Year()
	seq := rand.Intn(99999) + 1
	return fmt.Sprintf("CIV-%d-%05d", year, seq)
}
