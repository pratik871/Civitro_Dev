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
	"github.com/civitro/pkg/translate"
	"github.com/civitro/services/issues/internal/model"
	"github.com/civitro/services/issues/internal/repository"
)

// Service implements the business logic for the issues service.
type Service struct {
	repo       repository.Repository
	producer   *events.Producer
	translator *translate.Client
}

// New creates a new issues Service.
func New(repo repository.Repository, producer *events.Producer, translator *translate.Client) *Service {
	return &Service{
		repo:       repo,
		producer:   producer,
		translator: translator,
	}
}

// CreateIssue creates a new civic issue report.
func (s *Service) CreateIssue(ctx context.Context, userID string, req *model.CreateIssueRequest) (*model.IssueResponse, error) {
	if req.Text == "" {
		return nil, errors.New("issue description is required")
	}

	// Validate category
	if !isValidCategory(req.Category) {
		return nil, errors.New("invalid issue category")
	}

	// Default severity
	severity := req.Severity
	if severity == "" {
		severity = model.SeverityMedium
	}

	now := time.Now().UTC()
	issue := &model.Issue{
		ID:        repository.GenerateIssueID(),
		UserID:    userID,
		Text:      req.Text,
		PhotoURLs: req.PhotoURLs,
		GPSLat:    req.GPSLat,
		GPSLng:    req.GPSLng,
		Category:  req.Category,
		Severity:  severity,
		Status:    model.StatusReported,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.Create(ctx, issue); err != nil {
		return nil, fmt.Errorf("failed to create issue: %w", err)
	}

	// Look up user's ward for pattern detection
	wardID := ""
	_ = s.repo.GetUserWard(ctx, userID, &wardID)

	// Publish issue created event
	payload, _ := json.Marshal(map[string]interface{}{
		"issue_id":  issue.ID,
		"user_id":   userID,
		"ward_id":   wardID,
		"category":  issue.Category,
		"severity":  issue.Severity,
		"latitude":  issue.GPSLat,
		"longitude": issue.GPSLng,
	})
	_ = s.producer.Publish(ctx, events.TopicIssueCreated, issue.ID, payload)

	// Award civic score points for reporting an issue
	awardPoints(userID, "report_filed", 10, "Reported issue: "+issue.ID)

	// Auto-classify via AI (async — updates issue category/severity/confidence in background)
	go s.classifyIssue(issue)

	// Async: detect language and translate to English for search/admin
	if s.translator != nil {
		s.translator.TranslateAsync(issue.Text, "auto", "en", func(translated, detectedLang string) {
			if err := s.repo.UpdateTranslation(context.Background(), issue.ID, detectedLang, translated); err != nil {
				logger.Warn().Err(err).Str("issue_id", issue.ID).Msg("failed to store issue translation")
			} else {
				logger.Info().Str("issue_id", issue.ID).Str("language", detectedLang).Msg("issue language detected and translated")
			}
		})
	}

	// Create initial ledger entry for issue creation
	go appendLedger(issue.ID, string(model.StatusReported), userID, "citizen", "Issue reported by citizen")

	// Send notification to user confirming issue was filed
	go sendNotification(userID, "issue_update", "Issue Reported",
		fmt.Sprintf("Your issue %s has been filed and is being reviewed", issue.ID),
		map[string]interface{}{"issue_id": issue.ID})

	return &model.IssueResponse{Issue: *issue}, nil
}

// ListIssues retrieves a paginated list of issues.
func (s *Service) ListIssues(ctx context.Context, userID string, limit, offset int) (*model.IssueListResponse, error) {
	issues, total, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list issues: %w", err)
	}

	if issues == nil {
		issues = []model.Issue{}
	}

	// Populate HasUpvoted for each issue
	if userID != "" {
		for i := range issues {
			upvoted, _ := s.repo.HasUpvoted(ctx, issues[i].ID, userID)
			issues[i].HasUpvoted = upvoted
		}
	}

	return &model.IssueListResponse{
		Issues: issues,
		Count:  total,
	}, nil
}

