package service

import (
	"context"
	"fmt"
	"time"

	"github.com/civitro/pkg/logger"
	"github.com/civitro/services/polls/internal/model"
	"github.com/civitro/services/polls/internal/repository"
)

// PollService contains business logic for polls and democratic voting.
type PollService struct {
	repo *repository.PollRepository
}

// NewPollService creates a new PollService.
func NewPollService(repo *repository.PollRepository) *PollService {
	return &PollService{
		repo: repo,
	}
}

// CreatePoll creates a new poll with the given options.
func (s *PollService) CreatePoll(ctx context.Context, req model.CreatePollRequest) (*model.Poll, error) {
	if len(req.Options) < 2 {
		return nil, fmt.Errorf("poll must have at least 2 options")
	}

	startsAt, err := time.Parse(time.RFC3339, req.StartsAt)
	if err != nil {
		return nil, fmt.Errorf("invalid starts_at format: %w", err)
	}

	endsAt, err := time.Parse(time.RFC3339, req.EndsAt)
	if err != nil {
		return nil, fmt.Errorf("invalid ends_at format: %w", err)
	}

	if endsAt.Before(startsAt) {
		return nil, fmt.Errorf("ends_at must be after starts_at")
	}

	visibility := req.Visibility
	if visibility == "" {
		visibility = "public"
	}

	pollID := generateID()
	options := make([]model.PollOption, len(req.Options))
	for i, label := range req.Options {
		options[i] = model.PollOption{
			ID:         fmt.Sprintf("%s-opt-%d", pollID, i+1),
			PollID:     pollID,
			Label:      label,
			VotesCount: 0,
			Percentage: 0,
		}
	}

	poll := &model.Poll{
		ID:         pollID,
		CreatedBy:  req.CreatedBy,
		BoundaryID: req.BoundaryID,
		Type:       req.Type,
		Question:   req.Question,
		Options:    options,
		TotalVotes: 0,
		StartsAt:   startsAt,
		EndsAt:     endsAt,
		Active:     true,
		Visibility: visibility,
	}

	if err := s.repo.Create(ctx, poll); err != nil {
		logger.Error().Err(err).Msg("failed to create poll")
		return nil, err
	}

	logger.Info().Str("poll_id", poll.ID).Str("question", poll.Question).Int("options", len(options)).Msg("poll created")
	return poll, nil
}

// GetPoll returns a poll by ID.
func (s *PollService) GetPoll(ctx context.Context, id string) (*model.Poll, error) {
	poll, err := s.repo.GetByID(ctx, id)
	if err != nil {
		logger.Error().Err(err).Str("id", id).Msg("failed to get poll")
		return nil, err
	}
	return poll, nil
}

// CastVote records a user's vote on a poll. Enforces:
// - Poll must be active
// - One person, one vote (unique constraint on poll_id + user_id)
func (s *PollService) CastVote(ctx context.Context, pollID string, req model.CastVoteRequest) error {
	// Verify poll exists and is active.
	poll, err := s.repo.GetByID(ctx, pollID)
	if err != nil {
		return fmt.Errorf("poll not found: %w", err)
	}

	if !poll.Active {
		return fmt.Errorf("poll is closed")
	}

	now := time.Now().UTC()
	if now.Before(poll.StartsAt) {
		return fmt.Errorf("poll has not started yet")
	}
	if now.After(poll.EndsAt) {
		return fmt.Errorf("poll has ended")
	}

	// Check if user already voted.
	voted, err := s.repo.HasVoted(ctx, pollID, req.UserID)
	if err != nil {
		return fmt.Errorf("failed to check vote status: %w", err)
	}
	if voted {
		return fmt.Errorf("user has already voted on this poll")
	}

	// Validate that the option belongs to this poll.
	validOption := false
	for _, opt := range poll.Options {
		if opt.ID == req.OptionID {
			validOption = true
			break
		}
	}
	if !validOption {
		return fmt.Errorf("invalid option_id for this poll")
	}

	vote := &model.PollVote{
		PollID:   pollID,
		UserID:   req.UserID,
		OptionID: req.OptionID,
		VotedAt:  now,
	}

	if err := s.repo.CreateVote(ctx, vote); err != nil {
		logger.Error().Err(err).Str("poll_id", pollID).Str("user_id", req.UserID).Msg("failed to cast vote")
		return err
	}

	logger.Info().Str("poll_id", pollID).Str("user_id", req.UserID).Str("option_id", req.OptionID).Msg("vote cast")
	return nil
}

// RetractVote removes a user's vote from a poll.
func (s *PollService) RetractVote(ctx context.Context, pollID, userID string) error {
	// Verify poll exists and is still active.
	poll, err := s.repo.GetByID(ctx, pollID)
	if err != nil {
		return fmt.Errorf("poll not found: %w", err)
	}
	if !poll.Active {
		return fmt.Errorf("cannot retract vote on a closed poll")
	}

	// Check the user actually voted.
	voted, err := s.repo.HasVoted(ctx, pollID, userID)
	if err != nil {
		return fmt.Errorf("failed to check vote status: %w", err)
	}
	if !voted {
		return fmt.Errorf("no vote to retract")
	}

	if err := s.repo.RetractVote(ctx, pollID, userID); err != nil {
		logger.Error().Err(err).Str("poll_id", pollID).Str("user_id", userID).Msg("failed to retract vote")
		return err
	}

	logger.Info().Str("poll_id", pollID).Str("user_id", userID).Msg("vote retracted")
	return nil
}

