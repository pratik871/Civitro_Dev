package model

import "time"

// ActionStatus represents the lifecycle status of a community action.
type ActionStatus string

const (
	StatusDraft        ActionStatus = "draft"
	StatusOpen         ActionStatus = "open"
	StatusAcknowledged ActionStatus = "acknowledged"
	StatusCommitted    ActionStatus = "committed"
	StatusInProgress   ActionStatus = "in_progress"
	StatusResolved     ActionStatus = "resolved"
	StatusVerified     ActionStatus = "verified"
	StatusArchived     ActionStatus = "archived"
)

// EscalationLevel represents the target authority level for escalation.
type EscalationLevel string

const (
	EscalationWard   EscalationLevel = "ward"
	EscalationMLA    EscalationLevel = "mla"
	EscalationMP     EscalationLevel = "mp"
	EscalationCity   EscalationLevel = "city"
	EscalationState  EscalationLevel = "state"
	EscalationPublic EscalationLevel = "public"
)

// ResponseType represents the type of stakeholder response.
type ResponseType string

const (
	ResponseAcknowledge ResponseType = "acknowledge"
	ResponseRespond     ResponseType = "respond"
	ResponseCommit      ResponseType = "commit"
	ResponseReject      ResponseType = "reject"
	ResponseUpdate      ResponseType = "update"
	ResponseResolve     ResponseType = "resolve"
)

// EscalationReason represents why an action was escalated.
type EscalationReason string

const (
	ReasonNoResponse7D     EscalationReason = "no_response_7d"
	ReasonNoResponse14D    EscalationReason = "no_response_14d"
	ReasonRejectionAppealed EscalationReason = "rejection_appealed"
	ReasonManual           EscalationReason = "manual"
)

// CommunityAction represents a community action created by citizens.
type CommunityAction struct {
	ID                      string          `json:"id"`
	CreatorID               string          `json:"creator_id"`
	CreatorName             string          `json:"creator_name"`
	WardID                  string          `json:"ward_id"`
	WardName                string          `json:"ward_name"`
	Title                   string          `json:"title"`
	Description             string          `json:"description"`
	DesiredOutcome          string          `json:"desired_outcome"`
	TargetAuthorityID       string          `json:"target_authority_id,omitempty"`
	TargetAuthorityName     string          `json:"target_authority_name,omitempty"`
	EscalationLevel         EscalationLevel `json:"escalation_level"`
	Status                  ActionStatus    `json:"status"`
	SupportCount            int             `json:"support_count"`
	SupportGoal             int             `json:"support_goal"`
	EvidencePackageJSON     interface{}     `json:"evidence_package_json,omitempty"`
	EconomicImpactEstimate  float64         `json:"economic_impact_estimate,omitempty"`
	Category                string          `json:"category,omitempty"`
	PatternID               string          `json:"pattern_id,omitempty"`
	CreatedAt               time.Time       `json:"created_at"`
	AcknowledgedAt          *time.Time      `json:"acknowledged_at,omitempty"`
	ResolvedAt              *time.Time      `json:"resolved_at,omitempty"`
	VerifiedAt              *time.Time      `json:"verified_at,omitempty"`
	EvidenceCount           int                `json:"evidence_count"`
	Evidence                []ActionEvidence   `json:"evidence,omitempty"`
	RecentResponses         []ActionResponse   `json:"recent_responses,omitempty"`
	HasSupported            bool               `json:"has_supported"`
}

// ActionSupporter represents a user who endorsed a community action.
type ActionSupporter struct {
	ID              string    `json:"id"`
	ActionID        string    `json:"action_id"`
	UserID          string    `json:"user_id"`
	CivicScoreAtTime int     `json:"civic_score_at_time"`
	WardVerified    bool      `json:"ward_verified"`
	CreatedAt       time.Time `json:"created_at"`
}

// ActionEvidence represents a linked issue as evidence for a community action.
type ActionEvidence struct {
	ID            string    `json:"id"`
	ActionID      string    `json:"action_id"`
	IssueID       string    `json:"issue_id"`
	IssueTitle    string    `json:"issue_title"`
	IssueCategory string    `json:"issue_category"`
	IssuePhotoUrl *string   `json:"issue_photo_url"`
	IssueStatus   string    `json:"issue_status"`
	LinkedBy      string    `json:"linked_by"`
	LinkedByName  string    `json:"linked_by_name"`
	AutoLinked    bool      `json:"auto_linked"`
	CreatedAt     time.Time `json:"created_at"`
}

