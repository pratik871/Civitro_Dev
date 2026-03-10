package model

import "time"

// ContentType enumerates content types subject to moderation.
type ContentType string

const (
	ContentTypeVoice   ContentType = "voice"
	ContentTypeIssue   ContentType = "issue"
	ContentTypeMessage ContentType = "message"
)

// ModerationStatus enumerates moderation item statuses.
type ModerationStatus string

const (
	ModerationStatusPending  ModerationStatus = "pending"
	ModerationStatusApproved ModerationStatus = "approved"
	ModerationStatusRemoved  ModerationStatus = "removed"
	ModerationStatusAppealed ModerationStatus = "appealed"
)

// AppealStatus enumerates appeal statuses.
type AppealStatus string

const (
	AppealStatusPending  AppealStatus = "pending"
	AppealStatusAccepted AppealStatus = "accepted"
	AppealStatusRejected AppealStatus = "rejected"
)

// ModerationItem represents a piece of content flagged for review.
type ModerationItem struct {
	ID          string           `json:"id"`
	ContentType ContentType      `json:"content_type"`
	ContentID   string           `json:"content_id"`
	AIScore     float64          `json:"ai_score"`
	AIReason    string           `json:"ai_reason"`
	Status      ModerationStatus `json:"status"`
	ReviewedBy  string           `json:"reviewed_by,omitempty"`
	ReviewedAt  *time.Time       `json:"reviewed_at,omitempty"`
	CreatedAt   time.Time        `json:"created_at"`
}

// AuditLog represents an immutable admin action log entry.
type AuditLog struct {
	ID          string    `json:"id"`
	AdminUserID string    `json:"admin_user_id"`
	Action      string    `json:"action"`
	TargetType  string    `json:"target_type"`
	TargetID    string    `json:"target_id"`
	Details     string    `json:"details,omitempty"`
	IPAddress   string    `json:"ip_address"`
	CreatedAt   time.Time `json:"created_at"`
}

// Appeal represents a user's appeal against a moderation decision.
type Appeal struct {
	ID               string       `json:"id"`
	ModerationItemID string       `json:"moderation_item_id"`
	UserID           string       `json:"user_id"`
	Reason           string       `json:"reason"`
	Status           AppealStatus `json:"status"`
	ReviewedBy       string       `json:"reviewed_by,omitempty"`
	CreatedAt        time.Time    `json:"created_at"`
}

// ReviewRequest is the payload for reviewing a moderation item.
type ReviewRequest struct {
	Status ModerationStatus `json:"status" binding:"required"`
	Reason string           `json:"reason"`
}

// AppealReviewRequest is the payload for reviewing an appeal.
type AppealReviewRequest struct {
	Status AppealStatus `json:"status" binding:"required"`
	Reason string       `json:"reason"`
}

// SuspendRequest is the payload for suspending a user.
type SuspendRequest struct {
	Reason   string `json:"reason" binding:"required"`
	Duration string `json:"duration"` // e.g., "7d", "30d", "permanent"
}

// PlatformStats holds aggregated platform statistics.
type PlatformStats struct {
	TotalUsers          int64 `json:"total_users"`
	ActiveUsers24h      int64 `json:"active_users_24h"`
	TotalVoices         int64 `json:"total_voices"`
	TotalIssues         int64 `json:"total_issues"`
	PendingModerations  int64 `json:"pending_moderations"`
	PendingAppeals      int64 `json:"pending_appeals"`
	SuspendedUsers      int64 `json:"suspended_users"`
	ContentRemovedToday int64 `json:"content_removed_today"`
}

// ModerationQueue is a paginated list of moderation items.
type ModerationQueue struct {
	Items      []ModerationItem `json:"items"`
	Page       int              `json:"page"`
	Limit      int              `json:"limit"`
	TotalCount int64            `json:"total_count"`
}

// AuditLogList is a paginated list of audit log entries.
type AuditLogList struct {
	Entries    []AuditLog `json:"entries"`
	Page       int        `json:"page"`
	Limit      int        `json:"limit"`
	TotalCount int64      `json:"total_count"`
}

// AppealList is a paginated list of appeals.
type AppealList struct {
	Appeals    []Appeal `json:"appeals"`
	Page       int      `json:"page"`
	Limit      int      `json:"limit"`
	TotalCount int64    `json:"total_count"`
}
