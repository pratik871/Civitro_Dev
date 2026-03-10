package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/civitro/pkg/events"
	"github.com/civitro/services/identity/internal/model"
	"github.com/civitro/services/identity/internal/repository"
)

// Service implements the business logic for the identity service.
type Service struct {
	repo     repository.Repository
	producer *events.Producer
}

// New creates a new identity Service.
func New(repo repository.Repository, producer *events.Producer) *Service {
	return &Service{
		repo:     repo,
		producer: producer,
	}
}

// RegisterUser registers a new user with their phone number.
func (s *Service) RegisterUser(ctx context.Context, req *model.RegisterRequest) (*model.RegisterResponse, error) {
	if len(req.Phone) < 10 {
		return nil, errors.New("invalid phone number")
	}

	// Check if user already exists
	existing, err := s.repo.GetUserByPhone(ctx, req.Phone)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}
	if existing != nil {
		return nil, errors.New("user already registered with this phone number")
	}

	now := time.Now().UTC()
	user := &model.User{
		ID:                generateID(),
		Phone:             req.Phone,
		Name:              req.Name,
		VerificationLevel: model.VerificationPhone,
		DeviceFingerprint: req.DeviceFingerprint,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// TODO: Send OTP via SMS gateway
	// Publish user registered event
	payload, _ := json.Marshal(map[string]string{
		"user_id": user.ID,
		"phone":   user.Phone,
	})
	_ = s.producer.Publish(ctx, events.TopicUserRegistered, user.ID, payload)

	return &model.RegisterResponse{
		UserID:  user.ID,
		Message: "OTP sent to registered phone number",
	}, nil
}

// VerifyOTP verifies the one-time password for authentication.
func (s *Service) VerifyOTP(ctx context.Context, req *model.VerifyOTPRequest) (*model.AuthTokenResponse, error) {
	if len(req.OTP) != 6 {
		return nil, errors.New("OTP must be 6 digits")
	}

	user, err := s.repo.GetUserByPhone(ctx, req.Phone)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// TODO: Validate OTP against stored/sent OTP
	// For scaffolding, accept any 6-digit OTP
	_ = user

	// TODO: Generate real JWT tokens
	return &model.AuthTokenResponse{
		AccessToken:  "access-token-placeholder-" + user.ID,
		RefreshToken: "refresh-token-placeholder-" + user.ID,
		ExpiresIn:    3600,
	}, nil
}

// RefreshToken issues a new access token using a valid refresh token.
func (s *Service) RefreshToken(ctx context.Context, req *model.RefreshRequest) (*model.AuthTokenResponse, error) {
	if req.RefreshToken == "" {
		return nil, errors.New("refresh token is required")
	}

	// TODO: Validate refresh token, extract user_id, issue new tokens
	return &model.AuthTokenResponse{
		AccessToken:  "new-access-token-placeholder",
		RefreshToken: "new-refresh-token-placeholder",
		ExpiresIn:    3600,
	}, nil
}

// GetProfile retrieves the user profile by ID.
func (s *Service) GetProfile(ctx context.Context, userID string) (*model.ProfileResponse, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &model.ProfileResponse{
		ID:                user.ID,
		Phone:             user.Phone,
		Name:              user.Name,
		Email:             user.Email,
		VerificationLevel: user.VerificationLevel,
		CreatedAt:         user.CreatedAt,
	}, nil
}

// VerifyAadhaar processes Aadhaar verification for a user.
func (s *Service) VerifyAadhaar(ctx context.Context, userID string, req *model.VerifyAadhaarRequest) error {
	if len(req.AadhaarNumber) != 12 {
		return errors.New("aadhaar number must be 12 digits")
	}

	// Hash the Aadhaar number for storage (never store plaintext)
	hash := sha256.Sum256([]byte(req.AadhaarNumber))
	aadhaarHash := hex.EncodeToString(hash[:])

	// TODO: Verify Aadhaar OTP via UIDAI gateway

	if err := s.repo.UpdateVerificationLevel(ctx, userID, model.VerificationAadhaar, aadhaarHash); err != nil {
		return fmt.Errorf("failed to update verification level: %w", err)
	}

	// Publish verification event
	verPayload, _ := json.Marshal(map[string]string{
		"user_id": userID,
		"level":   string(model.VerificationAadhaar),
	})
	_ = s.producer.Publish(ctx, events.TopicUserVerified, userID, verPayload)

	return nil
}

// generateID creates a unique identifier. In production, use UUID v4.
func generateID() string {
	data := fmt.Sprintf("%d", time.Now().UnixNano())
	h := sha256.Sum256([]byte(data))
	return hex.EncodeToString(h[:16])
}