// GetIssue retrieves an issue by ID.
// If targetLang is non-empty and differs from the issue's detected language,
// the issue text is translated on the fly.
func (s *Service) GetIssue(ctx context.Context, id, userID, targetLang string) (*model.IssueResponse, error) {
	issue, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("issue not found")
		}
		return nil, fmt.Errorf("failed to get issue: %w", err)
	}

	if userID != "" {
		issue.HasUpvoted, _ = s.repo.HasUpvoted(ctx, issue.ID, userID)
	}

	// On-the-fly translation if a target language is requested
	if targetLang != "" && s.translator != nil && issue.Language != "" && issue.Language != targetLang {
		if translated, err := s.translator.TranslateIfNeeded(ctx, issue.Text, issue.Language, targetLang); err == nil {
			issue.Text = translated
		} else {
			logger.Warn().Err(err).Str("issue_id", id).Str("target_lang", targetLang).Msg("on-the-fly translation failed")
		}
	}

	return &model.IssueResponse{Issue: *issue}, nil
}

// UpdateStatus updates the status of an issue.
func (s *Service) UpdateStatus(ctx context.Context, issueID string, req *model.UpdateStatusRequest) error {
	// Validate status transition
	issue, err := s.repo.GetByID(ctx, issueID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return errors.New("issue not found")
		}
		return fmt.Errorf("failed to get issue: %w", err)
	}

	if !isValidStatusTransition(issue.Status, req.Status) {
		return fmt.Errorf("invalid status transition from %s to %s", issue.Status, req.Status)
	}

	if err := s.repo.UpdateStatus(ctx, issueID, req.Status, req.AssignedTo); err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}

	// Publish status update event
	statusPayload, _ := json.Marshal(map[string]string{
		"issue_id":   issueID,
		"old_status": string(issue.Status),
		"new_status": string(req.Status),
	})
	_ = s.producer.Publish(ctx, events.TopicIssueStatusUpdated, issueID, statusPayload)

	// Append ledger entry for the status change
	detail := fmt.Sprintf("Status changed from %s to %s", issue.Status, req.Status)
	go appendLedger(issueID, string(req.Status), "", "system", detail)

	// Notify the issue reporter about the status change
	go sendNotification(issue.UserID, "issue_update",
		"Issue Update: "+statusLabel(req.Status),
		fmt.Sprintf("Your issue %s has been updated to: %s", issueID, statusLabel(req.Status)),
		map[string]interface{}{"issue_id": issueID, "status": string(req.Status)})

	return nil
}

// GetByBoundary retrieves issues for a boundary.
func (s *Service) GetByBoundary(ctx context.Context, boundaryID string) (*model.IssueListResponse, error) {
	issues, err := s.repo.GetByBoundaryID(ctx, boundaryID, 50)
	if err != nil {
		return nil, fmt.Errorf("failed to get issues: %w", err)
	}

	return &model.IssueListResponse{
		Issues: issues,
		Count:  len(issues),
	}, nil
}

// UpvoteIssue toggles the upvote for an issue. Returns the new upvoted state.
func (s *Service) UpvoteIssue(ctx context.Context, issueID, userID string) (bool, error) {
	upvoted, err := s.repo.ToggleUpvote(ctx, issueID, userID)
	if err != nil {
		return false, fmt.Errorf("failed to toggle upvote: %w", err)
	}

	// Award points to the issue reporter when upvoted
	if upvoted {
		if issue, err := s.repo.GetByID(ctx, issueID); err == nil && issue.UserID != userID {
			awardPoints(issue.UserID, "voice_upvoted", 2, "Issue upvoted: "+issueID)
		}
	}

	return upvoted, nil
}

// ConfirmIssue records a citizen confirmation of issue resolution.
func (s *Service) ConfirmIssue(ctx context.Context, issueID, userID string, req *model.ConfirmIssueRequest) error {
	// Verify issue exists and is in a confirmable status
	issue, err := s.repo.GetByID(ctx, issueID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return errors.New("issue not found")
		}
		return fmt.Errorf("failed to get issue: %w", err)
	}

	if issue.Status != model.StatusCompleted && issue.Status != model.StatusCitizenVerified {
		return errors.New("issue must be in completed status before citizen verification")
	}

	confirmation := &model.IssueConfirmation{
		IssueID:   issueID,
		UserID:    userID,
		Confirmed: req.Confirmed,
	}

	if err := s.repo.CreateConfirmation(ctx, confirmation); err != nil {
		return fmt.Errorf("failed to record confirmation: %w", err)
	}

	// If confirmed, update status to citizen_verified
	if req.Confirmed {
		_ = s.repo.UpdateStatus(ctx, issueID, model.StatusCitizenVerified, issue.AssignedTo)
	}

	return nil
}

