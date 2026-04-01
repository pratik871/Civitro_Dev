package model

import "time"

// VerificationLevel indicates how far a user has been verified.
type VerificationLevel string

const (
	VerificationPhone   VerificationLevel = "phone"
	VerificationAadhaar VerificationLevel = "aadhaar"
	VerificationFull    VerificationLevel = "full"
)

// User represents a registered platform user.
type User struct {
	ID                string            `json:"id"`
	Phone             string            `json:"phone"`
	Name              string            `json:"name"`
	Email             string            `json:"email,omitempty"`
	AvatarURL         string            `json:"avatar_url,omitempty"`
	Role              string            `json:"role"`
	VerificationLevel VerificationLevel `json:"verification_level"`
	AadhaarHash       string            `json:"-"`
	DeviceFingerprint string            `json:"device_fingerprint,omitempty"`
	PreferredLanguage string            `json:"preferred_language"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
}

// RefreshToken represents a stored refresh token.
type RefreshToken struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	TokenHash  string    `json:"-"`
	DeviceInfo string    `json:"device_info,omitempty"`
	ExpiresAt  time.Time `json:"expires_at"`
	CreatedAt  time.Time `json:"created_at"`
}

// AadhaarVerification stores a completed Aadhaar verification record.
type AadhaarVerification struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	ReferenceID    string    `json:"reference_id"`
	UIDHash        string    `json:"-"`
	Name           string    `json:"name"`
	DOB            string    `json:"dob"`
	Gender         string    `json:"gender"`
	Address        string    `json:"address,omitempty"`
	PhotoKey       string    `json:"photo_key,omitempty"`
	SignatureValid bool      `json:"signature_valid"`
	XMLTimestamp   time.Time `json:"xml_timestamp"`
	VerifiedAt     time.Time `json:"verified_at"`
}

// RegisterRequest is the payload for user registration.
type RegisterRequest struct {
	Phone             string `json:"phone" binding:"required"`
	Name              string `json:"name" binding:"required"`
	DeviceFingerprint string `json:"device_fingerprint"`
}

// RegisterResponse is returned after successful registration.
type RegisterResponse struct {
	UserID  string `json:"user_id"`
	Message string `json:"message"`
}

// VerifyOTPRequest is the payload for OTP verification.
type VerifyOTPRequest struct {
	Phone string `json:"phone" binding:"required"`
	OTP   string `json:"otp" binding:"required"`
}

// AuthTokenResponse is returned after successful authentication.
type AuthTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

// RefreshRequest is the payload for token refresh.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// VerifyAadhaarResponse is returned after successful Aadhaar verification.
type VerifyAadhaarResponse struct {
	Message           string            `json:"message"`
	Name              string            `json:"name"`
	VerificationLevel VerificationLevel `json:"verification_level"`
}

// UpdateLocationRequest is the payload for updating user location.
type UpdateLocationRequest struct {
	Lat float64 `json:"lat" binding:"required"`
	Lng float64 `json:"lng" binding:"required"`
}

// UpdateLocationResponse is returned after location update.
type UpdateLocationResponse struct {
	Message        string     `json:"message"`
	BoundaryID     string     `json:"boundary_id,omitempty"`
	BoundaryName   string     `json:"boundary_name,omitempty"`
	BoundaryLevel  string     `json:"boundary_level,omitempty"`
	Boundaries     []Boundary `json:"boundaries,omitempty"`
}

// Boundary is a simplified boundary for location response.
type Boundary struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Level string `json:"level"`
	Track string `json:"track,omitempty"`
}

// RecentlyResolved represents an issue recently resolved in the user's ward.
type RecentlyResolved struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	ResolvedAt     string `json:"resolved_at"`
	CitizenReports int    `json:"citizen_reports"`
}

// DashboardStats holds aggregated stats for the authenticated user's dashboard.
type DashboardStats struct {
	CivicScore          int                `json:"civic_score"`
	CivicLevel          string             `json:"civic_level"`
	IssuesReported      int                `json:"issues_reported"`
	PollsVoted          int                `json:"polls_voted"`
	Validations         int                `json:"validations"`
	ActionsSupported    int                `json:"actions_supported"`
	ActionsStarted      int                `json:"actions_started"`
	StreakDays          int                `json:"streak_days"`
	WardID              string             `json:"ward_id"`
	WardName            string             `json:"ward_name"`
	WardArea            string             `json:"ward_area"`
	ActiveCitizensInWard int               `json:"active_citizens_in_ward"`
	ActiveCitizensTrend  int               `json:"active_citizens_trend"`
	ActivePollsCount    int                `json:"active_polls_count"`
	ActiveActionsCount  int                `json:"active_actions_count"`
	PromisesTracked     int                `json:"promises_tracked"`
	ChiScore            int                `json:"chi_score"`
	UnreadMessages      int                `json:"unread_messages"`
	WardRank            int                `json:"ward_rank"`
	TotalWards          int                `json:"total_wards"`
	ResolutionTrend     string             `json:"resolution_trend"`
	SparklineData       []int              `json:"sparkline_data"`
	SparklineTrend      string             `json:"sparkline_trend"`
	ComparisonWard      string             `json:"comparison_ward"`
	ComparisonCount     int                `json:"comparison_count"`
	YourResolvedCount   int                `json:"your_resolved_count"`
	CitizenInitials     []string           `json:"citizen_initials"`
	RecentlyResolved    []RecentlyResolved `json:"recently_resolved"`
}

// GovernanceChainEntry represents a single tier in the governance escalation chain.
type GovernanceChainEntry struct {
	ID                 string   `json:"id"`
	WardID             string   `json:"ward_id"`
	Tier               int      `json:"tier"`
	Level              string   `json:"level"`
	IsDepartmentRouted bool     `json:"is_department_routed"`
	DepartmentCategory string   `json:"department_category,omitempty"`
	Name               string   `json:"name"`
	Title              string   `json:"title"`
	Initials           string   `json:"initials"`
	Party              string   `json:"party,omitempty"`
	IsElected          bool     `json:"is_elected"`
	ResponseTimeDays   *float64 `json:"response_time_days"`
	Rating             *float64 `json:"rating"`
	IssuesLabel        string   `json:"issues_label,omitempty"`
	UserID             string   `json:"user_id,omitempty"`
}

// WardMoodTopic represents a single topic within a ward's mood breakdown.
type WardMoodTopic struct {
	Name       string  `json:"name"`
	Sentiment  float64 `json:"sentiment"`
	Percentage int     `json:"percentage"`
}

// WardMood represents precomputed sentiment data for a ward.
type WardMood struct {
	WardID             string          `json:"ward_id"`
	Mood               string          `json:"mood"`
	Score              float64         `json:"score"`
	Topics             []WardMoodTopic `json:"topics"`
	TrendDirection     string          `json:"trend_direction"`
	TrendChangePercent int             `json:"trend_change_percent"`
	TrendSparkline     []float64       `json:"trend_sparkline"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

// UpdateProfileRequest is the request body for updating user profile.
type UpdateProfileRequest struct {
	Name  *string `json:"name,omitempty"`
	Email *string `json:"email,omitempty"`
}

// ProfileResponse is the response for user profile retrieval.
type ProfileResponse struct {
	ID                string            `json:"id"`
	Phone             string            `json:"phone"`
	Name              string            `json:"name"`
	Email             string            `json:"email,omitempty"`
	AvatarURL         string            `json:"avatar_url,omitempty"`
	Role              string            `json:"role"`
	VerificationLevel VerificationLevel `json:"verification_level"`
	PreferredLanguage string            `json:"preferred_language"`
	CivicScore        int               `json:"civic_score"`
	ReputationTier    string            `json:"reputation_tier"`
	BoundaryID        string            `json:"boundary_id,omitempty"`
	BoundaryName      string            `json:"boundary_name,omitempty"`
	Lat               *float64          `json:"lat,omitempty"`
	Lng               *float64          `json:"lng,omitempty"`
	CreatedAt         time.Time         `json:"created_at"`
}
