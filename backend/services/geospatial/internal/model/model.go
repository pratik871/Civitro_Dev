package model

// BoundaryLevel represents the administrative level of a boundary.
type BoundaryLevel string

const (
	LevelNation        BoundaryLevel = "nation"
	LevelState         BoundaryLevel = "state"
	LevelParliamentary BoundaryLevel = "parliamentary"
	LevelAssembly      BoundaryLevel = "assembly"
	LevelMunicipal     BoundaryLevel = "municipal"
	LevelWard          BoundaryLevel = "ward"
)

// Boundary represents an administrative geographic boundary.
type Boundary struct {
	ID         string        `json:"id"`
	Name       string        `json:"name"`
	Level      BoundaryLevel `json:"level"`
	ParentID   string        `json:"parent_id,omitempty"`
	Polygon    string        `json:"polygon,omitempty"` // GeoJSON geometry stored as text
	Population int64         `json:"population,omitempty"`
	AreaSqKm   float64       `json:"area_sqkm,omitempty"`
}

// RepAssignment links a user to their representatives via boundaries.
type RepAssignment struct {
	UserID           string `json:"user_id"`
	BoundaryID       string `json:"boundary_id"`
	RepresentativeID string `json:"representative_id"`
}

// ResolveRequest is the payload for resolving a location to boundaries.
type ResolveRequest struct {
	Lat float64 `json:"lat" binding:"required"`
	Lng float64 `json:"lng" binding:"required"`
}

// ResolveResponse returns the boundaries containing a location.
type ResolveResponse struct {
	Boundaries []Boundary `json:"boundaries"`
}

// BoundaryResponse returns a single boundary with its details.
type BoundaryResponse struct {
	Boundary Boundary `json:"boundary"`
}

// ChildrenResponse returns child boundaries.
type ChildrenResponse struct {
	Children []Boundary `json:"children"`
}

// RepresentativeAssignment is returned for user representative lookups.
type RepresentativeAssignment struct {
	BoundaryID       string        `json:"boundary_id"`
	BoundaryName     string        `json:"boundary_name"`
	BoundaryLevel    BoundaryLevel `json:"boundary_level"`
	RepresentativeID string        `json:"representative_id"`
}

// UserRepresentativesResponse returns all representatives for a user.
type UserRepresentativesResponse struct {
	UserID          string                     `json:"user_id"`
	Representatives []RepresentativeAssignment `json:"representatives"`
}
