package repository

import (
	"context"
	cryptorand "crypto/rand"
	"errors"
	"fmt"
	"time"

	"github.com/civitro/services/community-action/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository defines the data access interface for the community action service.
type Repository interface {
	Create(ctx context.Context, action *model.CommunityAction) error
	GetByID(ctx context.Context, id string) (*model.CommunityAction, error)
	ListByWard(ctx context.Context, wardID string, limit, offset int) ([]model.CommunityAction, int, error)
	AddSupporter(ctx context.Context, supporter *model.ActionSupporter) error
	RemoveSupporter(ctx context.Context, actionID, userID string) error
	HasSupported(ctx context.Context, actionID, userID string) (bool, error)
	GetSupportCount(ctx context.Context, actionID string) (int, error)
	AddEvidence(ctx context.Context, evidence *model.ActionEvidence) error
	ListEvidence(ctx context.Context, actionID string) ([]model.ActionEvidence, error)
	AddResponse(ctx context.Context, response *model.ActionResponse) error
	ListTimeline(ctx context.Context, actionID string) ([]model.TimelineEntry, error)
	AddVerification(ctx context.Context, verification *model.ActionVerification) error
	CountVerifications(ctx context.Context, actionID string) (int, error)
	UpdateStatus(ctx context.Context, id string, status model.ActionStatus) error
	UpdateSupportCount(ctx context.Context, id string, count int) error
	UpdateSupportGoal(ctx context.Context, actionID string, newGoal int) error
	ListTrending(ctx context.Context, limit int) ([]model.TrendingAction, error)
	UpdateEvidencePackage(ctx context.Context, id string, evidenceJSON interface{}) error
	GetUserCivicScore(ctx context.Context, userID string) (int, error)
	CountUserActionsInPeriod(ctx context.Context, userID string, since time.Time) (int, error)
	ListStaleActions(ctx context.Context, noResponseDays int) ([]model.CommunityAction, error)
	CreateEscalation(ctx context.Context, actionID, fromLevel, toLevel, reason string) error
	UpdateEscalationLevel(ctx context.Context, actionID, newLevel string) error
	UpdateEconomicImpact(ctx context.Context, actionID string, impact float64) error
	GetUserCivicScoreAndWard(ctx context.Context, userID string, wardID *string) error
	UpdatePatternStatus(ctx context.Context, patternID, actionID string) error
}

// ErrNotFound is returned when a record is not found.
var ErrNotFound = errors.New("record not found")

// ErrAlreadySupported is returned when a user tries to support an action twice.
var ErrAlreadySupported = errors.New("already supported")

// PostgresRepository implements Repository using PostgreSQL.
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository creates a new PostgresRepository.
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// Create inserts a new community action into the database.
func (r *PostgresRepository) Create(ctx context.Context, action *model.CommunityAction) error {
	query := `
		INSERT INTO community_actions (id, creator_id, ward_id, title, description,
		                                desired_outcome, target_authority_id, escalation_level,
		                                status, support_count, support_goal,
		                                evidence_package_json, economic_impact_estimate,
		                                pattern_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`

	var targetAuthorityID, patternID interface{}
	if action.TargetAuthorityID != "" {
		targetAuthorityID = action.TargetAuthorityID
	}
	if action.PatternID != "" {
		patternID = action.PatternID
	}

	_, err := r.pool.Exec(ctx, query,
		action.ID, action.CreatorID, action.WardID, action.Title, action.Description,
		action.DesiredOutcome, targetAuthorityID, action.EscalationLevel,
		action.Status, action.SupportCount, action.SupportGoal,
		action.EvidencePackageJSON, action.EconomicImpactEstimate,
		patternID, action.CreatedAt,
	)
	return err
}

// GetByID retrieves a community action by its ID, including evidence and recent responses.
func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*model.CommunityAction, error) {
	query := `
		SELECT id, creator_id, ward_id, title, description, desired_outcome,
		       COALESCE(target_authority_id::text, ''), escalation_level,
		       status, support_count, support_goal,
		       evidence_package_json, COALESCE(economic_impact_estimate, 0),
		       COALESCE(pattern_id::text, ''),
		       created_at, acknowledged_at, resolved_at, verified_at
		FROM community_actions WHERE id = $1
	`

	action := &model.CommunityAction{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&action.ID, &action.CreatorID, &action.WardID, &action.Title,
		&action.Description, &action.DesiredOutcome,
		&action.TargetAuthorityID, &action.EscalationLevel,
		&action.Status, &action.SupportCount, &action.SupportGoal,
		&action.EvidencePackageJSON, &action.EconomicImpactEstimate,
		&action.PatternID,
		&action.CreatedAt, &action.AcknowledgedAt, &action.ResolvedAt, &action.VerifiedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	// Load evidence
	action.Evidence, _ = r.ListEvidence(ctx, id)

	// Load recent responses (last 5)
	respQuery := `
		SELECT id, action_id, responder_id, response_type, content,
		       COALESCE(timeline_date::text, ''), created_at
		FROM action_responses WHERE action_id = $1
		ORDER BY created_at DESC LIMIT 5
	`
	rows, err := r.pool.Query(ctx, respQuery, id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var resp model.ActionResponse
			if err := rows.Scan(
				&resp.ID, &resp.ActionID, &resp.ResponderID, &resp.ResponseType,
				&resp.Content, &resp.TimelineDate, &resp.CreatedAt,
			); err == nil {
				action.RecentResponses = append(action.RecentResponses, resp)
			}
		}
	}

	return action, nil
}

