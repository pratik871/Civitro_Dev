package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/civitro/pkg/events"
	"github.com/civitro/pkg/logger"
	"github.com/civitro/services/community-action/internal/model"
	"github.com/civitro/services/community-action/internal/repository"
)

// Service implements the business logic for the community action service.
type Service struct {
	repo     repository.Repository
	producer *events.Producer
}

// New creates a new community action Service.
func New(repo repository.Repository, producer *events.Producer) *Service {
	return &Service{
		repo:     repo,
		producer: producer,
	}
}

// CreateAction creates a new community action.
func (s *Service) CreateAction(ctx context.Context, userID string, req *model.CreateActionRequest) (*model.ActionDetailResponse, error) {
	// --- Guardrail: Civic score check ---
	civicScore, err := s.repo.GetUserCivicScore(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check civic score: %w", err)
	}
	if civicScore < 5 {
		return nil, errors.New("Minimum civic score of 5 required to create community actions")
	}

	// --- Guardrail: Evidence minimum ---
	if len(req.LinkedIssueIDs) < 3 && req.PatternID == "" {
		return nil, errors.New("Actions require at least 3 linked issues or 1 detected pattern")
	}

	// --- Guardrail: Cooling period ---
	recentCount, err := s.repo.CountUserActionsInPeriod(ctx, userID, time.Now().AddDate(0, -1, 0))
	if err != nil {
		return nil, fmt.Errorf("failed to check action rate limit: %w", err)
	}
	if recentCount >= 2 {
		return nil, errors.New("Maximum 2 actions per month. Please wait before creating another.")
	}

	if req.Title == "" {
		return nil, errors.New("action title is required")
	}
	if req.Description == "" {
		return nil, errors.New("action description is required")
	}
	if req.DesiredOutcome == "" {
		return nil, errors.New("desired outcome is required")
	}

	// Default escalation level
	escalationLevel := req.EscalationLevel
	if escalationLevel == "" {
		escalationLevel = model.EscalationWard
	}

	// Default support goal (dynamic: starts at 50)
	supportGoal := 50

	now := time.Now().UTC()
	action := &model.CommunityAction{
		ID:                userID, // will be overwritten below
		CreatorID:         userID,
		WardID:            req.WardID,
		Title:             req.Title,
		Description:       req.Description,
		DesiredOutcome:    req.DesiredOutcome,
		TargetAuthorityID: req.TargetAuthorityID,
		EscalationLevel:   escalationLevel,
		Status:            model.StatusOpen,
		SupportCount:      0,
		SupportGoal:       supportGoal,
		PatternID:         req.PatternID,
		CreatedAt:         now,
	}
	action.ID = repository.GenerateActionID()

	if err := s.repo.Create(ctx, action); err != nil {
		return nil, fmt.Errorf("failed to create action: %w", err)
	}

	// --- Process linked issue IDs: create evidence records ---
	for _, issueID := range req.LinkedIssueIDs {
		evidence := &model.ActionEvidence{
			ID:         repository.GenerateID(),
			ActionID:   action.ID,
			IssueID:    issueID,
			LinkedBy:   userID,
			AutoLinked: req.PatternID != "",
			CreatedAt:  now,
		}
		if err := s.repo.AddEvidence(ctx, evidence); err != nil {
			logger.Error().Err(err).
				Str("action_id", action.ID).
				Str("issue_id", issueID).
				Msg("failed to link issue as evidence during action creation")
		}
	}

	// Regenerate evidence package if issues were linked
	if len(req.LinkedIssueIDs) > 0 {
		go s.regenerateEvidencePackage(action.ID)
	}

	// Publish action created event
	payload, _ := json.Marshal(map[string]interface{}{
		"action_id": action.ID,
		"user_id":   userID,
		"ward_id":   action.WardID,
		"title":     action.Title,
	})
	_ = s.producer.Publish(ctx, "action.created", action.ID, payload)

	// Award civic score points for creating an action
	awardPoints(userID, "action_created", 15, "Created community action: "+action.ID)

	return &model.ActionDetailResponse{Action: *action}, nil
}

