package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/civitro/pkg/events"
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

	return &model.IssueResponse{Issue: *issue}, nil
}

// GetIssue retrieves an issue by ID.
func (s *Service) GetIssue(ctx context.Context, id string) (*model.IssueResponse, error) {
	issue, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("issue not found")
		}
		return nil, fmt.Errorf("failed to get issue: %w", err)
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

// UpvoteIssue increments the upvote count for an issue.
func (s *Service) UpvoteIssue(ctx context.Context, issueID string) error {
	if err := s.repo.IncrementUpvotes(ctx, issueID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return errors.New("issue not found")
		}
		return fmt.Errorf("failed to upvote issue: %w", err)
	}
	return nil
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
