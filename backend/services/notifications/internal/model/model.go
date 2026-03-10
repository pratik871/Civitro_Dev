package model

import "time"

// NotificationType enumerates notification types.
type NotificationType string

const (
	NotifTypeIssueUpdate   NotificationType = "issue_update"
	NotifTypeResolution    NotificationType = "resolution"
	NotifTypeRatingPrompt  NotificationType = "rating_prompt"
	NotifTypeTrending      NotificationType = "trending"
	NotifTypePromiseUpdate NotificationType = "promise_update"
	NotifTypeAchievement   NotificationType = "achievement"
	NotifTypeSystem        NotificationType = "system"
)

// MaxPushPerDay is the maximum push notifications per user per day.
const MaxPushPerDay = 10

// Notification represents a single notification for a user.
type Notification struct {
	ID        string                 `json:"id"`
	UserID    string                 `json:"user_id"`
	Type      NotificationType       `json:"type"`
	Title     string                 `json:"title"`
	Body      string                 `json:"body"`
	Data      map[string]interface{} `json:"data,omitempty"`
	Read      bool                   `json:"read"`
	CreatedAt time.Time              `json:"created_at"`
}

// NotificationPrefs holds a user's notification preferences.
type NotificationPrefs struct {
	UserID          string `json:"user_id"`
	PushEnabled     bool   `json:"push_enabled"`
	EmailEnabled    bool   `json:"email_enabled"`
	SMSEnabled      bool   `json:"sms_enabled"`
	QuietHoursStart string `json:"quiet_hours_start"` // HH:MM format
	QuietHoursEnd   string `json:"quiet_hours_end"`   // HH:MM format
}

// NotificationList is a paginated list of notifications.
type NotificationList struct {
	Notifications []Notification `json:"notifications"`
	NextCursor    string         `json:"next_cursor,omitempty"`
	Total         int64          `json:"total"`
}

// UnreadCount holds the count of unread notifications for a user.
type UnreadCount struct {
	UserID string `json:"user_id"`
	Count  int64  `json:"count"`
}

// SendNotificationRequest is used to send a notification via Kafka consumer.
type SendNotificationRequest struct {
	UserID string                 `json:"user_id"`
	Type   NotificationType       `json:"type"`
	Title  string                 `json:"title"`
	Body   string                 `json:"body"`
	Data   map[string]interface{} `json:"data,omitempty"`
}