// GetNearby retrieves issues near a geographic point.
func (s *Service) GetNearby(ctx context.Context, query *model.NearbyQuery) (*model.IssueListResponse, error) {
	if query.Radius <= 0 {
		query.Radius = 5.0 // default 5km radius
	}
	if query.Radius > 50 {
		query.Radius = 50.0 // max 50km
	}

	issues, err := s.repo.GetNearby(ctx, query.Lat, query.Lng, query.Radius, 50)
	if err != nil {
		return nil, fmt.Errorf("failed to get nearby issues: %w", err)
	}

	return &model.IssueListResponse{
		Issues: issues,
		Count:  len(issues),
	}, nil
}

// CreateComment adds a comment to an issue.
func (s *Service) CreateComment(ctx context.Context, issueID, userID, content, parentID string) (*model.Comment, error) {
	if content == "" {
		return nil, errors.New("comment content is required")
	}

	// Verify issue exists
	if _, err := s.repo.GetByID(ctx, issueID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("issue not found")
		}
		return nil, fmt.Errorf("failed to get issue: %w", err)
	}

	comment := &model.Comment{
		IssueID:  issueID,
		UserID:   userID,
		Content:  content,
		ParentID: parentID,
	}

	if err := s.repo.CreateComment(ctx, comment); err != nil {
		return nil, fmt.Errorf("failed to create comment: %w", err)
	}

	// Award points for commenting
	awardPoints(userID, "survey_completed", 3, "Commented on issue: "+issueID)

	return comment, nil
}

// ListComments retrieves comments for an issue.
func (s *Service) ListComments(ctx context.Context, issueID, userID string, limit int) (*model.CommentListResponse, error) {
	comments, err := s.repo.ListComments(ctx, issueID, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list comments: %w", err)
	}
	if comments == nil {
		comments = []model.Comment{}
	}
	return &model.CommentListResponse{
		Comments: comments,
		Count:    len(comments),
	}, nil
}

// GetTrending returns trending topics computed from issue data.
func (s *Service) GetTrending(ctx context.Context) ([]model.TrendingTopic, error) {
	topics, err := s.repo.GetTrending(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get trending: %w", err)
	}
	if topics == nil {
		topics = []model.TrendingTopic{}
	}
	return topics, nil
}

// ListPromises returns promises joined with representative info.
func (s *Service) ListPromises(ctx context.Context) ([]model.PromiseResponse, error) {
	promises, err := s.repo.ListPromises(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list promises: %w", err)
	}
	if promises == nil {
		promises = []model.PromiseResponse{}
	}
	return promises, nil
}

// GetCHI returns the Civic Health Index data.
func (s *Service) GetCHI(ctx context.Context) (*model.CHIResponse, error) {
	chi, err := s.repo.GetCHI(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get CHI: %w", err)
	}
	return chi, nil
}

