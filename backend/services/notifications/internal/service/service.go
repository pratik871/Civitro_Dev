package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/civitro/pkg/logger"
	"github.com/civitro/services/notifications/internal/model"
	"github.com/civitro/services/notifications/internal/repository"
)

// Service implements the notifications business logic.
type Service struct {
	repo *repository.Repository
}

// New creates a new notifications service.
func New(repo *repository.Repository) *Service {
	return &Service{repo: repo}
}

// GetNotifications retrieves notifications for a user with cursor-based pagination.
func (s *Service) GetNotifications(ctx context.Context, userID, cursor string, limit int) (*model.NotificationList, error) {
	logger.Info().Str("user_id", userID).Str("cursor", cursor).Int("limit", limit).Msg("fetching notifications")

	notifications, nextCursor, err := s.repo.GetByUserID(ctx, userID, cursor, limit)
	if err != nil {
		logger.Error().Err(err).Str("user_id", userID).Msg("failed to get notifications")
		return nil, err
	}

	return &model.NotificationList{
		Notifications: notifications,
		NextCursor:    nextCursor,
		Total:         int64(len(notifications)),
	}, nil
}

// MarkRead marks a single notification as read.
func (s *Service) MarkRead(ctx context.Context, notificationID string) error {
	logger.Info().Str("id", notificationID).Msg("marking notification as read")
	return s.repo.MarkRead(ctx, notificationID)
}

// MarkAllRead marks all notifications for a user as read.
func (s *Service) MarkAllRead(ctx context.Context, userID string) error {
	logger.Info().Str("user_id", userID).Msg("marking all notifications as read")
	return s.repo.MarkAllRead(ctx, userID)
}

// DeleteNotification deletes a single notification.
func (s *Service) DeleteNotification(ctx context.Context, id string) error {
	return s.repo.DeleteNotification(ctx, id)
}

// ClearAll deletes all notifications for a user.
func (s *Service) ClearAll(ctx context.Context, userID string) error {
	logger.Info().Str("user_id", userID).Msg("clearing all notifications")
	return s.repo.ClearAll(ctx, userID)
}

// GetPrefs retrieves notification preferences for a user.
func (s *Service) GetPrefs(ctx context.Context, userID string) (*model.NotificationPrefs, error) {
	logger.Info().Str("user_id", userID).Msg("fetching notification prefs")

	prefs, err := s.repo.GetPrefs(ctx, userID)
	if err != nil {
		// Return default prefs if none found.
		return &model.NotificationPrefs{
			UserID:       userID,
			PushEnabled:  true,
			EmailEnabled: true,
			SMSEnabled:   false,
		}, nil
	}

	return prefs, nil
}

// UpdatePrefs updates notification preferences for a user.
func (s *Service) UpdatePrefs(ctx context.Context, prefs *model.NotificationPrefs) error {
	logger.Info().Str("user_id", prefs.UserID).Msg("updating notification prefs")
	return s.repo.UpdatePrefs(ctx, prefs)
}

// SendNotification creates and delivers a notification. Called via Kafka consumer.
// Enforces max 10 push notifications per user per day.
func (s *Service) SendNotification(ctx context.Context, req model.SendNotificationRequest) error {
	logger.Info().
		Str("user_id", req.UserID).
		Str("type", string(req.Type)).
		Str("title", req.Title).
		Msg("sending notification")

	// Check daily push limit.
	pushCount, err := s.repo.CountPushToday(ctx, req.UserID)
	if err != nil {
		logger.Warn().Err(err).Msg("failed to check push count, proceeding anyway")
	} else if pushCount >= model.MaxPushPerDay {
		logger.Warn().
			Str("user_id", req.UserID).
			Int64("count", pushCount).
			Msg("daily push limit reached, skipping push delivery")
		// Still save the notification, just skip push delivery.
	}

	notification := &model.Notification{
		ID:        generateID(),
		UserID:    req.UserID,
		Type:      req.Type,
		Title:     req.Title,
		Body:      req.Body,
		Data:      req.Data,
		Read:      false,
		CreatedAt: time.Now(),
	}

	if err := s.repo.Create(ctx, notification); err != nil {
		logger.Error().Err(err).Msg("failed to create notification")
		return err
	}

	// Deliver push notification via Expo Push API.
	if pushCount < model.MaxPushPerDay {
		s.deliverPush(ctx, notification)
	}

	return nil
}

// GetUnreadCount returns the count of unread notifications for a user.
func (s *Service) GetUnreadCount(ctx context.Context, userID string) (*model.UnreadCount, error) {
	count, err := s.repo.CountUnread(ctx, userID)
	if err != nil {
		logger.Error().Err(err).Str("user_id", userID).Msg("failed to count unread")
		return nil, err
	}

	return &model.UnreadCount{
		UserID: userID,
		Count:  count,
	}, nil
}

// expoPushEndpoint is the Expo Push API URL.
const expoPushEndpoint = "https://exp.host/--/api/v2/push/send"

// expoPushMessage represents a single message payload for the Expo Push API.
type expoPushMessage struct {
	To    string                 `json:"to"`
	Title string                 `json:"title"`
	Body  string                 `json:"body"`
	Data  map[string]interface{} `json:"data,omitempty"`
	Sound string                 `json:"sound,omitempty"`
}

// deliverPush sends a push notification via the Expo Push API.
// Falls back to console logging if no tokens are found or the API call fails.
func (s *Service) deliverPush(ctx context.Context, n *model.Notification) {
	tokens, err := s.repo.GetPushTokens(ctx, n.UserID)
	if err != nil {
		logger.Warn().Err(err).Str("user_id", n.UserID).Msg("failed to fetch push tokens, falling back to console")
		fmt.Printf("[PUSH] user=%s type=%s title=%q body=%q\n", n.UserID, n.Type, n.Title, n.Body)
		return
	}

	if len(tokens) == 0 {
		logger.Info().Str("user_id", n.UserID).Msg("no push tokens registered, skipping push delivery")
		return
	}

	for _, token := range tokens {
		msg := expoPushMessage{
			To:    token,
			Title: n.Title,
			Body:  n.Body,
			Data:  n.Data,
			Sound: "default",
		}

		payload, err := json.Marshal(msg)
		if err != nil {
			logger.Error().Err(err).Str("token", token).Msg("failed to marshal push message")
			continue
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, expoPushEndpoint, bytes.NewReader(payload))
		if err != nil {
			logger.Error().Err(err).Str("token", token).Msg("failed to create push request")
			continue
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			logger.Error().Err(err).Str("token", token).Msg("failed to send push notification")
			continue
		}
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			logger.Warn().
				Int("status", resp.StatusCode).
				Str("token", token).
				Str("user_id", n.UserID).
				Msg("Expo Push API returned non-200 status")
		} else {
			logger.Info().
				Str("user_id", n.UserID).
				Str("type", string(n.Type)).
				Msg("push notification delivered via Expo")
		}
	}
}

// generateID creates a UUID v4 for notification entries.
func generateID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant 10
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
