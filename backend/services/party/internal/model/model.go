package model

import "time"

// OrgType enumerates organization types.
type OrgType string

const (
	OrgTypePoliticalParty OrgType = "political_party"
	OrgTypeNGO            OrgType = "ngo"
	OrgTypeRWA            OrgType = "rwa"
	OrgTypeClub           OrgType = "club"
)

// MemberRole enumerates member roles within an organization.
type MemberRole string

const (
	MemberRoleAdmin       MemberRole = "admin"
	MemberRoleFunctionary MemberRole = "functionary"
	MemberRoleMember      MemberRole = "member"
)

// Organization represents a political party, NGO, RWA, or club.
type Organization struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	Type             OrgType   `json:"type"`
	LogoURL          string    `json:"logo_url,omitempty"`
	Description      string    `json:"description,omitempty"`
	HierarchyLevels  int       `json:"hierarchy_levels"`
	SubscriptionTier string    `json:"subscription_tier"`
	CreatedAt        time.Time `json:"created_at"`
}

// OrgMember represents a member of an organization.
type OrgMember struct {
	ID          string     `json:"id"`
	OrgID       string     `json:"org_id"`
	UserID      string     `json:"user_id"`
	Role        MemberRole `json:"role"`
	Level       int        `json:"level"`
	Permissions []string   `json:"permissions,omitempty"`
	JoinedAt    time.Time  `json:"joined_at"`
}

// Broadcast represents a message broadcast within an organization.
type Broadcast struct {
	ID         string    `json:"id"`
	OrgID      string    `json:"org_id"`
	SenderID   string    `json:"sender_id"`
	Text       string    `json:"text"`
	MediaURL   string    `json:"media_url,omitempty"`
	TargetLevel int      `json:"target_level"`
	ReadCount  int64     `json:"read_count"`
	TotalCount int64     `json:"total_count"`
	CreatedAt  time.Time `json:"created_at"`
}

// CreateOrgRequest is the payload for creating an organization.
type CreateOrgRequest struct {
	Name             string  `json:"name" binding:"required"`
	Type             OrgType `json:"type" binding:"required"`
	LogoURL          string  `json:"logo_url"`
	Description      string  `json:"description"`
	HierarchyLevels  int     `json:"hierarchy_levels"`
	SubscriptionTier string  `json:"subscription_tier"`
}

// AddMemberRequest is the payload for adding a member to an organization.
type AddMemberRequest struct {
	UserID      string     `json:"user_id" binding:"required"`
	Role        MemberRole `json:"role" binding:"required"`
	Level       int        `json:"level"`
	Permissions []string   `json:"permissions"`
}

// UpdateRoleRequest is the payload for updating a member's role.
type UpdateRoleRequest struct {
	Role        MemberRole `json:"role" binding:"required"`
	Level       int        `json:"level"`
	Permissions []string   `json:"permissions"`
}

// BroadcastRequest is the payload for sending a broadcast message.
type BroadcastRequest struct {
	Text        string `json:"text" binding:"required"`
	MediaURL    string `json:"media_url"`
	TargetLevel int    `json:"target_level"`
}

// MemberList is a paginated list of organization members.
type MemberList struct {
	Members    []OrgMember `json:"members"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalCount int64       `json:"total_count"`
}

// BroadcastList is a paginated list of broadcasts.
type BroadcastList struct {
	Broadcasts []Broadcast `json:"broadcasts"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalCount int64       `json:"total_count"`
}

// OrgAnalytics holds analytics data for an organization.
type OrgAnalytics struct {
	OrgID           string `json:"org_id"`
	TotalMembers    int64  `json:"total_members"`
	ActiveMembers   int64  `json:"active_members"`
	TotalBroadcasts int64  `json:"total_broadcasts"`
	AvgReadRate     float64 `json:"avg_read_rate"`
	MembersByRole   map[string]int64 `json:"members_by_role"`
	MembersByLevel  map[int]int64    `json:"members_by_level"`
}