// ListByWard retrieves a paginated list of actions for a ward ordered by newest first.
func (r *PostgresRepository) ListByWard(ctx context.Context, wardID string, limit, offset int) ([]model.CommunityAction, int, error) {
	if limit <= 0 {
		limit = 50
	}

	var total int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM community_actions WHERE ward_id = $1`, wardID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, creator_id, ward_id, title, description, desired_outcome,
		       COALESCE(target_authority_id::text, ''), escalation_level,
		       status, support_count, support_goal,
		       COALESCE(economic_impact_estimate, 0),
		       COALESCE(pattern_id::text, ''),
		       created_at, acknowledged_at, resolved_at, verified_at
		FROM community_actions WHERE ward_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.pool.Query(ctx, query, wardID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var actions []model.CommunityAction
	for rows.Next() {
		var a model.CommunityAction
		if err := rows.Scan(
			&a.ID, &a.CreatorID, &a.WardID, &a.Title, &a.Description, &a.DesiredOutcome,
			&a.TargetAuthorityID, &a.EscalationLevel,
			&a.Status, &a.SupportCount, &a.SupportGoal,
			&a.EconomicImpactEstimate,
			&a.PatternID,
			&a.CreatedAt, &a.AcknowledgedAt, &a.ResolvedAt, &a.VerifiedAt,
		); err != nil {
			return nil, 0, err
		}
		actions = append(actions, a)
	}

	return actions, total, rows.Err()
}

// AddSupporter inserts a new supporter for a community action.
func (r *PostgresRepository) AddSupporter(ctx context.Context, supporter *model.ActionSupporter) error {
	query := `
		INSERT INTO action_supporters (id, action_id, user_id, civic_score_at_time, ward_verified, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (action_id, user_id) DO NOTHING
	`
	tag, err := r.pool.Exec(ctx, query,
		supporter.ID, supporter.ActionID, supporter.UserID,
		supporter.CivicScoreAtTime, supporter.WardVerified, supporter.CreatedAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrAlreadySupported
	}
	return nil
}

// RemoveSupporter removes a supporter from a community action.
func (r *PostgresRepository) RemoveSupporter(ctx context.Context, actionID, userID string) error {
	query := `DELETE FROM action_supporters WHERE action_id = $1 AND user_id = $2`
	tag, err := r.pool.Exec(ctx, query, actionID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// HasSupported checks if a user has supported an action.
func (r *PostgresRepository) HasSupported(ctx context.Context, actionID, userID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM action_supporters WHERE action_id = $1 AND user_id = $2)`,
		actionID, userID,
	).Scan(&exists)
	return exists, err
}

