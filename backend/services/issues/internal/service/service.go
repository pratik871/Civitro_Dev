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
	"github.com/civitro/services/issues/internal/model"
	"github.com/civitro/services/issues/internal/repository"
)

// Service implements the business logic for the issues service.
type Service struct {
	repo     repository.Repository
	producer *events.Producer
}

// New creates a new issues Service.
func New(repo repository.Repository, producer *events.Producer) *Service {
	return &Service{
		repo:     repo,
		producer: producer,
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

	// Publish issue created event
	payload, _ := json.Marshal(map[string]interface{}{
		"issue_id": issue.ID,
		"user_id":  userID,
		"category": issue.Category,
		"severity": issue.Severity,
		"gps_lat":  issue.GPSLat,
		"gps_lng":  issue.GPSLng,
	})
	_ = s.producer.Publish(ctx, events.TopicIssueCreated, issue.ID, payload)

	// Award civic score points for reporting an issue
	awardPoints(userID, "report_filed", 10, "Reported issue: "+issue.ID)

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
func (s *Service) GetIssue(ctx context.Context, id, userID string) (*model.IssueResponse, error) {
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
