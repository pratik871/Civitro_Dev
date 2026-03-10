package model

import "time"

// LedgerEntry represents an immutable, append-only record of an action taken on an issue.
// Think of it as a "commit" in a governance version-control system.
type LedgerEntry struct {
	ID              string    `json:"id" db:"id"`
	IssueID         string    `json:"issue_id" db:"issue_id"`
	Status          string    `json:"status" db:"status"`
	ChangedByUserID string    `json:"changed_by_user_id" db:"changed_by_user_id"`
	ChangedByRole   string    `json:"changed_by_role" db:"changed_by_role"`
	Detail          string    `json:"detail" db:"detail"`
	EvidenceURLs    []string  `json:"evidence_urls" db:"evidence_urls"`
	Timestamp       time.Time `json:"timestamp" db:"timestamp"`
}

// IssueTimeline is the full, ordered history of ledger entries for a single issue.
type IssueTimeline struct {
	IssueID string        `json:"issue_id"`
	Entries []LedgerEntry `json:"entries"`
}

// CreateEntryRequest is the payload for appending a new ledger entry.
type CreateEntryRequest struct {
	IssueID         string   `json:"issue_id" binding:"required"`
	Status          string   `json:"status" binding:"required"`
	ChangedByUserID string   `json:"changed_by_user_id" binding:"required"`
	ChangedByRole   string   `json:"changed_by_role" binding:"required"`
	Detail          string   `json:"detail"`
	EvidenceURLs    []string `json:"evidence_urls"`
}