// GetAction retrieves a community action by ID with evidence and support status.
func (s *Service) GetAction(ctx context.Context, id, userID string) (*model.ActionDetailResponse, error) {
	action, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("action not found")
		}
		return nil, fmt.Errorf("failed to get action: %w", err)
	}

	if userID != "" {
		action.HasSupported, _ = s.repo.HasSupported(ctx, action.ID, userID)
	}

	return &model.ActionDetailResponse{Action: *action}, nil
}

// ListByWard retrieves paginated actions for a ward.
func (s *Service) ListByWard(ctx context.Context, wardID string, limit, offset int) (*model.ActionListResponse, error) {
	actions, total, err := s.repo.ListByWard(ctx, wardID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list actions: %w", err)
	}

	if actions == nil {
		actions = []model.CommunityAction{}
	}

	return &model.ActionListResponse{
		Actions: actions,
		Count:   total,
	}, nil
}

// AddSupport adds a supporter to an action. Returns supported state and new count.
func (s *Service) AddSupport(ctx context.Context, actionID, userID string) (bool, int, error) {
	// Verify action exists
	action, err := s.repo.GetByID(ctx, actionID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return false, 0, errors.New("action not found")
		}
		return false, 0, fmt.Errorf("failed to get action: %w", err)
	}

	if action.Status == model.StatusArchived || action.Status == model.StatusDraft {
		return false, 0, errors.New("cannot support an action in this status")
	}

	supporter := &model.ActionSupporter{
		ID:           repository.GenerateID(),
		ActionID:     actionID,
		UserID:       userID,
		WardVerified: true, // TODO: verify ward residency
		CreatedAt:    time.Now().UTC(),
	}

	if err := s.repo.AddSupporter(ctx, supporter); err != nil {
		if errors.Is(err, repository.ErrAlreadySupported) {
			return false, action.SupportCount, errors.New("already supporting this action")
		}
		return false, 0, fmt.Errorf("failed to add supporter: %w", err)
	}

	// Update cached support count
	newCount, _ := s.repo.GetSupportCount(ctx, actionID)
	_ = s.repo.UpdateSupportCount(ctx, actionID, newCount)

	// Publish support event
	payload, _ := json.Marshal(map[string]interface{}{
		"action_id": actionID,
		"user_id":   userID,
		"count":     newCount,
	})
	_ = s.producer.Publish(ctx, "action.supported", actionID, payload)

	// Award points for supporting
	awardPoints(userID, "action_supported", 5, "Supported community action: "+actionID)

	// Check for milestone hits
	go s.checkMilestone(actionID, newCount, action.SupportGoal)

	// Check for auto-escalation
	go s.checkAutoEscalation(actionID, newCount, action)

	return true, newCount, nil
}

// RemoveSupport removes a supporter from an action. Returns new count.
func (s *Service) RemoveSupport(ctx context.Context, actionID, userID string) (int, error) {
	if err := s.repo.RemoveSupporter(ctx, actionID, userID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return 0, errors.New("not supporting this action")
		}
		return 0, fmt.Errorf("failed to remove supporter: %w", err)
	}

	// Update cached support count
	newCount, _ := s.repo.GetSupportCount(ctx, actionID)
	_ = s.repo.UpdateSupportCount(ctx, actionID, newCount)

	return newCount, nil
}

// AddEvidence links an issue to an action as evidence.
func (s *Service) AddEvidence(ctx context.Context, actionID, userID string, req *model.AddEvidenceRequest) (*model.ActionEvidence, error) {
	// Verify action exists
	if _, err := s.repo.GetByID(ctx, actionID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("action not found")
		}
		return nil, fmt.Errorf("failed to get action: %w", err)
	}

	evidence := &model.ActionEvidence{
		ID:         repository.GenerateID(),
		ActionID:   actionID,
		IssueID:    req.IssueID,
		LinkedBy:   userID,
		AutoLinked: req.AutoLinked,
		CreatedAt:  time.Now().UTC(),
	}

	if err := s.repo.AddEvidence(ctx, evidence); err != nil {
		return nil, fmt.Errorf("failed to add evidence: %w", err)
	}

	// Regenerate evidence package in background
	go s.regenerateEvidencePackage(actionID)

	return evidence, nil
}

