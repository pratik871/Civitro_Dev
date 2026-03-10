package repository

import (
	"context"
	"errors"

	"github.com/civitro/services/geospatial/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository defines the data access interface for the geospatial service.
type Repository interface {
	FindBoundariesContaining(ctx context.Context, lat, lng float64) ([]model.Boundary, error)
	GetBoundaryByID(ctx context.Context, id string) (*model.Boundary, error)
	GetChildBoundaries(ctx context.Context, parentID string) ([]model.Boundary, error)
	CreateAssignment(ctx context.Context, assignment *model.RepAssignment) error
	GetAssignmentsByUserID(ctx context.Context, userID string) ([]model.RepresentativeAssignment, error)
}

// ErrNotFound is returned when a record is not found.
var ErrNotFound = errors.New("record not found")

// PostgresRepository implements Repository using PostgreSQL with PostGIS.
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository creates a new PostgresRepository.
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// FindBoundariesContaining returns all boundaries containing the given lat/lng point.
// Uses PostGIS ST_Contains for spatial queries.
func (r *PostgresRepository) FindBoundariesContaining(ctx context.Context, lat, lng float64) ([]model.Boundary, error) {
	query := `
		SELECT id, name, level, COALESCE(parent_id, ''), population, area_sqkm
		FROM boundaries
		WHERE ST_Contains(polygon, ST_SetSRID(ST_MakePoint($1, $2), 4326))
		ORDER BY CASE level
			WHEN 'nation' THEN 1
			WHEN 'state' THEN 2
			WHEN 'parliamentary' THEN 3
			WHEN 'assembly' THEN 4
			WHEN 'municipal' THEN 5
			WHEN 'ward' THEN 6
		END
	`

	rows, err := r.pool.Query(ctx, query, lng, lat)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var boundaries []model.Boundary
	for rows.Next() {
		var b model.Boundary
		if err := rows.Scan(&b.ID, &b.Name, &b.Level, &b.ParentID, &b.Population, &b.AreaSqKm); err != nil {
			return nil, err
		}
		boundaries = append(boundaries, b)
	}

	return boundaries, rows.Err()
}

// GetBoundaryByID retrieves a single boundary by ID.
func (r *PostgresRepository) GetBoundaryByID(ctx context.Context, id string) (*model.Boundary, error) {
	query := `
		SELECT id, name, level, COALESCE(parent_id, ''), ST_AsGeoJSON(polygon), population, area_sqkm
		FROM boundaries WHERE id = $1
	`

	b := &model.Boundary{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&b.ID, &b.Name, &b.Level, &b.ParentID, &b.Polygon, &b.Population, &b.AreaSqKm,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return b, nil
}

// GetChildBoundaries retrieves all direct children of a boundary.
func (r *PostgresRepository) GetChildBoundaries(ctx context.Context, parentID string) ([]model.Boundary, error) {
	query := `
		SELECT id, name, level, COALESCE(parent_id, ''), population, area_sqkm
		FROM boundaries WHERE parent_id = $1
		ORDER BY name
	`

	rows, err := r.pool.Query(ctx, query, parentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var boundaries []model.Boundary
	for rows.Next() {
		var b model.Boundary
		if err := rows.Scan(&b.ID, &b.Name, &b.Level, &b.ParentID, &b.Population, &b.AreaSqKm); err != nil {
			return nil, err
		}
		boundaries = append(boundaries, b)
	}

	return boundaries, rows.Err()
}

// CreateAssignment creates a user-boundary-representative assignment.
func (r *PostgresRepository) CreateAssignment(ctx context.Context, assignment *model.RepAssignment) error {
	query := `
		INSERT INTO rep_assignments (user_id, boundary_id, representative_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, boundary_id) DO UPDATE SET representative_id = $3
	`
	_, err := r.pool.Exec(ctx, query, assignment.UserID, assignment.BoundaryID, assignment.RepresentativeID)
	return err
}

// GetAssignmentsByUserID returns all representative assignments for a user.
func (r *PostgresRepository) GetAssignmentsByUserID(ctx context.Context, userID string) ([]model.RepresentativeAssignment, error) {
	query := `
		SELECT ra.boundary_id, b.name, b.level, ra.representative_id
		FROM rep_assignments ra
		JOIN boundaries b ON b.id = ra.boundary_id
		WHERE ra.user_id = $1
		ORDER BY CASE b.level
			WHEN 'nation' THEN 1
			WHEN 'state' THEN 2
			WHEN 'parliamentary' THEN 3
			WHEN 'assembly' THEN 4
			WHEN 'municipal' THEN 5
			WHEN 'ward' THEN 6
		END
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []model.RepresentativeAssignment
	for rows.Next() {
		var a model.RepresentativeAssignment
		if err := rows.Scan(&a.BoundaryID, &a.BoundaryName, &a.BoundaryLevel, &a.RepresentativeID); err != nil {
			return nil, err
		}
		assignments = append(assignments, a)
	}

	return assignments, rows.Err()
}
