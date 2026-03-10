package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/civitro/services/party/internal/model"
)

// Repository provides database operations for the party service.
type Repository struct {
	db *pgxpool.Pool
}

// New creates a new party repository.
func New(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Create inserts a new organization.
func (r *Repository) Create(ctx context.Context, org *model.Organization) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO organizations (id, name, type, logo_url, description, hierarchy_levels, subscription_tier, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		org.ID, org.Name, org.Type, org.LogoURL, org.Description,
		org.HierarchyLevels, org.SubscriptionTier, org.CreatedAt,
	)
	return err
}

// GetByID retrieves an organization by ID.
func (r *Repository) GetByID(ctx context.Context, id string) (*model.Organization, error) {
	org := &model.Organization{}
	err := r.db.QueryRow(ctx,
		`SELECT id, name, type, logo_url, description, hierarchy_levels, subscription_tier, created_at
		 FROM organizations WHERE id = $1`,
		id,
	).Scan(&org.ID, &org.Name, &org.Type, &org.LogoURL, &org.Description,
		&org.HierarchyLevels, &org.SubscriptionTier, &org.CreatedAt)
	if err != nil {
		return nil, err
	}
	return org, nil
}

// CreateMember inserts a new organization member.
func (r *Repository) CreateMember(ctx context.Context, member *model.OrgMember) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO org_members (id, org_id, user_id, role, level, permissions, joined_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		member.ID, member.OrgID, member.UserID, member.Role,
		member.Level, member.Permissions, member.JoinedAt,
	)
	return err
}

// GetMembers retrieves members of an organization with pagination.
func (r *Repository) GetMembers(ctx context.Context, orgID string, page, limit int) ([]model.OrgMember, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var totalCount int64
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM org_members WHERE org_id = $1`,
		orgID,
	).Scan(&totalCount)
	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx,
		`SELECT id, org_id, user_id, role, level, permissions, joined_at
		 FROM org_members
		 WHERE org_id = $1
		 ORDER BY role, joined_at ASC
		 LIMIT $2 OFFSET $3`,
		orgID, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	members := make([]model.OrgMember, 0, limit)
	for rows.Next() {
		var m model.OrgMember
		if err := rows.Scan(&m.ID, &m.OrgID, &m.UserID, &m.Role, &m.Level, &m.Permissions, &m.JoinedAt); err != nil {
			return nil, 0, err
		}
		members = append(members, m)
	}

	return members, totalCount, nil
}

// DeleteMember removes a member from an organization.
func (r *Repository) DeleteMember(ctx context.Context, orgID, userID string) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM org_members WHERE org_id = $1 AND user_id = $2`,
		orgID, userID,
	)
	return err
}

// CreateBroadcast inserts a new broadcast message.
func (r *Repository) CreateBroadcast(ctx context.Context, broadcast *model.Broadcast) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO broadcasts (id, org_id, sender_id, text, media_url, target_level, read_count, total_count, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		broadcast.ID, broadcast.OrgID, broadcast.SenderID, broadcast.Text,
		broadcast.MediaURL, broadcast.TargetLevel, broadcast.ReadCount,
		broadcast.TotalCount, broadcast.CreatedAt,
	)
	return err
}

// GetBroadcasts retrieves broadcasts for an organization with pagination.
func (r *Repository) GetBroadcasts(ctx context.Context, orgID string, page, limit int) ([]model.Broadcast, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	var totalCount int64
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM broadcasts WHERE org_id = $1`,
		orgID,
	).Scan(&totalCount)
	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx,
		`SELECT id, org_id, sender_id, text, media_url, target_level, read_count, total_count, created_at
		 FROM broadcasts
		 WHERE org_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		orgID, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	broadcasts := make([]model.Broadcast, 0, limit)
	for rows.Next() {
		var b model.Broadcast
		if err := rows.Scan(
			&b.ID, &b.OrgID, &b.SenderID, &b.Text, &b.MediaURL,
			&b.TargetLevel, &b.ReadCount, &b.TotalCount, &b.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		broadcasts = append(broadcasts, b)
	}

	return broadcasts, totalCount, nil
}

// UpdateRole updates a member's role, level, and permissions.
func (r *Repository) UpdateRole(ctx context.Context, orgID, userID string, role model.MemberRole, level int, permissions []string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE org_members SET role = $1, level = $2, permissions = $3
		 WHERE org_id = $4 AND user_id = $5`,
		role, level, permissions, orgID, userID,
	)
	return err
}

// CountMembersByRole counts members by role for analytics.
func (r *Repository) CountMembersByRole(ctx context.Context, orgID string) (map[string]int64, error) {
	rows, err := r.db.Query(ctx,
		`SELECT role, COUNT(*) FROM org_members WHERE org_id = $1 GROUP BY role`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]int64)
	for rows.Next() {
		var role string
		var count int64
		if err := rows.Scan(&role, &count); err != nil {
			return nil, err
		}
		result[role] = count
	}
	return result, nil
}

// CountMembersByLevel counts members by hierarchy level for analytics.
func (r *Repository) CountMembersByLevel(ctx context.Context, orgID string) (map[int]int64, error) {
	rows, err := r.db.Query(ctx,
		`SELECT level, COUNT(*) FROM org_members WHERE org_id = $1 GROUP BY level`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int]int64)
	for rows.Next() {
		var level int
		var count int64
		if err := rows.Scan(&level, &count); err != nil {
			return nil, err
		}
		result[level] = count
	}
	return result, nil
}

// GetBroadcastStats retrieves broadcast statistics for analytics.
func (r *Repository) GetBroadcastStats(ctx context.Context, orgID string) (totalBroadcasts int64, avgReadRate float64, err error) {
	err = r.db.QueryRow(ctx,
		`SELECT COALESCE(COUNT(*), 0),
		        COALESCE(AVG(CASE WHEN total_count > 0 THEN read_count::float / total_count ELSE 0 END), 0)
		 FROM broadcasts WHERE org_id = $1`,
		orgID,
	).Scan(&totalBroadcasts, &avgReadRate)
	return
}