// GetSupportCount returns the current support count for an action.
func (r *PostgresRepository) GetSupportCount(ctx context.Context, actionID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM action_supporters WHERE action_id = $1`,
		actionID,
	).Scan(&count)
	return count, err
}

// AddEvidence inserts a new evidence link for a community action.
func (r *PostgresRepository) AddEvidence(ctx context.Context, evidence *model.ActionEvidence) error {
	query := `
		INSERT INTO action_evidence (id, action_id, issue_id, linked_by, auto_linked, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.pool.Exec(ctx, query,
		evidence.ID, evidence.ActionID, evidence.IssueID,
		evidence.LinkedBy, evidence.AutoLinked, evidence.CreatedAt,
	)
	return err
}

// ListEvidence retrieves all evidence linked to a community action, enriched with issue details.
func (r *PostgresRepository) ListEvidence(ctx context.Context, actionID string) ([]model.ActionEvidence, error) {
	query := `
		SELECT ae.id, ae.action_id, ae.issue_id,
		       COALESCE(i.text, ''), COALESCE(i.category, ''), i.photo_urls, COALESCE(i.status, ''),
		       ae.linked_by, COALESCE(u.name, ''), ae.auto_linked, ae.created_at
		FROM action_evidence ae
		LEFT JOIN issues i ON i.id = ae.issue_id
		LEFT JOIN users u ON u.id = ae.linked_by
		WHERE ae.action_id = $1
		ORDER BY ae.created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, actionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var evidence []model.ActionEvidence
	for rows.Next() {
		var e model.ActionEvidence
		var photoUrls []string
		if err := rows.Scan(
			&e.ID, &e.ActionID, &e.IssueID,
			&e.IssueTitle, &e.IssueCategory, &photoUrls, &e.IssueStatus,
			&e.LinkedBy, &e.LinkedByName, &e.AutoLinked, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		if len(photoUrls) > 0 {
			e.IssuePhotoUrl = &photoUrls[0]
		}
		evidence = append(evidence, e)
	}
	return evidence, rows.Err()
}

// AddResponse inserts a stakeholder response for a community action.
func (r *PostgresRepository) AddResponse(ctx context.Context, response *model.ActionResponse) error {
	query := `
		INSERT INTO action_responses (id, action_id, responder_id, response_type, content, timeline_date, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	var timelineDate interface{}
	if response.TimelineDate != "" {
		timelineDate = response.TimelineDate
	}

	_, err := r.pool.Exec(ctx, query,
		response.ID, response.ActionID, response.ResponderID,
		response.ResponseType, response.Content, timelineDate, response.CreatedAt,
	)
	return err
}

// ListTimeline retrieves the full timeline of an action including support milestones,
// evidence links, responses, escalations, and verifications.
func (r *PostgresRepository) ListTimeline(ctx context.Context, actionID string) ([]model.TimelineEntry, error) {
	var timeline []model.TimelineEntry

	// Supporters (as milestone events)
	suppQ := `
		SELECT id, user_id, created_at FROM action_supporters
		WHERE action_id = $1 ORDER BY created_at ASC
	`
	suppRows, err := r.pool.Query(ctx, suppQ, actionID)
	if err == nil {
		defer suppRows.Close()
		for suppRows.Next() {
			var id, userID string
			var createdAt time.Time
			if err := suppRows.Scan(&id, &userID, &createdAt); err == nil {
				timeline = append(timeline, model.TimelineEntry{
					ID:        id,
					Type:      "supported",
					ActorID:   userID,
					Content:   "Endorsed this action",
					CreatedAt: createdAt,
				})
			}
		}
	}

	// Evidence links
	evQ := `
		SELECT id, linked_by, issue_id, created_at FROM action_evidence
		WHERE action_id = $1 ORDER BY created_at ASC
	`
	evRows, err := r.pool.Query(ctx, evQ, actionID)
	if err == nil {
		defer evRows.Close()
		for evRows.Next() {
			var id, linkedBy, issueID string
			var createdAt time.Time
			if err := evRows.Scan(&id, &linkedBy, &issueID, &createdAt); err == nil {
				timeline = append(timeline, model.TimelineEntry{
					ID:        id,
					Type:      "evidence",
					ActorID:   linkedBy,
					Content:   fmt.Sprintf("Linked issue %s as evidence", issueID),
					Data:      map[string]string{"issue_id": issueID},
					CreatedAt: createdAt,
				})
			}
		}
	}

	// Responses
	respQ := `
		SELECT id, responder_id, response_type, content, created_at FROM action_responses
		WHERE action_id = $1 ORDER BY created_at ASC
	`
	respRows, err := r.pool.Query(ctx, respQ, actionID)
	if err == nil {
		defer respRows.Close()
		for respRows.Next() {
			var id, responderID, content string
			var responseType model.ResponseType
			var createdAt time.Time
			if err := respRows.Scan(&id, &responderID, &responseType, &content, &createdAt); err == nil {
				timeline = append(timeline, model.TimelineEntry{
					ID:        id,
					Type:      "response",
					ActorID:   responderID,
					Content:   content,
					Data:      map[string]string{"response_type": string(responseType)},
					CreatedAt: createdAt,
				})
			}
		}
	}

	// Escalations
	escQ := `
		SELECT id, from_level, to_level, reason, COALESCE(notified_authority_id::text, ''), created_at
		FROM action_escalations WHERE action_id = $1 ORDER BY created_at ASC
	`
	escRows, err := r.pool.Query(ctx, escQ, actionID)
	if err == nil {
		defer escRows.Close()
		for escRows.Next() {
			var id, notifiedID string
			var fromLevel, toLevel model.EscalationLevel
			var reason model.EscalationReason
			var createdAt time.Time
			if err := escRows.Scan(&id, &fromLevel, &toLevel, &reason, &notifiedID, &createdAt); err == nil {
				timeline = append(timeline, model.TimelineEntry{
					ID:      id,
					Type:    "escalation",
					ActorID: "system",
					Content: fmt.Sprintf("Escalated from %s to %s: %s", fromLevel, toLevel, reason),
					Data: map[string]string{
						"from_level":            string(fromLevel),
						"to_level":              string(toLevel),
						"reason":                string(reason),
						"notified_authority_id": notifiedID,
					},
					CreatedAt: createdAt,
				})
			}
		}
	}

	// Verifications
	verQ := `
		SELECT id, verifier_id, verified, created_at FROM action_verifications
		WHERE action_id = $1 ORDER BY created_at ASC
	`
	verRows, err := r.pool.Query(ctx, verQ, actionID)
	if err == nil {
		defer verRows.Close()
		for verRows.Next() {
			var id, verifierID string
			var verified bool
			var createdAt time.Time
			if err := verRows.Scan(&id, &verifierID, &verified, &createdAt); err == nil {
				content := "Verified resolution"
				if !verified {
					content = "Disputed resolution"
				}
				timeline = append(timeline, model.TimelineEntry{
					ID:        id,
					Type:      "verification",
					ActorID:   verifierID,
					Content:   content,
					Data:      map[string]bool{"verified": verified},
					CreatedAt: createdAt,
				})
			}
		}
	}

	// Sort timeline by created_at (simple insertion sort since slices are already ordered per type)
	for i := 1; i < len(timeline); i++ {
		for j := i; j > 0 && timeline[j].CreatedAt.Before(timeline[j-1].CreatedAt); j-- {
			timeline[j], timeline[j-1] = timeline[j-1], timeline[j]
		}
	}

	return timeline, nil
}

// AddVerification inserts a community verification record.
func (r *PostgresRepository) AddVerification(ctx context.Context, verification *model.ActionVerification) error {
	query := `
		INSERT INTO action_verifications (id, action_id, verifier_id, civic_score_at_time,
		                                   photo_evidence_urls, verified, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.pool.Exec(ctx, query,
		verification.ID, verification.ActionID, verification.VerifierID,
		verification.CivicScoreAtTime, verification.PhotoEvidenceURLs,
		verification.Verified, verification.CreatedAt,
	)
	return err
}

// CountVerifications returns the number of positive verifications for an action.
func (r *PostgresRepository) CountVerifications(ctx context.Context, actionID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM action_verifications WHERE action_id = $1 AND verified = true`,
		actionID,
	).Scan(&count)
	return count, err
}

// UpdateStatus updates the status of a community action.
func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, status model.ActionStatus) error {
	var extraCol string
	switch status {
	case model.StatusAcknowledged:
		extraCol = ", acknowledged_at = NOW()"
	case model.StatusResolved:
		extraCol = ", resolved_at = NOW()"
	case model.StatusVerified:
		extraCol = ", verified_at = NOW()"
	}

	query := fmt.Sprintf(`UPDATE community_actions SET status = $1%s WHERE id = $2`, extraCol)
	tag, err := r.pool.Exec(ctx, query, status, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// UpdateSupportCount updates the cached support count on a community action.
func (r *PostgresRepository) UpdateSupportCount(ctx context.Context, id string, count int) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE community_actions SET support_count = $1 WHERE id = $2`,
		count, id,
	)
	return err
}

// ListTrending retrieves trending actions across wards, ordered by momentum score.
func (r *PostgresRepository) ListTrending(ctx context.Context, limit int) ([]model.TrendingAction, error) {
	if limit <= 0 {
		limit = 20
	}

	query := `
		SELECT a.id, a.title, a.ward_id, a.status, a.support_count, a.support_goal,
		       (SELECT COUNT(*) FROM action_evidence e WHERE e.action_id = a.id) AS evidence_count,
		       a.escalation_level, a.created_at,
		       (a.support_count * 1.0 / GREATEST(a.support_goal, 1) * 50 +
		        (SELECT COUNT(*) FROM action_evidence e WHERE e.action_id = a.id) * 5 +
		        CASE WHEN a.created_at > NOW() - INTERVAL '7 days' THEN 20 ELSE 0 END +
		        CASE WHEN a.status IN ('open', 'acknowledged') THEN 10 ELSE 0 END
		       ) AS momentum_score
		FROM community_actions a
		WHERE a.status NOT IN ('draft', 'archived')
		ORDER BY momentum_score DESC, a.created_at DESC
		LIMIT $1
	`

	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var actions []model.TrendingAction
	for rows.Next() {
		var a model.TrendingAction
		if err := rows.Scan(
			&a.ID, &a.Title, &a.WardID, &a.Status,
			&a.SupportCount, &a.SupportGoal, &a.EvidenceCount,
			&a.EscalationLevel, &a.CreatedAt, &a.MomentumScore,
		); err != nil {
			return nil, err
		}
		actions = append(actions, a)
	}

	return actions, rows.Err()
}

// UpdateEvidencePackage updates the evidence package JSON on a community action.
func (r *PostgresRepository) UpdateEvidencePackage(ctx context.Context, id string, evidenceJSON interface{}) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE community_actions SET evidence_package_json = $1 WHERE id = $2`,
		evidenceJSON, id,
	)
	return err
}