// AddResponse records a stakeholder response to an action.
func (s *Service) AddResponse(ctx context.Context, actionID, responderID string, req *model.AddResponseRequest) (*model.ActionResponse, error) {
	// Verify action exists
	action, err := s.repo.GetByID(ctx, actionID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("action not found")
		}
		return nil, fmt.Errorf("failed to get action: %w", err)
	}

	response := &model.ActionResponse{
		ID:           repository.GenerateID(),
		ActionID:     actionID,
		ResponderID:  responderID,
		ResponseType: req.ResponseType,
		Content:      req.Content,
		TimelineDate: req.TimelineDate,
		CreatedAt:    time.Now().UTC(),
	}

	if err := s.repo.AddResponse(ctx, response); err != nil {
		return nil, fmt.Errorf("failed to add response: %w", err)
	}

	// Update action status based on response type
	var newStatus model.ActionStatus
	switch req.ResponseType {
	case model.ResponseAcknowledge:
		newStatus = model.StatusAcknowledged
	case model.ResponseCommit:
		newStatus = model.StatusCommitted
	case model.ResponseResolve:
		newStatus = model.StatusResolved
	}
	if newStatus != "" && newStatus != action.Status {
		_ = s.repo.UpdateStatus(ctx, actionID, newStatus)
	}

	// Publish appropriate event
	eventTopic := "action.responded"
	switch req.ResponseType {
	case model.ResponseAcknowledge:
		eventTopic = "action.acknowledged"
	case model.ResponseCommit:
		eventTopic = "action.committed"
	case model.ResponseResolve:
		eventTopic = "action.resolved"
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"action_id":     actionID,
		"responder_id":  responderID,
		"response_type": string(req.ResponseType),
	})
	_ = s.producer.Publish(ctx, eventTopic, actionID, payload)

	// Notify action creator and supporters
	go sendNotification(action.CreatorID, "action_response",
		"Stakeholder Response",
		fmt.Sprintf("Your community action \"%s\" received a %s response", action.Title, req.ResponseType),
		map[string]interface{}{"action_id": actionID, "response_type": string(req.ResponseType)})

	return response, nil
}

// GetTimeline retrieves the full timeline for an action.
func (s *Service) GetTimeline(ctx context.Context, actionID string) (*model.TimelineResponse, error) {
	// Verify action exists
	if _, err := s.repo.GetByID(ctx, actionID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("action not found")
		}
		return nil, fmt.Errorf("failed to get action: %w", err)
	}

	timeline, err := s.repo.ListTimeline(ctx, actionID)
	if err != nil {
		return nil, fmt.Errorf("failed to list timeline: %w", err)
	}

	if timeline == nil {
		timeline = []model.TimelineEntry{}
	}

	return &model.TimelineResponse{
		Timeline: timeline,
		Count:    len(timeline),
	}, nil
}

// AddVerification records a community verification of action resolution.
func (s *Service) AddVerification(ctx context.Context, actionID, userID string, req *model.AddVerificationRequest) (*model.ActionVerification, error) {
	// Verify action exists and is in a verifiable status
	action, err := s.repo.GetByID(ctx, actionID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("action not found")
		}
		return nil, fmt.Errorf("failed to get action: %w", err)
	}

	if action.Status != model.StatusResolved && action.Status != model.StatusVerified {
		return nil, errors.New("action must be in resolved status before community verification")
	}

	verification := &model.ActionVerification{
		ID:                repository.GenerateID(),
		ActionID:          actionID,
		VerifierID:        userID,
		PhotoEvidenceURLs: req.PhotoEvidenceURLs,
		Verified:          req.Verified,
		CreatedAt:         time.Now().UTC(),
	}

	if err := s.repo.AddVerification(ctx, verification); err != nil {
		return nil, fmt.Errorf("failed to add verification: %w", err)
	}

	// Check if we have 3+ positive verifications -> mark as verified
	if req.Verified {
		count, _ := s.repo.CountVerifications(ctx, actionID)
		if count >= 3 && action.Status != model.StatusVerified {
			_ = s.repo.UpdateStatus(ctx, actionID, model.StatusVerified)

			// Publish verified event
			payload, _ := json.Marshal(map[string]interface{}{
				"action_id":          actionID,
				"verification_count": count,
			})
			_ = s.producer.Publish(ctx, "action.verified", actionID, payload)

			// Award points to the creator
			awardPoints(action.CreatorID, "action_verified", 25, "Community action verified: "+actionID)
		}
	}

	return verification, nil
}

