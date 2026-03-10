package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/civitro/services/admin/internal/model"
)

// Repository provides database operations for the admin service.
type Repository struct {
	db *pgxpool.Pool
}

// New creates a new admin repository.
func New(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetPendingItems retrieves moderation items with the given status, paginated.
func (r *Repository) GetPendingItems(ctx context.Context, status model.ModerationStatus, page, limit int) ([]model.ModerationItem, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	var totalCount int64
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM moderation_items WHERE status = $1`,
		status,
	).Scan(&totalCount)
	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx,
		`SELECT id, content_type, content_id, ai_score, ai_reason, status,
		        reviewed_by, reviewed_at, created_at
		 FROM moderation_items
		 WHERE status = $1
		 ORDER BY ai_score DESC, created_at ASC
		 LIMIT $2 OFFSET $3`,
		status, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]model.ModerationItem, 0, limit)
	for rows.Next() {
		var item model.ModerationItem
		if err := rows.Scan(
			&item.ID, &item.ContentType, &item.ContentID,
			&item.AIScore, &item.AIReason, &item.Status,
			&item.ReviewedBy, &item.ReviewedAt, &item.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}

	return items, totalCount, nil
}

// UpdateItemStatus updates the status of a moderation item.
func (r *Repository) UpdateItemStatus(ctx context.Context, id string, status model.ModerationStatus, reviewedBy string) error {
	now := time.Now()
	_, err := r.db.Exec(ctx,
		`UPDATE moderation_items SET status = $1, reviewed_by = $2, reviewed_at = $3
		 WHERE id = $4`,
		status, reviewedBy, now, id,
	)
	return err
}

// GetItemByID retrieves a single moderation item by ID.
func (r *Repository) GetItemByID(ctx context.Context, id string) (*model.ModerationItem, error) {
	item := &model.ModerationItem{}
	err := r.db.QueryRow(ctx,
		`SELECT id, content_type, content_id, ai_score, ai_reason, status,
		        reviewed_by, reviewed_at, created_at
		 FROM moderation_items WHERE id = $1`,
		id,
	).Scan(&item.ID, &item.ContentType, &item.ContentID,
		&item.AIScore, &item.AIReason, &item.Status,
		&item.ReviewedBy, &item.ReviewedAt, &item.CreatedAt)
	if err != nil {
		return nil, err
	}
	return item, nil
}

// CreateAuditLog inserts an immutable audit log entry.
func (r *Repository) CreateAuditLog(ctx context.Context, log *model.AuditLog) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id, details, ip_address, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		log.ID, log.AdminUserID, log.Action, log.TargetType,
		log.TargetID, log.Details, log.IPAddress, log.CreatedAt,
	)
	return err
}

// GetAuditLogs retrieves audit log entries with pagination and optional filters.
func (r *Repository) GetAuditLogs(ctx context.Context, adminUserID, action string, page, limit int) ([]model.AuditLog, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if adminUserID != "" {
		whereClause += " AND admin_user_id = $" + itoa(argIdx)
		args = append(args, adminUserID)
		argIdx++
	}
	if action != "" {
		whereClause += " AND action = $" + itoa(argIdx)
		args = append(args, action)
		argIdx++
	}

	var totalCount int64
	countQuery := "SELECT COUNT(*) FROM audit_logs " + whereClause
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, err
	}

	selectQuery := `SELECT id, admin_user_id, action, target_type, target_id, details, ip_address, created_at
		FROM audit_logs ` + whereClause + ` ORDER BY created_at DESC LIMIT $` + itoa(argIdx) + ` OFFSET $` + itoa(argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	entries := make([]model.AuditLog, 0, limit)
	for rows.Next() {
		var entry model.AuditLog
		if err := rows.Scan(
			&entry.ID, &entry.AdminUserID, &entry.Action,
			&entry.TargetType, &entry.TargetID, &entry.Details,
			&entry.IPAddress, &entry.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		entries = append(entries, entry)
	}

	return entries, totalCount, nil
}

// CreateAppeal inserts a new appeal.
func (r *Repository) CreateAppeal(ctx context.Context, appeal *model.Appeal) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO appeals (id, moderation_item_id, user_id, reason, status, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		appeal.ID, appeal.ModerationItemID, appeal.UserID,
		appeal.Reason, appeal.Status, appeal.CreatedAt,
	)
	return err
}

// GetAppeals retrieves appeals with pagination, optionally filtered by status.
func (r *Repository) GetAppeals(ctx context.Context, status model.AppealStatus, page, limit int) ([]model.Appeal, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	whereClause := ""
	args := []interface{}{}
	argIdx := 1

	if status != "" {
		whereClause = "WHERE status = $" + itoa(argIdx)
		args = append(args, status)
		argIdx++
	}

	var totalCount int64
	countQuery := "SELECT COUNT(*) FROM appeals " + whereClause
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, err
	}

	selectQuery := `SELECT id, moderation_item_id, user_id, reason, status, reviewed_by, created_at
		FROM appeals ` + whereClause + ` ORDER BY created_at ASC LIMIT $` + itoa(argIdx) + ` OFFSET $` + itoa(argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	appeals := make([]model.Appeal, 0, limit)
	for rows.Next() {
		var a model.Appeal
		if err := rows.Scan(
			&a.ID, &a.ModerationItemID, &a.UserID,
			&a.Reason, &a.Status, &a.ReviewedBy, &a.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		appeals = append(appeals, a)
	}

	return appeals, totalCount, nil
}

// UpdateAppeal updates the status and reviewer of an appeal.
func (r *Repository) UpdateAppeal(ctx context.Context, id string, status model.AppealStatus, reviewedBy string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE appeals SET status = $1, reviewed_by = $2 WHERE id = $3`,
		status, reviewedBy, id,
	)
	return err
}

// GetPlatformStats retrieves aggregated platform statistics.
func (r *Repository) GetPlatformStats(ctx context.Context) (*model.PlatformStats, error) {
	stats := &model.PlatformStats{}

	// Each stat query runs individually; in production these could be cached.
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&stats.TotalUsers)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE last_active_at > NOW() - INTERVAL '24 hours'`).Scan(&stats.ActiveUsers24h)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM voices`).Scan(&stats.TotalVoices)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM issues`).Scan(&stats.TotalIssues)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM moderation_items WHERE status = 'pending'`).Scan(&stats.PendingModerations)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM appeals WHERE status = 'pending'`).Scan(&stats.PendingAppeals)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE suspended = true`).Scan(&stats.SuspendedUsers)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM moderation_items WHERE status = 'removed' AND reviewed_at >= CURRENT_DATE`).Scan(&stats.ContentRemovedToday)

	return stats, nil
}

// itoa converts an int to a string (simple helper to avoid importing strconv).
func itoa(n int) string {
	if n < 10 {
		return string(rune('0' + n))
	}
	return itoa(n/10) + string(rune('0'+n%10))
}
