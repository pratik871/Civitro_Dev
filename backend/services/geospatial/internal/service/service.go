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

// ResolveLocation resolves a lat/lng coordinate to all containing boundaries,
// grouped by governance track (administrative, electoral, urban/rural local body).
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

	// Build governance chain grouped by track
	chain := buildGovernanceChain(boundaries)

	// Publish location resolved event
	payload, _ := json.Marshal(map[string]interface{}{
		"lat":            lat,
		"lng":            lng,
		"boundary_count": len(boundaries),
	})
	_ = s.producer.Publish(ctx, events.TopicLocationResolved, fmt.Sprintf("%.6f,%.6f", lat, lng), payload)

	return &model.ResolveResponse{
		Boundaries:      boundaries,
		GovernanceChain: chain,
	}, nil
}

// buildGovernanceChain groups boundaries into administrative, electoral, and local body tracks.
func buildGovernanceChain(boundaries []model.Boundary) *model.GovernanceChain {
	if len(boundaries) == 0 {
		return nil
	}

	chain := &model.GovernanceChain{}
	for _, b := range boundaries {
		switch b.Track {
		case model.TrackAdministrative:
			chain.Administrative = append(chain.Administrative, b)
		case model.TrackElectoral:
			chain.Electoral = append(chain.Electoral, b)
		case model.TrackUrban, model.TrackRural:
			chain.LocalBody = append(chain.LocalBody, b)
		}
	}
	return chain
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

// GetNomenclature retrieves governance naming for a state.
func (s *Service) GetNomenclature(ctx context.Context, stateCode string) (*model.NomenclatureResponse, error) {
	entries, err := s.repo.GetNomenclature(ctx, stateCode)
	if err != nil {
		return nil, fmt.Errorf("failed to get nomenclature: %w", err)
	}

	return &model.NomenclatureResponse{Entries: entries}, nil
}
