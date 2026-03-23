package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"math"
	"time"

	"github.com/civitro/pkg/logger"
	"github.com/civitro/services/rating/internal/model"
	"github.com/civitro/services/rating/internal/repository"
)

// RatingService contains business logic for representative ratings and accountability.
type RatingService struct {
	repo *repository.RatingRepository
}

// NewRatingService creates a new RatingService.
func NewRatingService(repo *repository.RatingRepository) *RatingService {
	return &RatingService{
		repo: repo,
	}
}

// GetRating returns the current rating for a representative, computed over a 90-day
// rolling window. Returns nil (not an error) if insufficient samples exist.
func (s *RatingService) GetRating(ctx context.Context, repID string) (*model.Rating, error) {
	rating, err := s.repo.GetCurrentRating(ctx, repID)
	if err != nil {
		logger.Error().Err(err).Str("rep_id", repID).Msg("failed to get current rating")
		return nil, err
	}

	// Check if the rating is still within the valid window.
	if time.Since(rating.WindowEnd) > 24*time.Hour {
		logger.Warn().Str("rep_id", repID).Time("window_end", rating.WindowEnd).Msg("rating is stale, recomputation needed")
	}

	return rating, nil
}

// GetRatingHistory returns the full history of rating snapshots for a representative.
func (s *RatingService) GetRatingHistory(ctx context.Context, repID string) ([]model.Rating, error) {
	ratings, err := s.repo.GetRatingHistory(ctx, repID)
	if err != nil {
		logger.Error().Err(err).Str("rep_id", repID).Msg("failed to get rating history")
		return nil, err
	}

	if ratings == nil {
		ratings = []model.Rating{}
	}
	return ratings, nil
}

// GetMyRating returns the user's most recent rating and total rating count for a representative.
func (s *RatingService) GetMyRating(ctx context.Context, userID, repID string) (int, int, error) {
	score, err := s.repo.GetUserRating(ctx, userID, repID)
	if err != nil {
		return 0, 0, err
	}
	total, _ := s.repo.GetTotalRatingsCount(ctx, repID)
	return score, total, nil
}

// SubmitSurvey records a citizen's satisfaction survey for a representative.
func (s *RatingService) SubmitSurvey(ctx context.Context, req model.SubmitSurveyRequest) (*model.SatisfactionSurvey, error) {
	if req.Score < 1 || req.Score > 5 {
		return nil, fmt.Errorf("score must be between 1 and 5")
	}

	var issueID *string
	if req.IssueID != "" {
		issueID = &req.IssueID
	}

	survey := &model.SatisfactionSurvey{
		ID:                 generateID(),
		UserID:             req.UserID,
		RepresentativeID:   req.RepresentativeID,
		IssueID:            issueID,
		Score:              req.Score,
		Responsiveness:     req.Responsiveness,
		Transparency:       req.Transparency,
		DeliveryOnPromises: req.DeliveryOnPromises,
		Accessibility:      req.Accessibility,
		OverallImpact:      req.OverallImpact,
		Feedback:           req.Feedback,
		CreatedAt:          time.Now().UTC(),
	}

	if err := s.repo.CreateSurvey(ctx, survey); err != nil {
		logger.Error().Err(err).Str("rep_id", req.RepresentativeID).Msg("failed to create survey")
		return nil, err
	}

	// Update the representative's average rating
	if err := s.repo.UpdateRepresentativeRating(ctx, req.RepresentativeID); err != nil {
		logger.Warn().Err(err).Str("rep_id", req.RepresentativeID).Msg("failed to update representative rating (non-critical)")
	}

	logger.Info().Str("survey_id", survey.ID).Str("rep_id", req.RepresentativeID).Int("score", req.Score).Msg("survey submitted")
	return survey, nil
}

// GetRankings returns representatives ranked by composite score within a boundary.
func (s *RatingService) GetRankings(ctx context.Context, boundaryID string) ([]model.Rating, error) {
	ratings, err := s.repo.GetRankingsByBoundary(ctx, boundaryID)
	if err != nil {
		logger.Error().Err(err).Str("boundary_id", boundaryID).Msg("failed to get rankings")
		return nil, err
	}

	// Sort by composite score descending (already ordered in query, but ensure).
	sortByScore(ratings)

	if ratings == nil {
		ratings = []model.Rating{}
	}
	return ratings, nil
}

// ComputeScore calculates the weighted composite score from individual dimensions.
// Formula: responsiveness(25%) + speed(25%) + satisfaction(20%) + sentiment(15%) + CHI(15%)
// Requires a minimum of 20 samples to produce a valid score.
func ComputeScore(responsiveness, speed, satisfaction, sentiment, chi float64, sampleCount int) float64 {
	if sampleCount < model.MinSampleCount {
		return 0
	}

	raw := responsiveness*model.RatingWeights.Responsiveness +
		speed*model.RatingWeights.Speed +
		satisfaction*model.RatingWeights.Satisfaction +
		sentiment*model.RatingWeights.Sentiment +
		chi*model.RatingWeights.CHI

	// Clamp to [0, 5].
	return math.Max(0, math.Min(5, raw))
}

// sortByScore sorts ratings by computed score in descending order.
func sortByScore(ratings []model.Rating) {
	for i := 1; i < len(ratings); i++ {
		for j := i; j > 0 && ratings[j].ComputedScore > ratings[j-1].ComputedScore; j-- {
			ratings[j], ratings[j-1] = ratings[j-1], ratings[j]
		}
	}
}

func generateID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
