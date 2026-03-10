package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/civitro/services/reputation/internal/model"
)

// ReputationRepository handles persistence for citizen reputation scores and events.
type ReputationRepository struct {
	db *pgxpool.Pool
}

// NewReputationRepository creates a new ReputationRepository.
func NewReputationRepository(db *pgxpool.Pool) *ReputationRepository {
	return &ReputationRepository{db: db}
}

// GetByUserID returns the civic score for a user.
func (r *ReputationRepository) GetByUserID(ctx context.Context, userID string) (*model.CivicScore, error) {
	query := `
		SELECT user_id, credibility_score, influence_score, tier,
		       reports_filed, reports_resolved, accuracy_rate, followers_count, updated_at
		FROM civic_scores
		WHERE user_id = $1`

	var cs model.CivicScore
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&cs.UserID, &cs.CredibilityScore, &cs.InfluenceScore, &cs.Tier,
		&cs.ReportsFiled, &cs.ReportsResolved, &cs.AccuracyRate,
		&cs.FollowersCount, &cs.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &cs, nil
}

// UpdateScore updates the civic score for a user, including recalculating the tier.
func (r *ReputationRepository) UpdateScore(ctx context.Context, cs *model.CivicScore) error {
	query := `
		INSERT INTO civic_scores (user_id, credibility_score, influence_score, tier,
		                          reports_filed, reports_resolved, accuracy_rate,
		                          followers_count, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (user_id) DO UPDATE SET
		    credibility_score = EXCLUDED.credibility_score,
		    influence_score = EXCLUDED.influence_score,
		    tier = EXCLUDED.tier,
		    reports_filed = EXCLUDED.reports_filed,
		    reports_resolved = EXCLUDED.reports_resolved,
		    accuracy_rate = EXCLUDED.accuracy_rate,
		    followers_count = EXCLUDED.followers_count,
		    updated_at = EXCLUDED.updated_at`

	_, err := r.db.Exec(ctx, query,
		cs.UserID, cs.CredibilityScore, cs.InfluenceScore, cs.Tier,
		cs.ReportsFiled, cs.ReportsResolved, cs.AccuracyRate,
		cs.FollowersCount, cs.UpdatedAt,
	)
	return err
}

// CreateEvent inserts a new score event record.
func (r *ReputationRepository) CreateEvent(ctx context.Context, event *model.ScoreEvent) error {
	query := `
		INSERT INTO score_events (id, user_id, event_type, points, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := r.db.Exec(ctx, query,
		event.ID, event.UserID, event.EventType,
		event.Points, event.Reason, event.CreatedAt,
	)
	return err
}

// GetEventsByUserID returns score events for a user, ordered by most recent first.
func (r *ReputationRepository) GetEventsByUserID(ctx context.Context, userID string) ([]model.ScoreEvent, error) {
	query := `
		SELECT id, user_id, event_type, points, reason, created_at
		FROM score_events
		WHERE user_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []model.ScoreEvent
	for rows.Next() {
		var e model.ScoreEvent
		if err := rows.Scan(
			&e.ID, &e.UserID, &e.EventType, &e.Points, &e.Reason, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

// GetLeaderboard returns the top civic scores within a boundary, ordered by
// credibility score descending.
func (r *ReputationRepository) GetLeaderboard(ctx context.Context, boundaryID string) ([]model.CivicScore, error) {
	query := `
		SELECT cs.user_id, cs.credibility_score, cs.influence_score, cs.tier,
		       cs.reports_filed, cs.reports_resolved, cs.accuracy_rate,
		       cs.followers_count, cs.updated_at
		FROM civic_scores cs
		INNER JOIN users u ON u.id = cs.user_id
		WHERE u.boundary_id = $1
		ORDER BY cs.credibility_score DESC
		LIMIT 100`

	rows, err := r.db.Query(ctx, query, boundaryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scores []model.CivicScore
	for rows.Next() {
		var cs model.CivicScore
		if err := rows.Scan(
			&cs.UserID, &cs.CredibilityScore, &cs.InfluenceScore, &cs.Tier,
			&cs.ReportsFiled, &cs.ReportsResolved, &cs.AccuracyRate,
			&cs.FollowersCount, &cs.UpdatedAt,
		); err != nil {
			return nil, err
		}
		scores = append(scores, cs)
	}
	return scores, rows.Err()
}
