package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/civitro/services/polls/internal/model"
)

// PollRepository handles persistence for polls, options, and votes.
type PollRepository struct {
	db *pgxpool.Pool
}

// NewPollRepository creates a new PollRepository.
func NewPollRepository(db *pgxpool.Pool) *PollRepository {
	return &PollRepository{db: db}
}

// Create inserts a new poll and its options in a transaction.
func (r *PollRepository) Create(ctx context.Context, poll *model.Poll) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	pollQuery := `
		INSERT INTO polls (id, created_by, boundary_id, type, question, total_votes,
		                   starts_at, ends_at, active, visibility)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err = tx.Exec(ctx, pollQuery,
		poll.ID, poll.CreatedBy, poll.BoundaryID, poll.Type, poll.Question,
		poll.TotalVotes, poll.StartsAt, poll.EndsAt, poll.Active, poll.Visibility,
	)
	if err != nil {
		return err
	}

	optionQuery := `
		INSERT INTO poll_options (id, poll_id, label, votes_count, sort_order)
		VALUES ($1, $2, $3, $4, $5)`

	for i, opt := range poll.Options {
		_, err = tx.Exec(ctx, optionQuery,
			opt.ID, poll.ID, opt.Label, opt.VotesCount, int16(i+1),
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// GetByID returns a poll with its options.
func (r *PollRepository) GetByID(ctx context.Context, id string) (*model.Poll, error) {
	pollQuery := `
		SELECT id, created_by, COALESCE(boundary_id::text, ''), type, question, total_votes,
		       starts_at, ends_at, active, COALESCE(visibility, 'public')
		FROM polls
		WHERE id = $1`

	var poll model.Poll
	err := r.db.QueryRow(ctx, pollQuery, id).Scan(
		&poll.ID, &poll.CreatedBy, &poll.BoundaryID, &poll.Type, &poll.Question,
		&poll.TotalVotes, &poll.StartsAt, &poll.EndsAt, &poll.Active, &poll.Visibility,
	)
	if err != nil {
		return nil, err
	}

	// Fetch options.
	optQuery := `
		SELECT id, poll_id, label, votes_count, sort_order
		FROM poll_options
		WHERE poll_id = $1
		ORDER BY sort_order, id`

	rows, err := r.db.Query(ctx, optQuery, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var opt model.PollOption
		var sortOrder int16
		if err := rows.Scan(&opt.ID, &opt.PollID, &opt.Label, &opt.VotesCount, &sortOrder); err != nil {
			return nil, err
		}
		// Compute percentage
		if poll.TotalVotes > 0 {
			opt.Percentage = float64(opt.VotesCount) / float64(poll.TotalVotes) * 100
		}
		poll.Options = append(poll.Options, opt)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &poll, nil
}

// CreateVote records a vote. The unique constraint on (poll_id, user_id) enforces
// one person, one vote.
func (r *PollRepository) CreateVote(ctx context.Context, vote *model.PollVote) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Insert vote — will fail with unique violation if user already voted.
	voteQuery := `
		INSERT INTO poll_votes (poll_id, user_id, option_id, voted_at)
		VALUES ($1, $2, $3, $4)`

	_, err = tx.Exec(ctx, voteQuery, vote.PollID, vote.UserID, vote.OptionID, vote.VotedAt)
	if err != nil {
		return fmt.Errorf("vote failed (you may have already voted): %w", err)
	}

	// Increment option vote count.
	_, err = tx.Exec(ctx,
		`UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = $1 AND poll_id = $2`,
		vote.OptionID, vote.PollID,
	)
	if err != nil {
		return err
	}

	// Increment total votes on poll.
	_, err = tx.Exec(ctx,
		`UPDATE polls SET total_votes = total_votes + 1 WHERE id = $1`,
		vote.PollID,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// HasVoted checks if a user has already voted on a poll.
func (r *PollRepository) HasVoted(ctx context.Context, pollID, userID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM poll_votes WHERE poll_id = $1 AND user_id = $2)`

	var exists bool
	err := r.db.QueryRow(ctx, query, pollID, userID).Scan(&exists)
	return exists, err
}