// ActionResponse represents a stakeholder response to a community action.
type ActionResponse struct {
	ID            string       `json:"id"`
	ActionID      string       `json:"action_id"`
	ResponderID   string       `json:"responder_id"`
	ResponderName string       `json:"responder_name"`
	ResponderRole string       `json:"responder_role"`
	ResponseType  ResponseType `json:"response_type"`
	Content       string       `json:"content"`
	TimelineDate  string       `json:"timeline_date,omitempty"`
	CreatedAt     time.Time    `json:"created_at"`
}

// ActionEscalation represents an escalation event for a community action.
type ActionEscalation struct {
	ID                  string           `json:"id"`
	ActionID            string           `json:"action_id"`
	FromLevel           EscalationLevel  `json:"from_level"`
	ToLevel             EscalationLevel  `json:"to_level"`
	Reason              EscalationReason `json:"reason"`
	NotifiedAuthorityID string           `json:"notified_authority_id"`
	CreatedAt           time.Time        `json:"created_at"`
}

// ActionVerification represents a community member's verification of action resolution.
type ActionVerification struct {
	ID                string    `json:"id"`
	ActionID          string    `json:"action_id"`
	VerifierID        string    `json:"verifier_id"`
	CivicScoreAtTime  int       `json:"civic_score_at_time"`
	PhotoEvidenceURLs []string  `json:"photo_evidence_urls,omitempty"`
	Verified          bool      `json:"verified"`
	CreatedAt         time.Time `json:"created_at"`
}

// TimelineEntry represents a single entry in the action timeline.
type TimelineEntry struct {
	ID        string      `json:"id"`
	Type      string      `json:"type"` // "created", "supported", "evidence", "response", "escalation", "verification"
	ActorID   string      `json:"actor_id"`
	Content   string      `json:"content"`
	Data      interface{} `json:"data,omitempty"`
	CreatedAt time.Time   `json:"created_at"`
}

// --- Request types ---

// CreateActionRequest is the payload for creating a new community action.
type CreateActionRequest struct {
	WardID            string          `json:"ward_id"`
	Title             string          `json:"title" binding:"required"`
	Description       string          `json:"description" binding:"required"`
	DesiredOutcome    string          `json:"desired_outcome" binding:"required"`
	TargetAuthorityID string          `json:"target_authority_id,omitempty"`
	EscalationLevel   EscalationLevel `json:"escalation_level"`
	Category          string          `json:"category,omitempty"`
	PatternID         string          `json:"pattern_id,omitempty"`
	LinkedIssueIDs    []string        `json:"linked_issue_ids"`
}

// AddEvidenceRequest is the payload for linking an issue to an action.
type AddEvidenceRequest struct {
	IssueID    string `json:"issue_id" binding:"required"`
	AutoLinked bool   `json:"auto_linked"`
}

// AddResponseRequest is the payload for a stakeholder response.
type AddResponseRequest struct {
	ResponseType ResponseType `json:"response_type" binding:"required"`
	Content      string       `json:"content" binding:"required"`
	TimelineDate string       `json:"timeline_date,omitempty"`
}

// AddVerificationRequest is the payload for community verification.
type AddVerificationRequest struct {
	PhotoEvidenceURLs []string `json:"photo_evidence_urls,omitempty"`
	Verified          bool     `json:"verified"`
}

// UpdateStatusRequest is the payload for updating action status.
type UpdateStatusRequest struct {
	Status ActionStatus `json:"status" binding:"required"`
}

// --- Response types ---

// ActionDetailResponse is the response for a single community action with evidence.
type ActionDetailResponse struct {
	Action CommunityAction `json:"action"`
}

// ActionListResponse is the response for a list of community actions.
type ActionListResponse struct {
	Actions []CommunityAction `json:"actions"`
	Count   int               `json:"count"`
}

// TimelineResponse is the response for the full action timeline.
type TimelineResponse struct {
	Timeline []TimelineEntry `json:"timeline"`
	Count    int             `json:"count"`
}

// TrendingAction represents a trending community action across wards.
type TrendingAction struct {
	ID              string          `json:"id"`
	Title           string          `json:"title"`
	WardID          string          `json:"ward_id"`
	Status          ActionStatus    `json:"status"`
	SupportCount    int             `json:"support_count"`
	SupportGoal     int             `json:"support_goal"`
	EvidenceCount   int             `json:"evidence_count"`
	EscalationLevel EscalationLevel `json:"escalation_level"`
	CreatedAt       time.Time       `json:"created_at"`
	MomentumScore   float64         `json:"momentum_score"`
	HasSupported    bool            `json:"has_supported"`
}

// TrendingListResponse is the response for trending actions.
type TrendingListResponse struct {
	Actions []TrendingAction `json:"actions"`
	Count   int              `json:"count"`
}
