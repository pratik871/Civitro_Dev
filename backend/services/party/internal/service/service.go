package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/civitro/pkg/events"
	"github.com/civitro/pkg/logger"
	"github.com/civitro/services/party/internal/model"
	"github.com/civitro/services/party/internal/repository"
)

// Service implements the party and organization business logic.
type Service struct {
	repo     *repository.Repository
	producer *events.Producer
}

// New creates a new party service.
func New(repo *repository.Repository, producer *events.Producer) *Service {
	return &Service{repo: repo, producer: producer}
}

// CreateOrg creates a new organization.
func (s *Service) CreateOrg(ctx context.Context, req model.CreateOrgRequest) (*model.Organization, error) {
	logger.Info().Str("name", req.Name).Str("type", string(req.Type)).Msg("creating organization")

	org := &model.Organization{
		ID:               generateID("org"),
		Name:             req.Name,
		Type:             req.Type,
		LogoURL:          req.LogoURL,
		Description:      req.Description,
		HierarchyLevels:  req.HierarchyLevels,
		SubscriptionTier: req.SubscriptionTier,
		CreatedAt:        time.Now(),
	}

	if org.HierarchyLevels <= 0 {
		org.HierarchyLevels = 1
	}
	if org.SubscriptionTier == "" {
		org.SubscriptionTier = "free"
	}

	if err := s.repo.Create(ctx, org); err != nil {
		logger.Error().Err(err).Msg("failed to create organization")
		return nil, err
	}

	// Publish org created event.
	payload, _ := json.Marshal(map[string]interface{}{
		"org_id": org.ID,
		"name":   org.Name,
		"type":   org.Type,
	})
	_ = s.producer.Publish(ctx, "org.created", org.ID, payload)

	return org, nil
}

// GetOrg retrieves an organization by ID.
func (s *Service) GetOrg(ctx context.Context, orgID string) (*model.Organization, error) {
	logger.Info().Str("org_id", orgID).Msg("fetching organization")

	org, err := s.repo.GetByID(ctx, orgID)
	if err != nil {
		logger.Error().Err(err).Str("org_id", orgID).Msg("failed to get organization")
		return nil, err
	}

	return org, nil
}

// AddMember adds a new member to an organization.
func (s *Service) AddMember(ctx context.Context, orgID string, req model.AddMemberRequest) (*model.OrgMember, error) {
	logger.Info().Str("org_id", orgID).Str("user_id", req.UserID).Str("role", string(req.Role)).Msg("adding member")

	member := &model.OrgMember{
		ID:          generateID("member"),
		OrgID:       orgID,
		UserID:      req.UserID,
		Role:        req.Role,
		Level:       req.Level,
		Permissions: req.Permissions,
		JoinedAt:    time.Now(),
	}

	if member.Role == "" {
		member.Role = model.MemberRoleMember
	}

	if err := s.repo.CreateMember(ctx, member); err != nil {
		logger.Error().Err(err).Msg("failed to add member")
		return nil, err
	}

	return member, nil
}

// GetMembers retrieves members of an organization with pagination.
func (s *Service) GetMembers(ctx context.Context, orgID string, page, limit int) (*model.MemberList, error) {
	logger.Info().Str("org_id", orgID).Int("page", page).Msg("fetching members")

	members, totalCount, err := s.repo.GetMembers(ctx, orgID, page, limit)
	if err != nil {
		logger.Error().Err(err).Str("org_id", orgID).Msg("failed to get members")
		return nil, err
	}

	return &model.MemberList{
		Members:    members,
		Page:       page,
		Limit:      limit,
		TotalCount: totalCount,
	}, nil
}

// RemoveMember removes a member from an organization.
func (s *Service) RemoveMember(ctx context.Context, orgID, userID string) error {
	logger.Info().Str("org_id", orgID).Str("user_id", userID).Msg("removing member")

	if err := s.repo.DeleteMember(ctx, orgID, userID); err != nil {
		logger.Error().Err(err).Msg("failed to remove member")
		return err
	}

	return nil
}

