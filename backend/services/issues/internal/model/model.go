package model

import "time"

// IssueStatus represents the lifecycle status of an issue.
type IssueStatus string

const (
	StatusReported        IssueStatus = "reported"
	StatusAcknowledged    IssueStatus = "acknowledged"
	StatusAssigned        IssueStatus = "assigned"
	StatusWorkStarted     IssueStatus = "work_started"
	StatusCompleted       IssueStatus = "completed"
	StatusCitizenVerified IssueStatus = "citizen_verified"
	StatusResolved        IssueStatus = "resolved"
)

// IssueCategory represents the category of an issue.
type IssueCategory string

const (
	CategoryRoads         IssueCategory = "roads"
	CategoryWater         IssueCategory = "water"
	CategorySanitation    IssueCategory = "sanitation"
	CategoryElectricity   IssueCategory = "electricity"
	CategoryStreetLights  IssueCategory = "street_lights"
	CategoryGarbage       IssueCategory = "garbage"
	CategoryDrainage      IssueCategory = "drainage"
	CategoryPublicSafety  IssueCategory = "public_safety"
	CategoryParks         IssueCategory = "parks"
	CategoryTransport     IssueCategory = "transport"
	CategoryHealthcare    IssueCategory = "healthcare"
	CategoryOther         IssueCategory = "other"
)

// IssueSeverity represents the severity of an issue.
type IssueSeverity string

const (
	SeverityLow      IssueSeverity = "low"
	SeverityMedium   IssueSeverity = "medium"
	SeverityHigh     IssueSeverity = "high"
	SeverityCritical IssueSeverity = "critical"
)

// Issue represents a civic issue reported by a citizen.
type Issue struct {
	ID           string        `json:"id"` // CIV-2026-XXXXX format
	UserID       string        `json:"user_id"`
	Text         string        `json:"text"`
	PhotoURLs    []string      `json:"photo_urls,omitempty"`
	GPSLat       float64       `json:"gps_lat"`
	GPSLng       float64       `json:"gps_lng"`
	Category     IssueCategory `json:"category"`
	Severity     IssueSeverity `json:"severity"`
	Status       IssueStatus   `json:"status"`
	AssignedTo   string        `json:"assigned_to,omitempty"`
	BoundaryID   string        `json:"boundary_id,omitempty"`
	UpvotesCount int64         `json:"upvotes_count"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
}

// IssueConfirmation represents a citizen's confirmation of issue resolution.
type IssueConfirmation struct {
	IssueID   string `json:"issue_id"`
	UserID    string `json:"user_id"`
	Confirmed bool   `json:"confirmed"`
}

// CreateIssueRequest is the payload for reporting a new issue.
type CreateIssueRequest struct {
	Text      string        `json:"text" binding:"required"`
	PhotoURLs []string      `json:"photo_urls,omitempty"`
	GPSLat    float64       `json:"gps_lat" binding:"required"`
	GPSLng    float64       `json:"gps_lng" binding:"required"`
	Category  IssueCategory `json:"category" binding:"required"`
	Severity  IssueSeverity `json:"severity"`
}

// IssueResponse is the response for a single issue.
type IssueResponse struct {
	Issue Issue `json:"issue"`
}

// IssueListResponse is the response for a list of issues.
type IssueListResponse struct {
	Issues []Issue `json:"issues"`
	Count  int     `json:"count"`
}

// UpdateStatusRequest is the payload for updating an issue's status.
type UpdateStatusRequest struct {
	Status     IssueStatus `json:"status" binding:"required"`
	AssignedTo string      `json:"assigned_to,omitempty"`
}

// ConfirmIssueRequest is the payload for confirming issue resolution.
type ConfirmIssueRequest struct {
	Confirmed bool `json:"confirmed"`
}

// NearbyQuery holds parameters for nearby issue search.
type NearbyQuery struct {
	Lat    float64
	Lng    float64
	Radius float64 // in kilometers
}
