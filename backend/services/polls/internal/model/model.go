package model

import "time"

// PollType defines the kind of poll.
type PollType string

const (
	PollTypeConstituency  PollType = "constituency"
	PollTypeBudget        PollType = "budget"
	PollTypeSatisfaction  PollType = "satisfaction"
	PollTypeExit          PollType = "exit"
	PollTypeCustom        PollType = "custom"
)

// Poll represents a democratic poll or vote.
type Poll struct {
	ID         string       `json:"id" db:"id"`
	CreatedBy  string       `json:"created_by" db:"created_by"`
	BoundaryID string       `json:"boundary_id" db:"boundary_id"`
	Type       PollType     `json:"type" db:"type"`
	Question   string       `json:"question" db:"question"`
	Options    []PollOption `json:"options"`
	TotalVotes int          `json:"total_votes" db:"total_votes"`
	StartsAt   time.Time    `json:"starts_at" db:"starts_at"`
	EndsAt     time.Time    `json:"ends_at" db:"ends_at"`
	Active     bool         `json:"active" db:"active"`
	Visibility string       `json:"visibility" db:"visibility"`
}

// PollOption represents a single selectable option in a poll.
type PollOption struct {
	ID         string  `json:"id" db:"id"`
	PollID     string  `json:"poll_id" db:"poll_id"`
	Label      string  `json:"label" db:"label"`
	VotesCount int     `json:"votes_count" db:"votes_count"`
	Percentage float64 `json:"percentage" db:"percentage"`
}

// PollVote records a single user's vote on a poll.
// One person, one vote is enforced by a unique constraint on (poll_id, user_id).
type PollVote struct {
	PollID   string    `json:"poll_id" db:"poll_id"`
	UserID   string    `json:"user_id" db:"user_id"`
	OptionID string    `json:"option_id" db:"option_id"`
	VotedAt  time.Time `json:"voted_at" db:"voted_at"`
}

// CreatePollRequest is the payload for creating a new poll.
type CreatePollRequest struct {
	CreatedBy  string   `json:"created_by" binding:"required"`
	BoundaryID string   `json:"boundary_id" binding:"required"`
	Type       PollType `json:"type" binding:"required"`
	Question   string   `json:"question" binding:"required"`
	Options    []string `json:"options" binding:"required,min=2"`
	StartsAt   string   `json:"starts_at" binding:"required"`
	EndsAt     string   `json:"ends_at" binding:"required"`
	Visibility string   `json:"visibility"`
}

// CastVoteRequest is the payload for casting a vote.
type CastVoteRequest struct {
	UserID   string `json:"user_id" binding:"required"`
	OptionID string `json:"option_id" binding:"required"`
}

// PollOptionResponse is the frontend-facing shape for a poll option.
type PollOptionResponse struct {
	ID         string  `json:"id"`
	Text       string  `json:"text"`
	Votes      int     `json:"votes"`
	Percentage float64 `json:"percentage"`
}

// ---------------------------------------------------------------------------
// Participatory Budgeting models
// ---------------------------------------------------------------------------

// BudgetCategory defines allowed budget proposal categories.
type BudgetCategory string

const (
	BudgetCategoryInfrastructure BudgetCategory = "infrastructure"
	BudgetCategoryEducation      BudgetCategory = "education"
	BudgetCategoryHealthcare     BudgetCategory = "healthcare"
	BudgetCategorySanitation     BudgetCategory = "sanitation"
	BudgetCategoryEnvironment    BudgetCategory = "environment"
	BudgetCategorySafety         BudgetCategory = "safety"
	BudgetCategoryRecreation     BudgetCategory = "recreation"
	BudgetCategoryOther          BudgetCategory = "other"
)

// BudgetProposal represents a single budget proposal for a ward.
type BudgetProposal struct {
	ID              string         `json:"id" db:"id"`
	BoundaryID      string         `json:"boundary_id" db:"boundary_id"`
	Title           string         `json:"title" db:"title"`
	Description     string         `json:"description" db:"description"`
	Category        BudgetCategory `json:"category" db:"category"`
	RequestedAmount int64          `json:"requested_amount" db:"requested_amount"` // in paisa
	FiscalYear      string         `json:"fiscal_year" db:"fiscal_year"`
	Status          string         `json:"status" db:"status"`
	CreatedBy       string         `json:"created_by" db:"created_by"`
	CreatedAt       time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at" db:"updated_at"`
}

// BudgetVote records a single user's allocation vote on a budget proposal.
type BudgetVote struct {
	ID            string    `json:"id" db:"id"`
	UserID        string    `json:"user_id" db:"user_id"`
	ProposalID    string    `json:"proposal_id" db:"proposal_id"`
	AllocationPct int16     `json:"allocation_pct" db:"allocation_pct"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

// BudgetAllocation is a single item in a vote request — one proposal + pct.
type BudgetAllocation struct {
	ProposalID    string `json:"proposal_id" binding:"required"`
	AllocationPct int16  `json:"allocation_pct" binding:"required,min=0,max=100"`
}

// BudgetVoteRequest is the payload for submitting a budget allocation vote.
type BudgetVoteRequest struct {
	Allocations []BudgetAllocation `json:"allocations" binding:"required,min=1"`
}

// BudgetProposalResult holds the aggregated result for a single proposal.
type BudgetProposalResult struct {
	ProposalID      string  `json:"proposal_id"`
	Title           string  `json:"title"`
	Category        string  `json:"category"`
	RequestedAmount int64   `json:"requested_amount"`
	AvgAllocation   float64 `json:"avg_allocation"`
	TotalVoters     int     `json:"total_voters"`
}

// BudgetResults holds the full aggregated results for a boundary's budget cycle.
type BudgetResults struct {
	BoundaryID  string                 `json:"boundary_id"`
	FiscalYear  string                 `json:"fiscal_year"`
	TotalVoters int                    `json:"total_voters"`
	Proposals   []BudgetProposalResult `json:"proposals"`
}

// BudgetProposalResponse is the frontend-facing shape for a budget proposal.
type BudgetProposalResponse struct {
	ID              string         `json:"id"`
	Title           string         `json:"title"`
	Description     string         `json:"description"`
	Category        BudgetCategory `json:"category"`
	RequestedAmount int64          `json:"requestedAmount"`
	FiscalYear      string         `json:"fiscalYear"`
	Status          string         `json:"status"`
	CreatedBy       string         `json:"createdBy"`
	CreatedAt       time.Time      `json:"createdAt"`
	// Set after checking vote status
	UserAllocation int16 `json:"userAllocation"`
}

// PollListResponse is the frontend-facing shape for a poll in the list endpoint.
type PollListResponse struct {
	ID               string               `json:"id"`
	Title            string               `json:"title"`
	Description      string               `json:"description"`
	Category         PollType             `json:"category"`
	Ward             string               `json:"ward"`
	Constituency     string               `json:"constituency"`
	Options          []PollOptionResponse `json:"options"`
	TotalVotes       int                  `json:"totalVotes"`
	HasVoted         bool                 `json:"hasVoted"`
	SelectedOptionID string               `json:"selectedOptionId"`
	CreatedBy        string               `json:"createdBy"`
	CreatedByName    string               `json:"createdByName"`
	ExpiresAt        time.Time            `json:"expiresAt"`
	CreatedAt        time.Time            `json:"createdAt"`
	IsActive         bool                 `json:"isActive"`
}