// RetractVote removes a user's vote from a poll and decrements counts.
func (r *PollRepository) RetractVote(ctx context.Context, pollID, userID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Find which option the user voted for.
	var optionID string
	err = tx.QueryRow(ctx,
		`SELECT option_id FROM poll_votes WHERE poll_id = $1 AND user_id = $2`,
		pollID, userID,
	).Scan(&optionID)
	if err != nil {
		return fmt.Errorf("vote not found")
	}

	// Delete the vote.
	_, err = tx.Exec(ctx,
		`DELETE FROM poll_votes WHERE poll_id = $1 AND user_id = $2`,
		pollID, userID,
	)
	if err != nil {
		return err
	}

	// Decrement option vote count.
	_, err = tx.Exec(ctx,
		`UPDATE poll_options SET votes_count = GREATEST(votes_count - 1, 0) WHERE id = $1 AND poll_id = $2`,
		optionID, pollID,
	)
	if err != nil {
		return err
	}

	// Decrement total votes on poll.
	_, err = tx.Exec(ctx,
		`UPDATE polls SET total_votes = GREATEST(total_votes - 1, 0) WHERE id = $1`,
		pollID,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// GetResults returns a poll with updated percentages for each option.
func (r *PollRepository) GetResults(ctx context.Context, pollID string) (*model.Poll, error) {
	poll, err := r.GetByID(ctx, pollID)
	if err != nil {
		return nil, err
	}

	// Calculate percentages.
	if poll.TotalVotes > 0 {
		for i := range poll.Options {
			poll.Options[i].Percentage = float64(poll.Options[i].VotesCount) / float64(poll.TotalVotes) * 100
		}
	}

	return poll, nil
}

// GetByBoundaryID returns all polls for a boundary, optionally filtered by active status.
func (r *PollRepository) GetByBoundaryID(ctx context.Context, boundaryID string) ([]model.Poll, error) {
	query := `
		SELECT id, created_by, COALESCE(boundary_id::text, ''), type, question, total_votes,
		       starts_at, ends_at, active, COALESCE(visibility, 'public')
		FROM polls
		WHERE boundary_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query, boundaryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var polls []model.Poll
	for rows.Next() {
		var p model.Poll
		if err := rows.Scan(
			&p.ID, &p.CreatedBy, &p.BoundaryID, &p.Type, &p.Question,
			&p.TotalVotes, &p.StartsAt, &p.EndsAt, &p.Active, &p.Visibility,
		); err != nil {
			return nil, err
		}
		polls = append(polls, p)
	}
	return polls, rows.Err()
}

// ListAll returns all polls with their options, ordered by created_at DESC.
// For each poll, it checks whether the given userID has voted and which option was selected.
func (r *PollRepository) ListAll(ctx context.Context, userID string) ([]model.PollListResponse, error) {
	pollQuery := `
		SELECT p.id, p.created_by, COALESCE(p.boundary_id::text, ''), p.type, p.question, p.total_votes,
		       p.starts_at, p.ends_at, p.active, COALESCE(p.visibility, 'public'), p.created_at
		FROM polls p
		ORDER BY p.created_at DESC`

	rows, err := r.db.Query(ctx, pollQuery)
	if err != nil {
		return nil, fmt.Errorf("list polls: %w", err)
	}
	defer rows.Close()

	var polls []model.PollListResponse
	var pollIDs []string
	pollIndex := make(map[string]int)

	for rows.Next() {
		var (
			id, createdBy, boundaryID, visibility string
			pollType                              model.PollType
			question                              string
			totalVotes                            int
			startsAt, endsAt, createdAt           time.Time
			active                                bool
		)
		if err := rows.Scan(
			&id, &createdBy, &boundaryID, &pollType, &question,
			&totalVotes, &startsAt, &endsAt, &active, &visibility, &createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan poll: %w", err)
		}

		resp := model.PollListResponse{
			ID:            id,
			Title:         question,
			Description:   "",
			Category:      pollType,
			Ward:          boundaryID,
			Constituency:  "",
			Options:       []model.PollOptionResponse{},
			TotalVotes:    totalVotes,
			HasVoted:      false,
			CreatedBy:     createdBy,
			CreatedByName: "",
			ExpiresAt:     endsAt,
			CreatedAt:     createdAt,
			IsActive:      active,
		}

		pollIndex[id] = len(polls)
		pollIDs = append(pollIDs, id)
		polls = append(polls, resp)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(pollIDs) == 0 {
		return []model.PollListResponse{}, nil
	}

	// Fetch options for all polls in one query.
	optQuery := `
		SELECT id, poll_id, label, votes_count
		FROM poll_options
		WHERE poll_id = ANY($1)
		ORDER BY id`

	optRows, err := r.db.Query(ctx, optQuery, pollIDs)
	if err != nil {
		return nil, fmt.Errorf("list poll options: %w", err)
	}
	defer optRows.Close()

	for optRows.Next() {
		var optID, pollID, label string
		var votesCount int
		if err := optRows.Scan(&optID, &pollID, &label, &votesCount); err != nil {
			return nil, fmt.Errorf("scan option: %w", err)
		}

		idx, ok := pollIndex[pollID]
		if !ok {
			continue
		}

		pct := float64(0)
		if polls[idx].TotalVotes > 0 {
			pct = float64(votesCount) / float64(polls[idx].TotalVotes) * 100
		}

		polls[idx].Options = append(polls[idx].Options, model.PollOptionResponse{
			ID:         optID,
			Text:       label,
			Votes:      votesCount,
			Percentage: pct,
		})
	}
	if err := optRows.Err(); err != nil {
		return nil, err
	}

	// If a userID was provided, check which polls the user has voted on.
	if userID != "" {
		voteQuery := `
			SELECT poll_id, option_id
			FROM poll_votes
			WHERE user_id = $1 AND poll_id = ANY($2)`

		voteRows, err := r.db.Query(ctx, voteQuery, userID, pollIDs)
		if err != nil {
			return nil, fmt.Errorf("list user votes: %w", err)
		}
		defer voteRows.Close()

		for voteRows.Next() {
			var pollID, optionID string
			if err := voteRows.Scan(&pollID, &optionID); err != nil {
				return nil, fmt.Errorf("scan vote: %w", err)
			}
			if idx, ok := pollIndex[pollID]; ok {
				polls[idx].HasVoted = true
				polls[idx].SelectedOptionID = optionID
			}
		}
		if err := voteRows.Err(); err != nil {
			return nil, err
		}
	}

	return polls, nil
}

// Delete removes a poll and its associated options and votes.
func (r *PollRepository) Delete(ctx context.Context, pollID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Delete in dependency order.
	if _, err := tx.Exec(ctx, `DELETE FROM poll_votes WHERE poll_id = $1`, pollID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM poll_options WHERE poll_id = $1`, pollID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM polls WHERE id = $1`, pollID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// ClosePoll deactivates a poll by setting active = false.
func (r *PollRepository) ClosePoll(ctx context.Context, pollID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE polls SET active = false, ends_at = $1 WHERE id = $2`,
		time.Now().UTC(), pollID,
	)
	return err
}

// ---------------------------------------------------------------------------
// Participatory Budgeting
// ---------------------------------------------------------------------------

// ListBudgetProposals returns all budget proposals for a boundary in the current fiscal year.
func (r *PollRepository) ListBudgetProposals(ctx context.Context, boundaryID, fiscalYear string) ([]model.BudgetProposal, error) {
	query := `
		SELECT id, boundary_id, title, COALESCE(description, ''), category,
		       requested_amount, fiscal_year, status,
		       COALESCE(created_by::text, ''), created_at, updated_at
		FROM budget_proposals
		WHERE boundary_id = $1 AND fiscal_year = $2
		ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query, boundaryID, fiscalYear)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var proposals []model.BudgetProposal
	for rows.Next() {
		var p model.BudgetProposal
		if err := rows.Scan(
			&p.ID, &p.BoundaryID, &p.Title, &p.Description, &p.Category,
			&p.RequestedAmount, &p.FiscalYear, &p.Status,
			&p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		proposals = append(proposals, p)
	}
	return proposals, rows.Err()
}

// GetUserBudgetVotes returns all budget votes for a user in a given boundary + fiscal year.
func (r *PollRepository) GetUserBudgetVotes(ctx context.Context, userID, boundaryID, fiscalYear string) (map[string]int16, error) {
	query := `
		SELECT bv.proposal_id, bv.allocation_pct
		FROM budget_votes bv
		JOIN budget_proposals bp ON bp.id = bv.proposal_id
		WHERE bv.user_id = $1 AND bp.boundary_id = $2 AND bp.fiscal_year = $3`

	rows, err := r.db.Query(ctx, query, userID, boundaryID, fiscalYear)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]int16)
	for rows.Next() {
		var proposalID string
		var pct int16
		if err := rows.Scan(&proposalID, &pct); err != nil {
			return nil, err
		}
		result[proposalID] = pct
	}
	return result, rows.Err()
}

// SubmitBudgetVotes upserts budget votes for a user in a transaction.
func (r *PollRepository) SubmitBudgetVotes(ctx context.Context, userID string, allocations []model.BudgetAllocation) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	upsertQuery := `
		INSERT INTO budget_votes (user_id, proposal_id, allocation_pct)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, proposal_id) DO UPDATE
			SET allocation_pct = EXCLUDED.allocation_pct`

	for _, alloc := range allocations {
		_, err := tx.Exec(ctx, upsertQuery, userID, alloc.ProposalID, alloc.AllocationPct)
		if err != nil {
			return fmt.Errorf("failed to upsert vote for proposal %s: %w", alloc.ProposalID, err)
		}
	}

	return tx.Commit(ctx)
}

// GetBudgetResults returns aggregated budget results for a boundary.
func (r *PollRepository) GetBudgetResults(ctx context.Context, boundaryID, fiscalYear string) (*model.BudgetResults, error) {
	// Get total unique voters for this boundary's budget
	voterQuery := `
		SELECT COUNT(DISTINCT bv.user_id)
		FROM budget_votes bv
		JOIN budget_proposals bp ON bp.id = bv.proposal_id
		WHERE bp.boundary_id = $1 AND bp.fiscal_year = $2`

	var totalVoters int
	if err := r.db.QueryRow(ctx, voterQuery, boundaryID, fiscalYear).Scan(&totalVoters); err != nil {
		return nil, err
	}

	// Get per-proposal aggregated results
	resultQuery := `
		SELECT bp.id, bp.title, bp.category, bp.requested_amount,
		       COALESCE(AVG(bv.allocation_pct), 0) AS avg_allocation,
		       COUNT(DISTINCT bv.user_id) AS total_voters
		FROM budget_proposals bp
		LEFT JOIN budget_votes bv ON bv.proposal_id = bp.id
		WHERE bp.boundary_id = $1 AND bp.fiscal_year = $2
		GROUP BY bp.id, bp.title, bp.category, bp.requested_amount
		ORDER BY avg_allocation DESC`

	rows, err := r.db.Query(ctx, resultQuery, boundaryID, fiscalYear)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var proposals []model.BudgetProposalResult
	for rows.Next() {
		var pr model.BudgetProposalResult
		if err := rows.Scan(
			&pr.ProposalID, &pr.Title, &pr.Category, &pr.RequestedAmount,
			&pr.AvgAllocation, &pr.TotalVoters,
		); err != nil {
			return nil, err
		}
		proposals = append(proposals, pr)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &model.BudgetResults{
		BoundaryID:  boundaryID,
		FiscalYear:  fiscalYear,
		TotalVoters: totalVoters,
		Proposals:   proposals,
	}, nil
}
