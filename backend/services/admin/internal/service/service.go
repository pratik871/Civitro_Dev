package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/civitro/pkg/events"
	"github.com/civitro/pkg/logger"
	"github.com/civitro/services/admin/internal/model"
	"github.com/civitro/services/admin/internal/repository"
)

// Service implements the admin and moderation business logic.
type Service struct {
	repo     *repository.Repository
	producer *events.Producer
}

// New creates a new admin service.
func New(repo *repository.Repository, producer *events.Producer) *Service {
	return &Service{repo: repo, producer: producer}
}

// GetModerationQueue retrieves pending moderation items.
func (s *Service) GetModerationQueue(ctx context.Context, page, limit int) (*model.ModerationQueue, error) {
	logger.Info().Int("page", page).Int("limit", limit).Msg("fetching moderation queue")

	items, totalCount, err := s.repo.GetPendingItems(ctx, model.ModerationStatusPending, page, limit)
	if err != nil {
		logger.Error().Err(err).Msg("failed to get moderation queue")
		return nil, err
	}

	return &model.ModerationQueue{
		Items:      items,
		Page:       page,
		Limit:      limit,
		TotalCount: totalCount,
	}, nil
}

// ReviewItem reviews a moderation item and creates an audit log entry.
func (s *Service) ReviewItem(ctx context.Context, itemID string, req model.ReviewRequest, adminUserID, ipAddress string) error {
	logger.Info().
		Str("item_id", itemID).
		Str("status", string(req.Status)).
		Str("admin", adminUserID).
		Msg("reviewing moderation item")

	if err := s.repo.UpdateItemStatus(ctx, itemID, req.Status, adminUserID); err != nil {
		logger.Error().Err(err).Msg("failed to update moderation item")
		return err
	}

	// Create immutable audit log entry.
	auditLog := &model.AuditLog{
		ID:          generateID("audit"),
		AdminUserID: adminUserID,
		Action:      "moderation_review",
		TargetType:  "moderation_item",
		TargetID:    itemID,
		Details:     fmt.Sprintf("status=%s reason=%s", req.Status, req.Reason),
		IPAddress:   ipAddress,
		CreatedAt:   time.Now(),
	}

	if err := s.repo.CreateAuditLog(ctx, auditLog); err != nil {
		logger.Error().Err(err).Msg("failed to create audit log")
		return err
	}

	return nil
}

// GetAuditLog retrieves audit log entries with pagination and optional filters.
func (s *Service) GetAuditLog(ctx context.Context, adminUserID, action string, page, limit int) (*model.AuditLogList, error) {
	logger.Info().Str("admin", adminUserID).Str("action", action).Int("page", page).Msg("fetching audit log")

	entries, totalCount, err := s.repo.GetAuditLogs(ctx, adminUserID, action, page, limit)
	if err != nil {
		logger.Error().Err(err).Msg("failed to get audit logs")
		return nil, err
	}

	return &model.AuditLogList{
		Entries:    entries,
		Page:       page,
		Limit:      limit,
		TotalCount: totalCount,
	}, nil
}

// SuspendUser suspends a user and creates an audit log entry.
func (s *Service) SuspendUser(ctx context.Context, userID string, req model.SuspendRequest, adminUserID, ipAddress string) error {
	logger.Info().Str("user_id", userID).Str("reason", req.Reason).Str("duration", req.Duration).Msg("suspending user")

	// Publish suspension event for the identity service to act on.
	payload, _ := json.Marshal(map[string]interface{}{
		"user_id":  userID,
		"reason":   req.Reason,
		"duration": req.Duration,
	})
	if err := s.producer.Publish(ctx, "admin.user.suspended", userID, payload); err != nil {
		logger.Error().Err(err).Msg("failed to publish suspension event")
		return err
	}

	// Create immutable audit log entry.
	auditLog := &model.AuditLog{
		ID:          generateID("audit"),
		AdminUserID: adminUserID,
		Action:      "user_suspend",
		TargetType:  "user",
		TargetID:    userID,
		Details:     fmt.Sprintf("reason=%s duration=%s", req.Reason, req.Duration),
		IPAddress:   ipAddress,
		CreatedAt:   time.Now(),
	}

	return s.repo.CreateAuditLog(ctx, auditLog)
}

// UnsuspendUser removes a user's suspension and creates an audit log entry.
func (s *Service) UnsuspendUser(ctx context.Context, userID, adminUserID, ipAddress string) error {
	logger.Info().Str("user_id", userID).Msg("unsuspending user")

	// Publish unsuspension event.
	payload, _ := json.Marshal(map[string]interface{}{
		"user_id": userID,
	})
	if err := s.producer.Publish(ctx, "admin.user.unsuspended", userID, payload); err != nil {
		logger.Error().Err(err).Msg("failed to publish unsuspension event")
		return err
	}

	// Create immutable audit log entry.
	auditLog := &model.AuditLog{
		ID:          generateID("audit"),
		AdminUserID: adminUserID,
		Action:      "user_unsuspend",
		TargetType:  "user",
		TargetID:    userID,
		Details:     "suspension removed",
		IPAddress:   ipAddress,
		CreatedAt:   time.Now(),
	}

	return s.repo.CreateAuditLog(ctx, auditLog)
}

// GetAppeals retrieves appeals with pagination and optional status filter.
func (s *Service) GetAppeals(ctx context.Context, status model.AppealStatus, page, limit int) (*model.AppealList, error) {
	logger.Info().Str("status", string(status)).Int("page", page).Msg("fetching appeals")

	appeals, totalCount, err := s.repo.GetAppeals(ctx, status, page, limit)
	if err != nil {
		logger.Error().Err(err).Msg("failed to get appeals")
		return nil, err
	}

	return &model.AppealList{
		Appeals:    appeals,
		Page:       page,
		Limit:      limit,
		TotalCount: totalCount,
	}, nil
}

// ReviewAppeal reviews an appeal and updates the related moderation item if accepted.
func (s *Service) ReviewAppeal(ctx context.Context, appealID string, req model.AppealReviewRequest, adminUserID, ipAddress string) error {
	logger.Info().Str("appeal_id", appealID).Str("status", string(req.Status)).Msg("reviewing appeal")

	if err := s.repo.UpdateAppeal(ctx, appealID, req.Status, adminUserID); err != nil {
		logger.Error().Err(err).Msg("failed to update appeal")
		return err
	}

	// Create immutable audit log entry.
	auditLog := &model.AuditLog{
		ID:          generateID("audit"),
		AdminUserID: adminUserID,
		Action:      "appeal_review",
		TargetType:  "appeal",
		TargetID:    appealID,
		Details:     fmt.Sprintf("status=%s reason=%s", req.Status, req.Reason),
		IPAddress:   ipAddress,
		CreatedAt:   time.Now(),
	}

	return s.repo.CreateAuditLog(ctx, auditLog)
}

// GetPlatformStats retrieves aggregated platform statistics.
func (s *Service) GetPlatformStats(ctx context.Context) (*model.PlatformStats, error) {
	logger.Info().Msg("fetching platform stats")

	stats, err := s.repo.GetPlatformStats(ctx)
	if err != nil {
		logger.Error().Err(err).Msg("failed to get platform stats")
		return nil, err
	}

	return stats, nil
}

// generateID creates a simple unique ID with a prefix.
func generateID(prefix string) string {
	return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
}