// ListTrending retrieves trending actions across wards.
func (s *Service) ListTrending(ctx context.Context, limit int) (*model.TrendingListResponse, error) {
	actions, err := s.repo.ListTrending(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list trending: %w", err)
	}

	if actions == nil {
		actions = []model.TrendingAction{}
	}

	return &model.TrendingListResponse{
		Actions: actions,
		Count:   len(actions),
	}, nil
}

// supportGoalLadder defines the dynamic escalation ladder for support goals.
var supportGoalLadder = []int{50, 100, 250, 500}

// checkMilestone checks if a support count has hit a dynamic milestone and publishes an event.
func (s *Service) checkMilestone(actionID string, count, goal int) {
	milestones := []int{10, 25, 50, 100, 250, 500, 1000}
	for _, m := range milestones {
		if count == m {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			payload, _ := json.Marshal(map[string]interface{}{
				"action_id": actionID,
				"milestone": m,
				"count":     count,
			})
			_ = s.producer.Publish(ctx, "action.milestone_hit", actionID, payload)

			logger.Info().
				Str("action_id", actionID).
				Int("milestone", m).
				Msg("community action hit support milestone")
			break
		}
	}

	// Dynamic support goal escalation: when count crosses the current goal,
	// advance to the next tier in the ladder.
	if count >= goal {
		nextGoal := 0
		for _, tier := range supportGoalLadder {
			if tier > goal {
				nextGoal = tier
				break
			}
		}
		if nextGoal > 0 {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			if err := s.repo.UpdateSupportGoal(ctx, actionID, nextGoal); err != nil {
				logger.Error().Err(err).
					Str("action_id", actionID).
					Int("new_goal", nextGoal).
					Msg("failed to update support goal")
			} else {
				logger.Info().
					Str("action_id", actionID).
					Int("old_goal", goal).
					Int("new_goal", nextGoal).
					Msg("dynamic support goal escalated")
			}
		}
	}
}

// checkAutoEscalation checks if an action should trigger stakeholder notification.
// At 100 supporters or 10% of ward population, auto-notify the target authority.
func (s *Service) checkAutoEscalation(actionID string, count int, action *model.CommunityAction) {
	if count >= 100 && action.Status == model.StatusOpen {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		payload, _ := json.Marshal(map[string]interface{}{
			"action_id":    actionID,
			"authority_id": action.TargetAuthorityID,
			"count":        count,
		})
		_ = s.producer.Publish(ctx, "action.stakeholder_notified", actionID, payload)

		// Send notification to the target authority
		if action.TargetAuthorityID != "" {
			sendNotification(action.TargetAuthorityID, "action_escalation",
				"Community Action Requires Attention",
				fmt.Sprintf("Community action \"%s\" has reached %d supporters and requires your response", action.Title, count),
				map[string]interface{}{"action_id": actionID, "support_count": count})
		}

		logger.Info().
			Str("action_id", actionID).
			Int("support_count", count).
			Msg("auto-escalation triggered for community action")
	}
}

// regenerateEvidencePackage rebuilds the evidence package JSON for an action.
func (s *Service) regenerateEvidencePackage(actionID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	evidence, err := s.repo.ListEvidence(ctx, actionID)
	if err != nil {
		logger.Error().Err(err).Str("action_id", actionID).Msg("failed to list evidence for package generation")
		return
	}

	issueIDs := make([]string, 0, len(evidence))
	for _, e := range evidence {
		issueIDs = append(issueIDs, e.IssueID)
	}

	pkg := map[string]interface{}{
		"action_id":    actionID,
		"report_count": len(evidence),
		"issue_ids":    issueIDs,
		"generated_at": time.Now().UTC(),
	}

	pkgJSON, _ := json.Marshal(pkg)
	if err := s.repo.UpdateEvidencePackage(ctx, actionID, pkgJSON); err != nil {
		logger.Error().Err(err).Str("action_id", actionID).Msg("failed to update evidence package")
	}
}