// UpdateSupportGoal updates the support goal on a community action.
func (r *PostgresRepository) UpdateSupportGoal(ctx context.Context, actionID string, newGoal int) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE community_actions SET support_goal = $1 WHERE id = $2`,
		newGoal, actionID,
	)
	return err
}

// GetUserCivicScore retrieves the credibility score for a user from the civic_scores table.
func (r *PostgresRepository) GetUserCivicScore(ctx context.Context, userID string) (int, error) {
	var score int
	err := r.pool.QueryRow(ctx,
		`SELECT COALESCE(credibility_score, 0) FROM civic_scores WHERE user_id = $1`,
		userID,
	).Scan(&score)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return score, nil
}

func (r *PostgresRepository) UpdatePatternStatus(ctx context.Context, patternID, actionID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE detected_patterns SET status = 'action_created', community_action_id = $1 WHERE id = $2`,
		actionID, patternID,
	)
	return err
}

func (r *PostgresRepository) GetUserCivicScoreAndWard(ctx context.Context, userID string, wardID *string) error {
	return r.pool.QueryRow(ctx,
		`SELECT COALESCE(primary_boundary_id::text, '') FROM users WHERE id = $1`, userID,
	).Scan(wardID)
}

// CountUserActionsInPeriod returns the number of actions created by a user since a given time.
func (r *PostgresRepository) CountUserActionsInPeriod(ctx context.Context, userID string, since time.Time) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM community_actions WHERE creator_id = $1 AND created_at >= $2`,
		userID, since,
	).Scan(&count)
	return count, err
}

// ListStaleActions returns open actions with no responses that were created more than noResponseDays ago.
func (r *PostgresRepository) ListStaleActions(ctx context.Context, noResponseDays int) ([]model.CommunityAction, error) {
	query := `
		SELECT a.id, a.creator_id, a.ward_id, a.title, a.description, a.desired_outcome,
		       COALESCE(a.target_authority_id::text, ''), a.escalation_level,
		       a.status, a.support_count, a.support_goal,
		       COALESCE(a.economic_impact_estimate, 0),
		       COALESCE(a.pattern_id::text, ''),
		       a.created_at, a.acknowledged_at, a.resolved_at, a.verified_at
		FROM community_actions a
		WHERE a.status = 'open'
		  AND a.created_at < NOW() - make_interval(days => $1)
		  AND NOT EXISTS (SELECT 1 FROM action_responses r WHERE r.action_id = a.id)
	`
	rows, err := r.pool.Query(ctx, query, noResponseDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var actions []model.CommunityAction
	for rows.Next() {
		var a model.CommunityAction
		if err := rows.Scan(
			&a.ID, &a.CreatorID, &a.WardID, &a.Title, &a.Description, &a.DesiredOutcome,
			&a.TargetAuthorityID, &a.EscalationLevel,
			&a.Status, &a.SupportCount, &a.SupportGoal,
			&a.EconomicImpactEstimate,
			&a.PatternID,
			&a.CreatedAt, &a.AcknowledgedAt, &a.ResolvedAt, &a.VerifiedAt,
		); err != nil {
			return nil, err
		}
		actions = append(actions, a)
	}
	return actions, rows.Err()
}

// CreateEscalation inserts an escalation record for a community action.
func (r *PostgresRepository) CreateEscalation(ctx context.Context, actionID, fromLevel, toLevel, reason string) error {
	query := `
		INSERT INTO action_escalations (id, action_id, from_level, to_level, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.pool.Exec(ctx, query,
		GenerateID(), actionID, fromLevel, toLevel, reason, time.Now().UTC(),
	)
	return err
}

// UpdateEscalationLevel updates the escalation level on a community action.
func (r *PostgresRepository) UpdateEscalationLevel(ctx context.Context, actionID, newLevel string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE community_actions SET escalation_level = $1 WHERE id = $2`,
		newLevel, actionID,
	)
	return err
}

// UpdateEconomicImpact updates the economic impact estimate on a community action.
func (r *PostgresRepository) UpdateEconomicImpact(ctx context.Context, actionID string, impact float64) error {
	_, err := r.pool.Exec(ctx, `UPDATE community_actions SET economic_impact_estimate = $1 WHERE id = $2`, impact, actionID)
	return err
}

// GenerateID creates a UUID v4 for all entities.
func GenerateID() string {
	b := make([]byte, 16)
	_, _ = cryptorand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
