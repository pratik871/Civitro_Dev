package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/civitro/pkg/logger"
	"github.com/civitro/services/reputation/internal/model"
	"github.com/civitro/services/reputation/internal/repository"
)

// ReputationService contains business logic for citizen civic reputation.
type ReputationService struct {
	repo *repository.ReputationRepository
}

// NewReputationService creates a new ReputationService.
func NewReputationService(repo *repository.ReputationRepository) *ReputationService {
	return &ReputationService{
		repo: repo,
	}
}

// GetReputation returns the current civic score for a user.
func (s *ReputationService) GetReputation(ctx context.Context, userID string) (*model.CivicScore, error) {
	score, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		logger.Error().Err(err).Str("user_id", userID).Msg("failed to get reputation")
		return nil, err
	}
	return score, nil
}

// GetHistory returns the score event history for a user.
func (s *ReputationService) GetHistory(ctx context.Context, userID string) ([]model.ScoreEvent, error) {
	events, err := s.repo.GetEventsByUserID(ctx, userID)
	if err != nil {
		logger.Error().Err(err).Str("user_id", userID).Msg("failed to get reputation history")
		return nil, err
	}

	if events == nil {
		events = []model.ScoreEvent{}
	}
	return events, nil
}

// GetLeaderboard returns the top citizens by credibility score within a boundary.
func (s *ReputationService) GetLeaderboard(ctx context.Context, boundaryID string) ([]model.CivicScore, error) {
	scores, err := s.repo.GetLeaderboard(ctx, boundaryID)
	if err != nil {
		logger.Error().Err(err).Str("boundary_id", boundaryID).Msg("failed to get leaderboard")
		return nil, err
	}

	if scores == nil {
		scores = []model.CivicScore{}
	}
	return scores, nil
}

// ProcessEvent handles a score-affecting event (typically received via Kafka).
// It creates the event record and updates the user's aggregate civic score.
func (s *ReputationService) ProcessEvent(ctx context.Context, userID, eventType string, points int, reason string) error {
	event := &model.ScoreEvent{
		ID:        generateID(),
		UserID:    userID,
		EventType: eventType,
		Points:    points,
		Reason:    reason,
		CreatedAt: time.Now().UTC(),
	}

	// Record the event.
	if err := s.repo.CreateEvent(ctx, event); err != nil {
		logger.Error().Err(err).Str("user_id", userID).Msg("failed to create score event")
		return err
	}

	// Fetch current score to update.
	current, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		// User doesn't have a score yet -- initialize one.
		current = &model.CivicScore{
			UserID:           userID,
			CredibilityScore: 0,
			InfluenceScore:   0,
			Tier:             model.TierNewCitizen,
		}
	}

	// Apply points to credibility score, clamping to [0, 1000].
	newCredibility := current.CredibilityScore + points
	if newCredibility < 0 {
		newCredibility = 0
	}
	if newCredibility > 1000 {
		newCredibility = 1000
	}
	current.CredibilityScore = newCredibility

	// Update event-type-specific counters.
	switch eventType {
	case model.EventReportFiled:
		current.ReportsFiled++
	case model.EventReportResolved:
		current.ReportsResolved++
	case model.EventReportAccurate:
		if current.ReportsFiled > 0 {
			current.AccuracyRate = float64(current.ReportsResolved) / float64(current.ReportsFiled)
		}
	case model.EventFollowerGained:
		current.FollowersCount++
	}

	// Recalculate tier based on new credibility score.
	current.Tier = model.TierFromScore(current.CredibilityScore)
	current.UpdatedAt = time.Now().UTC()

	// Persist updated score.
	if err := s.repo.UpdateScore(ctx, current); err != nil {
		logger.Error().Err(err).Str("user_id", userID).Msg("failed to update civic score")
		return err
	}

	logger.Info().
		Str("user_id", userID).
		Str("event_type", eventType).
		Int("points", points).
		Int("new_credibility", current.CredibilityScore).
		Str("tier", string(current.Tier)).
		Msg("score event processed")
	return nil
}

func generateID() string {
	return uuid.New().String()
}