// nextEscalationLevel returns the next escalation level in the ladder.
// Ladder: ward → mla → mp → state → public
func nextEscalationLevel(current model.EscalationLevel) model.EscalationLevel {
	switch current {
	case model.EscalationWard:
		return model.EscalationMLA
	case model.EscalationMLA:
		return model.EscalationMP
	case model.EscalationMP:
		return model.EscalationState
	case model.EscalationState:
		return model.EscalationPublic
	default:
		return "" // already at highest level
	}
}

// RunEscalationChecker runs a background job that periodically checks for stale
// actions and escalates them according to the escalation ladder.
func (s *Service) RunEscalationChecker(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	logger.Info().Msg("escalation checker background job started")

	for {
		select {
		case <-ctx.Done():
			logger.Info().Msg("escalation checker stopped")
			return
		case <-ticker.C:
			s.runEscalationCycle(ctx)
		}
	}
}

// runEscalationCycle performs a single escalation check cycle.
func (s *Service) runEscalationCycle(ctx context.Context) {
	checkCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Find actions open > 7 days with no response → escalate
	stale7, err := s.repo.ListStaleActions(checkCtx, 7)
	if err != nil {
		logger.Error().Err(err).Msg("escalation checker: failed to list stale actions (7d)")
		return
	}

	for _, action := range stale7 {
		next := nextEscalationLevel(action.EscalationLevel)
		if next == "" {
			continue // already at highest level
		}

		reason := string(model.ReasonNoResponse7D)

		if err := s.repo.CreateEscalation(checkCtx, action.ID, string(action.EscalationLevel), string(next), reason); err != nil {
			logger.Error().Err(err).Str("action_id", action.ID).Msg("escalation checker: failed to create escalation record")
			continue
		}

		if err := s.repo.UpdateEscalationLevel(checkCtx, action.ID, string(next)); err != nil {
			logger.Error().Err(err).Str("action_id", action.ID).Msg("escalation checker: failed to update escalation level")
			continue
		}

		// Publish escalation event
		payload, _ := json.Marshal(map[string]interface{}{
			"action_id":  action.ID,
			"from_level": string(action.EscalationLevel),
			"to_level":   string(next),
			"reason":     reason,
		})
		_ = s.producer.Publish(checkCtx, "action.escalated", action.ID, payload)

		logger.Info().
			Str("action_id", action.ID).
			Str("from", string(action.EscalationLevel)).
			Str("to", string(next)).
			Msg("escalation checker: action escalated due to no response")
	}

	// Find actions open > 14 days → flag for future CHI integration
	stale14, err := s.repo.ListStaleActions(checkCtx, 14)
	if err != nil {
		logger.Error().Err(err).Msg("escalation checker: failed to list stale actions (14d)")
		return
	}

	for _, action := range stale14 {
		logger.Warn().
			Str("action_id", action.ID).
			Str("ward_id", action.WardID).
			Str("escalation_level", string(action.EscalationLevel)).
			Int("support_count", action.SupportCount).
			Msg("escalation checker: action flagged — no response after 14 days (pending CHI integration)")
	}
}

// awardPoints sends a score event to the reputation service (fire-and-forget).
func awardPoints(userID, eventType string, points int, reason string) {
	go func() {
		payload, _ := json.Marshal(map[string]interface{}{
			"user_id":    userID,
			"event_type": eventType,
			"points":     points,
			"reason":     reason,
		})
		resp, err := http.Post("http://reputation:8012/api/v1/reputation/event", "application/json", bytes.NewReader(payload))
		if err != nil {
			logger.Error().Err(err).Str("user_id", userID).Msg("failed to award reputation points")
			return
		}
		resp.Body.Close()
	}()
}

// sendNotification sends a notification to a user (fire-and-forget).
func sendNotification(userID string, notifType, title, body string, data map[string]interface{}) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	payload, _ := json.Marshal(map[string]interface{}{
		"user_id": userID,
		"type":    notifType,
		"title":   title,
		"body":    body,
		"data":    data,
	})

	req, err := http.NewRequestWithContext(ctx, "POST", "http://notifications:8017/api/v1/notifications/send", bytes.NewReader(payload))
	if err != nil {
		logger.Error().Err(err).Str("user_id", userID).Msg("failed to create notification request")
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.Warn().Err(err).Str("user_id", userID).Msg("notification service unavailable")
		return
	}
	resp.Body.Close()
}