// LikeComment toggles a like on a comment.
func (s *Service) LikeComment(ctx context.Context, commentID, userID string) (bool, error) {
	liked, err := s.repo.ToggleCommentLike(ctx, commentID, userID)
	if err != nil {
		return false, fmt.Errorf("failed to toggle comment like: %w", err)
	}
	return liked, nil
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

// isValidCategory checks if a category is valid.
func isValidCategory(cat model.IssueCategory) bool {
	validCategories := map[model.IssueCategory]bool{
		model.CategoryRoads:        true,
		model.CategoryWater:        true,
		model.CategorySanitation:   true,
		model.CategoryElectricity:  true,
		model.CategoryStreetLights: true,
		model.CategoryGarbage:      true,
		model.CategoryDrainage:     true,
		model.CategoryPublicSafety: true,
		model.CategoryParks:        true,
		model.CategoryTransport:    true,
		model.CategoryHealthcare:   true,
		model.CategoryOther:        true,
		model.CategoryPothole:      true,
		model.CategoryStreetlight:  true,
		model.CategoryWaterSupply:  true,
		model.CategoryRoadDamage:   true,
		model.CategoryConstruction: true,
		model.CategoryTraffic:      true,
		model.CategoryEducation:    true,
	}
	return validCategories[cat]
}

// classifyIssue calls the AI classification service to auto-categorize an issue.
// Updates the issue's category, severity, and AI confidence if the AI is more confident.
func (s *Service) classifyIssue(issue *model.Issue) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	reqBody := map[string]interface{}{
		"text":    issue.Text,
		"gps_lat": issue.GPSLat,
		"gps_lng": issue.GPSLng,
	}
	if len(issue.PhotoURLs) > 0 {
		reqBody["image_url"] = issue.PhotoURLs[0]
	}

	payload, _ := json.Marshal(reqBody)

	// Use text-only if no image, combined if image available
	endpoint := "http://classification:8008/classify/text"
	if len(issue.PhotoURLs) > 0 {
		endpoint = "http://classification:8008/classify/combined"
	}

	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(payload))
	if err != nil {
		logger.Error().Err(err).Str("issue_id", issue.ID).Msg("failed to create classification request")
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.Warn().Err(err).Str("issue_id", issue.ID).Msg("classification service unavailable, skipping auto-classify")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		logger.Warn().Int("status", resp.StatusCode).Str("issue_id", issue.ID).Msg("classification service returned non-200")
		return
	}

	var result struct {
		Category   string  `json:"category"`
		Confidence float64 `json:"confidence"`
		Severity   string  `json:"severity"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		logger.Error().Err(err).Msg("failed to decode classification response")
		return
	}

	logger.Info().
		Str("issue_id", issue.ID).
		Str("ai_category", result.Category).
		Float64("confidence", result.Confidence).
		Str("ai_severity", result.Severity).
		Msg("issue auto-classified")

	// Update the issue if AI confidence is high enough (>0.6)
	if result.Confidence > 0.6 {
		if err := s.repo.UpdateClassification(ctx, issue.ID, result.Category, result.Severity, result.Confidence); err != nil {
			logger.Error().Err(err).Str("issue_id", issue.ID).Msg("failed to update issue with AI classification")
		}
	}
}

// appendLedger creates an immutable ledger entry for an issue status change (fire-and-forget).
func appendLedger(issueID, status, userID, role, detail string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	payload, _ := json.Marshal(map[string]interface{}{
		"issue_id":           issueID,
		"status":             status,
		"changed_by_user_id": userID,
		"changed_by_role":    role,
		"detail":             detail,
	})

	req, err := http.NewRequestWithContext(ctx, "POST", "http://ledger:8006/api/v1/ledger/entry", bytes.NewReader(payload))
	if err != nil {
		logger.Error().Err(err).Str("issue_id", issueID).Msg("failed to create ledger request")
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.Warn().Err(err).Str("issue_id", issueID).Msg("ledger service unavailable")
		return
	}
	resp.Body.Close()
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

// statusLabel returns a human-readable label for an issue status.
func statusLabel(status model.IssueStatus) string {
	labels := map[model.IssueStatus]string{
		model.StatusReported:        "Reported",
		model.StatusAcknowledged:    "Acknowledged",
		model.StatusAssigned:        "Assigned",
		model.StatusWorkStarted:     "Work Started",
		model.StatusCompleted:       "Completed",
		model.StatusCitizenVerified: "Citizen Verified",
		model.StatusResolved:        "Resolved",
	}
	if label, ok := labels[status]; ok {
		return label
	}
	return string(status)
}

// isValidStatusTransition checks if a status transition is valid.
func isValidStatusTransition(from, to model.IssueStatus) bool {
	transitions := map[model.IssueStatus][]model.IssueStatus{
		model.StatusReported:        {model.StatusAcknowledged},
		model.StatusAcknowledged:    {model.StatusAssigned},
		model.StatusAssigned:        {model.StatusWorkStarted},
		model.StatusWorkStarted:     {model.StatusCompleted},
		model.StatusCompleted:       {model.StatusCitizenVerified, model.StatusWorkStarted},
		model.StatusCitizenVerified: {model.StatusResolved},
	}

	allowed, exists := transitions[from]
	if !exists {
		return false
	}

	for _, status := range allowed {
		if status == to {
			return true
		}
	}
	return false
}
