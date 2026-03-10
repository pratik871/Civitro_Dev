package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/civitro/services/ledger/internal/model"
)

// LedgerRepository handles persistence for immutable ledger entries.
// IMPORTANT: This repository only supports INSERT and SELECT operations.
// There are NO update or delete methods — ledger entries are append-only.
type LedgerRepository struct {
	db *pgxpool.Pool
}

// NewLedgerRepository creates a new LedgerRepository.
func NewLedgerRepository(db *pgxpool.Pool) *LedgerRepository {
	return &LedgerRepository{db: db}
}

// GetByIssueID returns all ledger entries for a given issue, ordered by timestamp ascending.
func (r *LedgerRepository) GetByIssueID(ctx context.Context, issueID string) ([]model.LedgerEntry, error) {
	query := `
		SELECT id, issue_id, status, changed_by_user_id, changed_by_role,
		       detail, evidence_urls, timestamp
		FROM ledger_entries
		WHERE issue_id = $1
		ORDER BY timestamp ASC`

	rows, err := r.db.Query(ctx, query, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []model.LedgerEntry
	for rows.Next() {
		var e model.LedgerEntry
		if err := rows.Scan(
			&e.ID, &e.IssueID, &e.Status, &e.ChangedByUserID, &e.ChangedByRole,
			&e.Detail, &e.EvidenceURLs, &e.Timestamp,
		); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// Create inserts a new ledger entry. This is INSERT-only — no UPDATE or DELETE exists.
func (r *LedgerRepository) Create(ctx context.Context, entry *model.LedgerEntry) error {
	query := `
		INSERT INTO ledger_entries (id, issue_id, status, changed_by_user_id, changed_by_role,
		                            detail, evidence_urls, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := r.db.Exec(ctx, query,
		entry.ID, entry.IssueID, entry.Status, entry.ChangedByUserID, entry.ChangedByRole,
		entry.Detail, entry.EvidenceURLs, entry.Timestamp,
	)
	return err
}

// GetByID returns a single ledger entry by its ID.
func (r *LedgerRepository) GetByID(ctx context.Context, id string) (*model.LedgerEntry, error) {
	query := `
		SELECT id, issue_id, status, changed_by_user_id, changed_by_role,
		       detail, evidence_urls, timestamp
		FROM ledger_entries
		WHERE id = $1`

	var e model.LedgerEntry
	err := r.db.QueryRow(ctx, query, id).Scan(
		&e.ID, &e.IssueID, &e.Status, &e.ChangedByUserID, &e.ChangedByRole,
		&e.Detail, &e.EvidenceURLs, &e.Timestamp,
	)
	if err != nil {
		return nil, err
	}
	return &e, nil
}
