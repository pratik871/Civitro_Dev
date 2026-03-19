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
	GetBoundariesByTrack(ctx context.Context, parentID string, track model.BoundaryTrack) ([]model.Boundary, error)
	CreateAssignment(ctx context.Context, assignment *model.RepAssignment) error
	GetAssignmentsByUserID(ctx context.Context, userID string) ([]model.RepresentativeAssignment, error)
	GetNomenclature(ctx context.Context, stateCode string) ([]model.NomenclatureEntry, error)
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

// levelSortOrder returns a SQL CASE expression for ordering boundaries by governance hierarchy.
// Administrative levels first, then electoral, then local governance (urban/rural by depth).
const levelSortSQL = `CASE level
	WHEN 'nation' THEN 1
	WHEN 'state' THEN 2
	WHEN 'division' THEN 3
	WHEN 'district' THEN 4
	WHEN 'parliamentary' THEN 5
	WHEN 'assembly' THEN 6
	WHEN 'zilla_parishad' THEN 7
	WHEN 'municipal_corporation' THEN 7
	WHEN 'block_panchayat' THEN 8
	WHEN 'municipal_council' THEN 8
	WHEN 'nagar_panchayat' THEN 8
	WHEN 'gram_panchayat' THEN 9
	WHEN 'urban_ward' THEN 10
	WHEN 'rural_ward' THEN 10
END`

// FindBoundariesContaining returns all boundaries containing the given lat/lng point.
// Uses PostGIS ST_Contains for spatial queries.
func (r *PostgresRepository) FindBoundariesContaining(ctx context.Context, lat, lng float64) ([]model.Boundary, error) {
	query := `
		SELECT id, name, level, COALESCE(track, ''), COALESCE(urban_rural, ''),
		       COALESCE(parent_id::text, ''), population, area_sqkm,
		       COALESCE(code, ''), COALESCE(state_local_name, '')
		FROM boundaries
		WHERE ST_Contains(polygon, ST_SetSRID(ST_MakePoint($1, $2), 4326))
		ORDER BY ` + levelSortSQL

	rows, err := r.pool.Query(ctx, query, lng, lat)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var boundaries []model.Boundary
	for rows.Next() {
		var b model.Boundary
		if err := rows.Scan(
			&b.ID, &b.Name, &b.Level, &b.Track, &b.UrbanRural,
			&b.ParentID, &b.Population, &b.AreaSqKm,
			&b.Code, &b.StateLocalName,
		); err != nil {
			return nil, err
		}
		boundaries = append(boundaries, b)
	}

	return boundaries, rows.Err()
}

// GetBoundaryByID retrieves a single boundary by ID.
func (r *PostgresRepository) GetBoundaryByID(ctx context.Context, id string) (*model.Boundary, error) {
	query := `
		SELECT id, name, level, COALESCE(track, ''), COALESCE(urban_rural, ''),
		       COALESCE(parent_id::text, ''), ST_AsGeoJSON(polygon), population, area_sqkm,
		       COALESCE(code, ''), COALESCE(state_local_name, '')
		FROM boundaries WHERE id = $1
	`

	b := &model.Boundary{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&b.ID, &b.Name, &b.Level, &b.Track, &b.UrbanRural,
		&b.ParentID, &b.Polygon, &b.Population, &b.AreaSqKm,
		&b.Code, &b.StateLocalName,
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
		SELECT id, name, level, COALESCE(track, ''), COALESCE(urban_rural, ''),
		       COALESCE(parent_id::text, ''), population, area_sqkm,
		       COALESCE(code, ''), COALESCE(state_local_name, '')
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
		if err := rows.Scan(
			&b.ID, &b.Name, &b.Level, &b.Track, &b.UrbanRural,
			&b.ParentID, &b.Population, &b.AreaSqKm,
			&b.Code, &b.StateLocalName,
		); err != nil {
			return nil, err
		}
		boundaries = append(boundaries, b)
	}

	return boundaries, rows.Err()
}

// GetBoundariesByTrack retrieves children of a boundary filtered by governance track.
func (r *PostgresRepository) GetBoundariesByTrack(ctx context.Context, parentID string, track model.BoundaryTrack) ([]model.Boundary, error) {
	query := `
		SELECT id, name, level, COALESCE(track, ''), COALESCE(urban_rural, ''),
		       COALESCE(parent_id::text, ''), population, area_sqkm,
		       COALESCE(code, ''), COALESCE(state_local_name, '')
		FROM boundaries WHERE parent_id = $1 AND track = $2
		ORDER BY ` + levelSortSQL

	rows, err := r.pool.Query(ctx, query, parentID, string(track))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var boundaries []model.Boundary
	for rows.Next() {
		var b model.Boundary
		if err := rows.Scan(
			&b.ID, &b.Name, &b.Level, &b.Track, &b.UrbanRural,
			&b.ParentID, &b.Population, &b.AreaSqKm,
			&b.Code, &b.StateLocalName,
		); err != nil {
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
		SELECT ra.boundary_id, b.name, b.level, COALESCE(b.track, ''), ra.representative_id
		FROM rep_assignments ra
		JOIN boundaries b ON b.id = ra.boundary_id
		WHERE ra.user_id = $1
		ORDER BY ` + levelSortSQL

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []model.RepresentativeAssignment
	for rows.Next() {
		var a model.RepresentativeAssignment
		if err := rows.Scan(&a.BoundaryID, &a.BoundaryName, &a.BoundaryLevel, &a.BoundaryTrack, &a.RepresentativeID); err != nil {
			return nil, err
		}
		assignments = append(assignments, a)
	}

	return assignments, rows.Err()
}

// GetNomenclature retrieves the governance naming for a state.
func (r *PostgresRepository) GetNomenclature(ctx context.Context, stateCode string) ([]model.NomenclatureEntry, error) {
	query := `
		SELECT state_code, state_name, canonical_level, local_name, COALESCE(head_title, '')
		FROM governance_nomenclature
		WHERE state_code = $1
		ORDER BY CASE canonical_level
			WHEN 'zilla_parishad' THEN 1
			WHEN 'block_panchayat' THEN 2
			WHEN 'gram_panchayat' THEN 3
			WHEN 'rural_ward' THEN 4
			WHEN 'municipal_corporation' THEN 5
			WHEN 'municipal_council' THEN 6
			WHEN 'nagar_panchayat' THEN 7
			WHEN 'urban_ward' THEN 8
		END
	`

	rows, err := r.pool.Query(ctx, query, stateCode)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []model.NomenclatureEntry
	for rows.Next() {
		var e model.NomenclatureEntry
		if err := rows.Scan(&e.StateCode, &e.StateName, &e.CanonicalLevel, &e.LocalName, &e.HeadTitle); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}

	return entries, rows.Err()
}
