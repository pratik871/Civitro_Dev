package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/civitro/pkg/events"
	"github.com/civitro/services/registry/internal/model"
	"github.com/civitro/services/registry/internal/repository"
)

// Service implements the business logic for the registry service.
type Service struct {
	repo      repository.Repository
	producer *events.Producer
}

// New creates a new registry Service.
func New(repo repository.Repository, producer *events.Producer) *Service {
	return &Service{
		repo:     repo,
		producer: producer,
	}
}

// ListAll retrieves all verified representatives.
func (s *Service) ListAll(ctx context.Context) ([]model.Representative, error) {
	reps, err := s.repo.ListAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list representatives: %w", err)
	}
	return reps, nil
}

// GetRepresentative retrieves a representative by ID.
// GetRepresentativeStats returns enriched stats for a representative profile.
func (s *Service) GetRepresentativeStats(ctx context.Context, id string) (map[string]interface{}, error) {
	return s.repo.GetRepresentativeStats(ctx, id)
}

func (s *Service) GetRepresentative(ctx context.Context, id string) (*model.RepresentativeResponse, error) {
	rep, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("representative not found")
		}
		return nil, fmt.Errorf("failed to get representative: %w", err)
	}

	// Fetch staff accounts if the profile is claimed
	if rep.Claimed {
		staff, err := s.repo.GetStaffByRepID(ctx, id)
		if err == nil {
			rep.StaffAccounts = staff
		}
	}

	return &model.RepresentativeResponse{Representative: *rep}, nil
}

// GetByBoundary retrieves all representatives for a boundary.
func (s *Service) GetByBoundary(ctx context.Context, boundaryID string) (*model.RepresentativeListResponse, error) {
	reps, err := s.repo.GetByBoundaryID(ctx, boundaryID)
	if err != nil {
		return nil, fmt.Errorf("failed to get representatives: %w", err)
	}

	return &model.RepresentativeListResponse{Representatives: reps}, nil
}

// GetByDesignation retrieves representatives by canonical designation.
func (s *Service) GetByDesignation(ctx context.Context, designation string, boundaryID string) (*model.RepresentativeListResponse, error) {
	reps, err := s.repo.GetByDesignation(ctx, designation, boundaryID)
	if err != nil {
		return nil, fmt.Errorf("failed to get representatives by designation: %w", err)
	}

	return &model.RepresentativeListResponse{Representatives: reps}, nil
}

// GetByOfficialType retrieves representatives by type (elected/appointed).
func (s *Service) GetByOfficialType(ctx context.Context, officialType string, boundaryID string) (*model.RepresentativeListResponse, error) {
	reps, err := s.repo.GetByOfficialType(ctx, officialType, boundaryID)
	if err != nil {
		return nil, fmt.Errorf("failed to get representatives by type: %w", err)
	}

	return &model.RepresentativeListResponse{Representatives: reps}, nil
}

// CreateRepresentative creates a new representative record.
func (s *Service) CreateRepresentative(ctx context.Context, req *model.CreateRepresentativeRequest) (*model.RepresentativeResponse, error) {
	rep, err := s.repo.Create(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create representative: %w", err)
	}

	// Publish creation event
	payload, _ := json.Marshal(map[string]string{
		"rep_id":      rep.ID,
		"designation": rep.Designation,
		"level":       rep.Level,
	})
	_ = s.producer.Publish(ctx, events.TopicRepClaimed, rep.ID, payload)

	return &model.RepresentativeResponse{Representative: *rep}, nil
}

// ClaimProfile allows a verified user to claim a representative profile.
func (s *Service) ClaimProfile(ctx context.Context, repID string, req *model.ClaimRequest) (*model.ClaimResponse, error) {
	rep, err := s.repo.GetByID(ctx, repID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("representative not found")
		}
		return nil, fmt.Errorf("failed to get representative: %w", err)
	}

	if rep.Claimed {
		return nil, errors.New("this profile has already been claimed")
	}

	// TODO: Verify user's identity level is sufficient (Aadhaar or full)
	// TODO: Cross-check with identity service

	if err := s.repo.UpdateClaim(ctx, repID, req.UserID); err != nil {
		return nil, fmt.Errorf("failed to claim profile: %w", err)
	}

	payload, _ := json.Marshal(map[string]string{
		"rep_id":  repID,
		"user_id": req.UserID,
	})
	_ = s.producer.Publish(ctx, events.TopicRepClaimed, repID, payload)

	return &model.ClaimResponse{
		Message: "profile claimed successfully, pending verification",
		Claimed: true,
	}, nil
}

// AddStaff adds a staff member to a representative's team.
func (s *Service) AddStaff(ctx context.Context, repID string, req *model.AddStaffRequest) (*model.StaffAccount, error) {
	rep, err := s.repo.GetByID(ctx, repID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("representative not found")
		}
		return nil, fmt.Errorf("failed to get representative: %w", err)
	}

	if !rep.Claimed {
		return nil, errors.New("profile must be claimed before adding staff")
	}

	staff := &model.StaffAccount{
		RepID:       repID,
		UserID:      req.UserID,
		Role:        req.Role,
		Permissions: req.Permissions,
	}

	if err := s.repo.CreateStaff(ctx, staff); err != nil {
		return nil, fmt.Errorf("failed to add staff: %w", err)
	}

	return staff, nil
}

// GetStaff retrieves all staff accounts for a representative.
func (s *Service) GetStaff(ctx context.Context, repID string) (*model.StaffListResponse, error) {
	staff, err := s.repo.GetStaffByRepID(ctx, repID)
	if err != nil {
		return nil, fmt.Errorf("failed to get staff: %w", err)
	}

	return &model.StaffListResponse{Staff: staff}, nil
}
