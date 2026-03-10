package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/civitro/pkg/events"
	"github.com/civitro/services/geospatial/internal/model"
	"github.com/civitro/services/geospatial/internal/repository"
)

// Service implements the business logic for the geospatial service.
type Service struct {
	repo      repository.Repository
	producer *events.Producer
}

// New creates a new geospatial Service.
func New(repo repository.Repository, producer *events.Producer) *Service {
	return &Service{
		repo:     repo,
		producer: producer,
	}
}

// ResolveLocation resolves a lat/lng coordinate to all containing boundaries.
func (s *Service) ResolveLocation(ctx context.Context, lat, lng float64) (*model.ResolveResponse, error) {
	if lat < -90 || lat > 90 {
		return nil, errors.New("latitude must be between -90 and 90")
	}
	if lng < -180 || lng > 180 {
		return nil, errors.New("longitude must be between -180 and 180")
	}

	boundaries, err := s.repo.FindBoundariesContaining(ctx, lat, lng)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve location: %w", err)
	}

	// Publish location resolved event
	payload, _ := json.Marshal(map[string]interface{}{
		"lat":            lat,
		"lng":            lng,
		"boundary_count": len(boundaries),
	})
	_ = s.producer.Publish(ctx, events.TopicLocationResolved, fmt.Sprintf("%.6f,%.6f", lat, lng), payload)

	return &model.ResolveResponse{Boundaries: boundaries}, nil
}

// GetBoundary retrieves a boundary by its ID.
func (s *Service) GetBoundary(ctx context.Context, id string) (*model.BoundaryResponse, error) {
	boundary, err := s.repo.GetBoundaryByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("boundary not found")
		}
		return nil, fmt.Errorf("failed to get boundary: %w", err)
	}

	return &model.BoundaryResponse{Boundary: *boundary}, nil
}

// GetChildren retrieves all child boundaries of a given boundary.
func (s *Service) GetChildren(ctx context.Context, parentID string) (*model.ChildrenResponse, error) {
	// Verify parent exists
	_, err := s.repo.GetBoundaryByID(ctx, parentID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("parent boundary not found")
		}
		return nil, fmt.Errorf("failed to verify parent boundary: %w", err)
	}

	children, err := s.repo.GetChildBoundaries(ctx, parentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get child boundaries: %w", err)
	}

	return &model.ChildrenResponse{Children: children}, nil
}

// GetUserRepresentatives retrieves all representatives assigned to a user.
func (s *Service) GetUserRepresentatives(ctx context.Context, userID string) (*model.UserRepresentativesResponse, error) {
	assignments, err := s.repo.GetAssignmentsByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user representatives: %w", err)
	}

	return &model.UserRepresentativesResponse{
		UserID:          userID,
		Representatives: assignments,
	}, nil
}

// AssignRepresentatives creates representative assignments for a user based on their location boundaries.
func (s *Service) AssignRepresentatives(ctx context.Context, userID string, assignments []model.RepAssignment) error {
	for _, a := range assignments {
		a.UserID = userID
		if err := s.repo.CreateAssignment(ctx, &a); err != nil {
			return fmt.Errorf("failed to create assignment for boundary %s: %w", a.BoundaryID, err)
		}
	}
	return nil
}