// SendBroadcast creates and sends a broadcast message to organization members.
func (s *Service) SendBroadcast(ctx context.Context, orgID, senderID string, req model.BroadcastRequest) (*model.Broadcast, error) {
	logger.Info().Str("org_id", orgID).Str("sender_id", senderID).Msg("sending broadcast")

	// Count target members for the broadcast.
	members, totalCount, err := s.repo.GetMembers(ctx, orgID, 1, 1)
	if err != nil {
		logger.Error().Err(err).Msg("failed to count members for broadcast")
		return nil, err
	}
	_ = members

	broadcast := &model.Broadcast{
		ID:          generateID("broadcast"),
		OrgID:       orgID,
		SenderID:    senderID,
		Text:        req.Text,
		MediaURL:    req.MediaURL,
		TargetLevel: req.TargetLevel,
		ReadCount:   0,
		TotalCount:  totalCount,
		CreatedAt:   time.Now(),
	}

	if err := s.repo.CreateBroadcast(ctx, broadcast); err != nil {
		logger.Error().Err(err).Msg("failed to create broadcast")
		return nil, err
	}

	// Publish broadcast event for notification delivery.
	payload, _ := json.Marshal(map[string]interface{}{
		"broadcast_id": broadcast.ID,
		"org_id":       orgID,
		"sender_id":    senderID,
		"target_level": req.TargetLevel,
	})
	_ = s.producer.Publish(ctx, "org.broadcast.created", broadcast.ID, payload)

	return broadcast, nil
}

// GetBroadcasts retrieves broadcasts for an organization with pagination.
func (s *Service) GetBroadcasts(ctx context.Context, orgID string, page, limit int) (*model.BroadcastList, error) {
	logger.Info().Str("org_id", orgID).Int("page", page).Msg("fetching broadcasts")

	broadcasts, totalCount, err := s.repo.GetBroadcasts(ctx, orgID, page, limit)
	if err != nil {
		logger.Error().Err(err).Str("org_id", orgID).Msg("failed to get broadcasts")
		return nil, err
	}

	return &model.BroadcastList{
		Broadcasts: broadcasts,
		Page:       page,
		Limit:      limit,
		TotalCount: totalCount,
	}, nil
}

// UpdateMemberRole updates a member's role within an organization.
func (s *Service) UpdateMemberRole(ctx context.Context, orgID, userID string, req model.UpdateRoleRequest) error {
	logger.Info().
		Str("org_id", orgID).
		Str("user_id", userID).
		Str("new_role", string(req.Role)).
		Msg("updating member role")

	if err := s.repo.UpdateRole(ctx, orgID, userID, req.Role, req.Level, req.Permissions); err != nil {
		logger.Error().Err(err).Msg("failed to update member role")
		return err
	}

	return nil
}

// GetAnalytics retrieves analytics data for an organization.
func (s *Service) GetAnalytics(ctx context.Context, orgID string) (*model.OrgAnalytics, error) {
	logger.Info().Str("org_id", orgID).Msg("fetching org analytics")

	_, totalMembers, err := s.repo.GetMembers(ctx, orgID, 1, 1)
	if err != nil {
		logger.Error().Err(err).Msg("failed to count members")
		return nil, err
	}

	membersByRole, err := s.repo.CountMembersByRole(ctx, orgID)
	if err != nil {
		logger.Error().Err(err).Msg("failed to count members by role")
		return nil, err
	}

	membersByLevel, err := s.repo.CountMembersByLevel(ctx, orgID)
	if err != nil {
		logger.Error().Err(err).Msg("failed to count members by level")
		return nil, err
	}

	totalBroadcasts, avgReadRate, err := s.repo.GetBroadcastStats(ctx, orgID)
	if err != nil {
		logger.Error().Err(err).Msg("failed to get broadcast stats")
		return nil, err
	}

	return &model.OrgAnalytics{
		OrgID:           orgID,
		TotalMembers:    totalMembers,
		ActiveMembers:   0, // Would require activity tracking
		TotalBroadcasts: totalBroadcasts,
		AvgReadRate:     avgReadRate,
		MembersByRole:   membersByRole,
		MembersByLevel:  membersByLevel,
	}, nil
}

// generateID creates a simple unique ID with a prefix.
func generateID(prefix string) string {
	return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
}
