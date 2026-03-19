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
	CategoryPothole       IssueCategory = "pothole"
	CategoryStreetlight   IssueCategory = "streetlight"
	CategoryWaterSupply   IssueCategory = "water_supply"
	CategoryRoadDamage    IssueCategory = "road_damage"
	CategoryConstruction  IssueCategory = "construction"
	CategoryTraffic       IssueCategory = "traffic"
	CategoryEducation     IssueCategory = "education"
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
	CommentCount int           `json:"comment_count"`
	HasUpvoted   bool          `json:"has_upvoted"`
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

// Comment represents a comment on an issue.
type Comment struct {
	ID         string    `json:"id"`
	IssueID    string    `json:"issue_id"`
	UserID     string    `json:"user_id"`
	UserName   string    `json:"user_name"`
	ParentID   string    `json:"parent_id,omitempty"`
	Content    string    `json:"content"`
	LikesCount int       `json:"likes_count"`
	HasLiked   bool      `json:"has_liked"`
	CreatedAt  time.Time `json:"created_at"`
}

// CreateCommentRequest is the payload for posting a comment.
type CreateCommentRequest struct {
	Content  string `json:"content" binding:"required"`
	ParentID string `json:"parent_id,omitempty"`
}

// CommentListResponse is the response for a list of comments.
type CommentListResponse struct {
	Comments []Comment `json:"comments"`
	Count    int       `json:"count"`
}

// PromiseResponse is the frontend-facing representation of a leader promise.
type PromiseResponse struct {
	ID          string `json:"id"`
	LeaderName  string `json:"leaderName"`
	LeaderRole  string `json:"leaderRole"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Progress    int    `json:"progress"`
	Deadline    string `json:"deadline"`
	Category    string `json:"category"`
}

// CHICategory represents a single category in the Civic Health Index.
type CHICategory struct {
	Name   string `json:"name"`
	Score  int    `json:"score"`
	Icon   string `json:"icon"`
	Trend  string `json:"trend"`
	Change int    `json:"change"`
}

// CHITrend holds the trend information for the overall CHI score.
type CHITrend struct {
	Change int    `json:"change"`
	Period string `json:"period"`
}

// CHIResponse is the response for the Civic Health Index endpoint.
type CHIResponse struct {
	OverallScore int           `json:"overallScore"`
	Constituency string        `json:"constituency"`
	Trend        CHITrend      `json:"trend"`
	Categories   []CHICategory `json:"categories"`
}

// TrendingTopic represents a trending issue category with computed metrics.
type TrendingTopic struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	Mentions       int    `json:"mentions"`
	Sentiment      string `json:"sentiment"`
	SentimentScore int    `json:"sentimentScore"`
	Category       string `json:"category"`
	Change         int    `json:"change"`
	RelatedIssues  int    `json:"relatedIssues"`
}
