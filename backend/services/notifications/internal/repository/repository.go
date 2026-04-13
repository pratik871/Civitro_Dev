package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/civitro/services/notifications/internal/model"
)

// Repository provides database operations for the notifications service.
type Repository struct {
	db *pgxpool.Pool
}

// New creates a new notifications repository.
func New(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetByUserID retrieves notifications for a user with cursor-based pagination.
func (r *Repository) GetByUserID(ctx context.Context, userID, cursor string, limit int) ([]model.Notification, string, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	query := `
		SELECT id, user_id, type, title, body, data, read, created_at
		FROM notifications
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argIdx := 2

	if cursor != "" {
		query += ` AND created_at < $` + itoa(argIdx)
		args = append(args, cursor)
		argIdx++
	}
	_ = argIdx

	query += ` ORDER BY created_at DESC LIMIT $` + itoa(len(args)+1)
	args = append(args, limit+1)

	dbRows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer dbRows.Close()

	notifications := make([]model.Notification, 0, limit)
	for dbRows.Next() {
		var n model.Notification
		if err := dbRows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Body, &n.Data, &n.Read, &n.CreatedAt); err != nil {
			return nil, "", err
		}
		notifications = append(notifications, n)
	}

	var nextCursor string
	if len(notifications) > limit {
		nextCursor = notifications[limit-1].CreatedAt.Format(time.RFC3339Nano)
		notifications = notifications[:limit]
	}

	return notifications, nextCursor, nil
}

// MarkRead marks a single notification as read.
func (r *Repository) MarkRead(ctx context.Context, notificationID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE notifications SET read = true WHERE id = $1`,
		notificationID,
	)
	return err
}

// MarkAllRead marks all notifications for a user as read.
func (r *Repository) MarkAllRead(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
		userID,
	)
	return err
}

// DeleteNotification deletes a single notification by ID.
func (r *Repository) DeleteNotification(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM notifications WHERE id = $1`, id)
	return err
}

// ClearAll deletes all notifications for a user.
func (r *Repository) ClearAll(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM notifications WHERE user_id = $1`, userID)
	return err
}

// GetPrefs retrieves notification preferences for a user.
func (r *Repository) GetPrefs(ctx context.Context, userID string) (*model.NotificationPrefs, error) {
	prefs := &model.NotificationPrefs{}
	var qhStart, qhEnd *time.Time
	err := r.db.QueryRow(ctx,
		`SELECT user_id, push_enabled, email_enabled, sms_enabled, quiet_hours_start, quiet_hours_end
		 FROM notification_prefs WHERE user_id = $1`,
		userID,
	).Scan(&prefs.UserID, &prefs.PushEnabled, &prefs.EmailEnabled, &prefs.SMSEnabled,
		&qhStart, &qhEnd)
	if err != nil {
		return nil, err
	}
	if qhStart != nil {
		prefs.QuietHoursStart = qhStart.Format("15:04")
	}
	if qhEnd != nil {
		prefs.QuietHoursEnd = qhEnd.Format("15:04")
	}
	return prefs, nil
}

// UpdatePrefs updates or inserts notification preferences for a user.
func (r *Repository) UpdatePrefs(ctx context.Context, prefs *model.NotificationPrefs) error {
	// Parse quiet hours strings to time.Time for Postgres TIME column.
	var qhStart, qhEnd interface{}
	if prefs.QuietHoursStart != "" {
		if t, err := time.Parse("15:04", prefs.QuietHoursStart); err == nil {
			qhStart = t
		}
	}
	if prefs.QuietHoursEnd != "" {
		if t, err := time.Parse("15:04", prefs.QuietHoursEnd); err == nil {
			qhEnd = t
		}
	}

	_, err := r.db.Exec(ctx,
		`INSERT INTO notification_prefs (user_id, push_enabled, email_enabled, sms_enabled, quiet_hours_start, quiet_hours_end)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (user_id) DO UPDATE SET
		   push_enabled = EXCLUDED.push_enabled,
		   email_enabled = EXCLUDED.email_enabled,
		   sms_enabled = EXCLUDED.sms_enabled,
		   quiet_hours_start = EXCLUDED.quiet_hours_start,
		   quiet_hours_end = EXCLUDED.quiet_hours_end`,
		prefs.UserID, prefs.PushEnabled, prefs.EmailEnabled, prefs.SMSEnabled,
		qhStart, qhEnd,
	)
	return err
}

// Create inserts a new notification into the database.
func (r *Repository) Create(ctx context.Context, n *model.Notification) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO notifications (id, user_id, type, title, body, data, read, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		n.ID, n.UserID, n.Type, n.Title, n.Body, n.Data, n.Read, n.CreatedAt,
	)
	return err
}

// CountUnread returns the number of unread notifications for a user.
func (r *Repository) CountUnread(ctx context.Context, userID string) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false`,
		userID,
	).Scan(&count)
	return count, err
}

// CountPushToday returns the number of push notifications sent to a user today.
func (r *Repository) CountPushToday(ctx context.Context, userID string) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications
		 WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
		userID,
	).Scan(&count)
	return count, err
}

// GetPushTokens retrieves all push notification tokens for a user.
func (r *Repository) GetPushTokens(ctx context.Context, userID string) ([]string, error) {
	rows, err := r.db.Query(ctx,
		`SELECT token FROM push_tokens WHERE user_id = $1 ORDER BY updated_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []string
	for rows.Next() {
		var token string
		if err := rows.Scan(&token); err != nil {
			return nil, err
		}
		tokens = append(tokens, token)
	}
	return tokens, nil
}

// GetUserPreferredLanguage retrieves the preferred_language for a user from the users table.
// Returns empty string if no preference is set or the user is not found.
func (r *Repository) GetUserPreferredLanguage(ctx context.Context, userID string) (string, error) {
	var lang *string
	err := r.db.QueryRow(ctx,
		`SELECT preferred_language FROM users WHERE id = $1`,
		userID,
	).Scan(&lang)
	if err != nil {
		return "", err
	}
	if lang == nil {
		return "", nil
	}
	return *lang, nil
}

// itoa converts an int to a string (simple helper to avoid importing strconv).
func itoa(n int) string {
	if n < 10 {
		return string(rune('0' + n))
	}
	return itoa(n/10) + string(rune('0'+n%10))
}
