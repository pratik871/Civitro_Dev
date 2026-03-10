package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/civitro/pkg/events"
	"github.com/civitro/pkg/logger"
	"github.com/civitro/services/ledger/internal/model"
	"github.com/civitro/services/ledger/internal/repository"
)

// LedgerService contains business logic for the public work ledger.
// All operations are append-only -- entries are never updated or deleted.
type LedgerService struct {
	repo     *repository.LedgerRepository
	producer *events.Producer
}

// NewLedgerService creates a new LedgerService.
func NewLedgerService(repo *repository.LedgerRepository, producer *events.Producer) *LedgerService {
	return &LedgerService{
		repo:     repo,
		producer: producer,
	}
}

// GetTimeline returns the full, chronologically ordered timeline for an issue.
func (s *LedgerService) GetTimeline(ctx context.Context, issueID string) (*model.IssueTimeline, error) {
	entries, err := s.repo.GetByIssueID(ctx, issueID)
	if err != nil {
		logger.Error().Err(err).Str("issue_id", issueID).Msg("failed to get timeline")
		return nil, err
	}

	if entries == nil {
		entries = []model.LedgerEntry{}
	}

	return &model.IssueTimeline{
		IssueID: issueID,
		Entries: entries,
	}, nil
}

// AppendEntry creates a new immutable ledger entry. This is the only write operation --
// entries can never be updated or deleted after creation.
func (s *LedgerService) AppendEntry(ctx context.Context, req model.CreateEntryRequest) (*model.LedgerEntry, error) {
	entry := &model.LedgerEntry{
		ID:              generateID(),
		IssueID:         req.IssueID,
		Status:          req.Status,
		ChangedByUserID: req.ChangedByUserID,
		ChangedByRole:   req.ChangedByRole,
		Detail:          req.Detail,
		EvidenceURLs:    req.EvidenceURLs,
		Timestamp:       time.Now().UTC(),
	}

	if entry.EvidenceURLs == nil {
		entry.EvidenceURLs = []string{}
	}

	if err := s.repo.Create(ctx, entry); err != nil {
		logger.Error().Err(err).Str("issue_id", req.IssueID).Msg("failed to append ledger entry")
		return nil, err
	}

	// Publish event for downstream consumers (e.g., notifications, rating updates).
	if s.producer != nil {
		payload, _ := json.Marshal(map[string]interface{}{
			"entry_id": entry.ID,
			"issue_id": entry.IssueID,
			"status":   entry.Status,
			"actor":    entry.ChangedByUserID,
			"role":     entry.ChangedByRole,
		})
		_ = s.producer.Publish(ctx, events.TopicIssueStatusUpdated, entry.IssueID, payload)
	}

	logger.Info().
		Str("entry_id", entry.ID).
		Str("issue_id", entry.IssueID).
		Str("status", entry.Status).
		Msg("ledger entry appended")
	return entry, nil
}

// GetEntry returns a single ledger entry by ID.
func (s *LedgerService) GetEntry(ctx context.Context, id string) (*model.LedgerEntry, error) {
	entry, err := s.repo.GetByID(ctx, id)
	if err != nil {
		logger.Error().Err(err).Str("id", id).Msg("failed to get ledger entry")
		return nil, err
	}
	return entry, nil
}

// generateID produces a time-sortable unique identifier.
func generateID() string {
	return time.Now().UTC().Format("20060102150405.000000")
}