// GetResults returns the poll with computed percentages.
func (s *PollService) GetResults(ctx context.Context, pollID string) (*model.Poll, error) {
	poll, err := s.repo.GetResults(ctx, pollID)
	if err != nil {
		logger.Error().Err(err).Str("poll_id", pollID).Msg("failed to get results")
		return nil, err
	}
	return poll, nil
}

// GetByBoundary returns all polls within a boundary.
func (s *PollService) GetByBoundary(ctx context.Context, boundaryID string) ([]model.Poll, error) {
	polls, err := s.repo.GetByBoundaryID(ctx, boundaryID)
	if err != nil {
		logger.Error().Err(err).Str("boundary_id", boundaryID).Msg("failed to get polls by boundary")
		return nil, err
	}

	if polls == nil {
		polls = []model.Poll{}
	}
	return polls, nil
}

// ListPolls returns all polls formatted for the frontend.
func (s *PollService) ListPolls(ctx context.Context, userID string) ([]model.PollListResponse, error) {
	polls, err := s.repo.ListAll(ctx, userID)
	if err != nil {
		logger.Error().Err(err).Msg("failed to list polls")
		return nil, err
	}
	return polls, nil
}

// ClosePoll deactivates a poll so no more votes can be cast.
func (s *PollService) ClosePoll(ctx context.Context, pollID string) error {
	if err := s.repo.ClosePoll(ctx, pollID); err != nil {
		logger.Error().Err(err).Str("poll_id", pollID).Msg("failed to close poll")
		return err
	}

	logger.Info().Str("poll_id", pollID).Msg("poll closed")
	return nil
}

// DeletePoll removes a poll and all associated data.
func (s *PollService) DeletePoll(ctx context.Context, pollID string) error {
	if err := s.repo.Delete(ctx, pollID); err != nil {
		logger.Error().Err(err).Str("poll_id", pollID).Msg("failed to delete poll")
		return err
	}

	logger.Info().Str("poll_id", pollID).Msg("poll deleted")
	return nil
}

// ---------------------------------------------------------------------------
// Participatory Budgeting
// ---------------------------------------------------------------------------

// currentFiscalYear returns the Indian fiscal year string, e.g. "2026-27".
func currentFiscalYear() string {
	now := time.Now().UTC()
	year := now.Year()
	month := now.Month()
	// Indian fiscal year runs April to March
	if month < 4 {
		year--
	}
	return fmt.Sprintf("%d-%02d", year, (year+1)%100)
}

// ListBudgetProposals returns budget proposals for a boundary (current fiscal year).
func (s *PollService) ListBudgetProposals(ctx context.Context, boundaryID, userID string) ([]model.BudgetProposalResponse, error) {
	fy := currentFiscalYear()

	proposals, err := s.repo.ListBudgetProposals(ctx, boundaryID, fy)
	if err != nil {
		logger.Error().Err(err).Str("boundary_id", boundaryID).Msg("failed to list budget proposals")
		return nil, err
	}

	// Get user's existing votes if authenticated
	var userVotes map[string]int16
	if userID != "" {
		userVotes, err = s.repo.GetUserBudgetVotes(ctx, userID, boundaryID, fy)
		if err != nil {
			logger.Error().Err(err).Str("user_id", userID).Msg("failed to get user budget votes")
			// Non-fatal — continue without vote data
			userVotes = make(map[string]int16)
		}
	}

	responses := make([]model.BudgetProposalResponse, 0, len(proposals))
	for _, p := range proposals {
		resp := model.BudgetProposalResponse{
			ID:              p.ID,
			Title:           p.Title,
			Description:     p.Description,
			Category:        p.Category,
			RequestedAmount: p.RequestedAmount,
			FiscalYear:      p.FiscalYear,
			Status:          p.Status,
			CreatedBy:       p.CreatedBy,
			CreatedAt:       p.CreatedAt,
			UserAllocation:  0,
		}
		if pct, ok := userVotes[p.ID]; ok {
			resp.UserAllocation = pct
		}
		responses = append(responses, resp)
	}

	return responses, nil
}

// SubmitBudgetVote validates and submits a budget allocation vote.
func (s *PollService) SubmitBudgetVote(ctx context.Context, boundaryID, userID string, req model.BudgetVoteRequest) error {
	if len(req.Allocations) == 0 {
		return fmt.Errorf("at least one allocation is required")
	}

	// Verify allocations sum to 100
	var total int16
	for _, alloc := range req.Allocations {
		if alloc.AllocationPct < 0 || alloc.AllocationPct > 100 {
			return fmt.Errorf("allocation_pct must be between 0 and 100")
		}
		total += alloc.AllocationPct
	}
	if total != 100 {
		return fmt.Errorf("allocations must sum to 100, got %d", total)
	}

	if err := s.repo.SubmitBudgetVotes(ctx, userID, req.Allocations); err != nil {
		logger.Error().Err(err).Str("user_id", userID).Str("boundary_id", boundaryID).Msg("failed to submit budget votes")
		return err
	}

	logger.Info().Str("user_id", userID).Str("boundary_id", boundaryID).Int("allocations", len(req.Allocations)).Msg("budget vote submitted")
	return nil
}

// GetBudgetResults returns aggregated budget results for a boundary.
func (s *PollService) GetBudgetResults(ctx context.Context, boundaryID string) (*model.BudgetResults, error) {
	fy := currentFiscalYear()

	results, err := s.repo.GetBudgetResults(ctx, boundaryID, fy)
	if err != nil {
		logger.Error().Err(err).Str("boundary_id", boundaryID).Msg("failed to get budget results")
		return nil, err
	}

	if results.Proposals == nil {
		results.Proposals = []model.BudgetProposalResult{}
	}

	return results, nil
}

func generateID() string {
	return time.Now().UTC().Format("20060102150405.000000")
}
