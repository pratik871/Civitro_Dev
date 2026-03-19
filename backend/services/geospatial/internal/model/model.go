package model

// BoundaryLevel represents the administrative level of a boundary.
type BoundaryLevel string

const (
	// Administrative track (shared by both rural and urban)
	LevelNation   BoundaryLevel = "nation"
	LevelState    BoundaryLevel = "state"
	LevelDivision BoundaryLevel = "division"
	LevelDistrict BoundaryLevel = "district"

	// Electoral track (overlays geography)
	LevelParliamentary BoundaryLevel = "parliamentary"
	LevelAssembly      BoundaryLevel = "assembly"

	// Urban track (74th Amendment)
	LevelMunicipalCorporation BoundaryLevel = "municipal_corporation"
	LevelMunicipalCouncil     BoundaryLevel = "municipal_council"
	LevelNagarPanchayat       BoundaryLevel = "nagar_panchayat"
	LevelUrbanWard            BoundaryLevel = "urban_ward"

	// Rural track (73rd Amendment — Panchayati Raj)
	LevelZillaParishad  BoundaryLevel = "zilla_parishad"
	LevelBlockPanchayat BoundaryLevel = "block_panchayat"
	LevelGramPanchayat  BoundaryLevel = "gram_panchayat"
	LevelRuralWard      BoundaryLevel = "rural_ward"
)

// BoundaryTrack represents which governance track a boundary belongs to.
type BoundaryTrack string

const (
	TrackAdministrative BoundaryTrack = "administrative"
	TrackElectoral      BoundaryTrack = "electoral"
	TrackUrban          BoundaryTrack = "urban"
	TrackRural          BoundaryTrack = "rural"
)

// Boundary represents an administrative geographic boundary.
type Boundary struct {
	ID             string        `json:"id"`
	Name           string        `json:"name"`
	Level          BoundaryLevel `json:"level"`
	Track          BoundaryTrack `json:"track,omitempty"`
	UrbanRural     string        `json:"urban_rural,omitempty"`
	ParentID       string        `json:"parent_id,omitempty"`
	Polygon        string        `json:"polygon,omitempty"`
	Population     int64         `json:"population,omitempty"`
	AreaSqKm       float64       `json:"area_sqkm,omitempty"`
	Code           string        `json:"code,omitempty"`
	StateLocalName string        `json:"state_local_name,omitempty"`
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

// ResolveResponse returns the boundaries containing a location, grouped by governance track.
type ResolveResponse struct {
	Boundaries     []Boundary            `json:"boundaries"`
	GovernanceChain *GovernanceChain      `json:"governance_chain,omitempty"`
}

// GovernanceChain groups boundaries by track for the "who governs me" view.
type GovernanceChain struct {
	Administrative []Boundary `json:"administrative"`
	Electoral      []Boundary `json:"electoral"`
	LocalBody      []Boundary `json:"local_body"`
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
	BoundaryTrack    BoundaryTrack `json:"boundary_track"`
	RepresentativeID string        `json:"representative_id"`
}

// UserRepresentativesResponse returns all representatives for a user.
type UserRepresentativesResponse struct {
	UserID          string                     `json:"user_id"`
	Representatives []RepresentativeAssignment `json:"representatives"`
}

// NomenclatureEntry is a state-specific name for a governance tier.
type NomenclatureEntry struct {
	StateCode      string `json:"state_code"`
	StateName      string `json:"state_name"`
	CanonicalLevel string `json:"canonical_level"`
	LocalName      string `json:"local_name"`
	HeadTitle      string `json:"head_title,omitempty"`
}

// NomenclatureResponse returns naming info for a state.
type NomenclatureResponse struct {
	Entries []NomenclatureEntry `json:"entries"`
}
