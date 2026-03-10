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
