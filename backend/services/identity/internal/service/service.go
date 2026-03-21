package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/civitro/pkg/config"
	apperrors "github.com/civitro/pkg/errors"
	"github.com/civitro/pkg/events"
	"github.com/civitro/pkg/otp"
	"github.com/civitro/pkg/sms"
	"github.com/civitro/pkg/storage"
	"github.com/civitro/pkg/aadhaar"
	"github.com/civitro/pkg/middleware"
	"github.com/civitro/services/identity/internal/model"
	"github.com/civitro/services/identity/internal/repository"
)

// Service implements the business logic for the identity service.
type Service struct {
	repo        repository.Repository
	producer    *events.Producer
	redis       *redis.Client
	smsProvider sms.Provider
	storage     *storage.S3Client
}

// New creates a new identity Service.
func New(repo repository.Repository, producer *events.Producer, rdb *redis.Client, smsProvider sms.Provider, store *storage.S3Client) *Service {
	return &Service{
		repo:        repo,
		producer:    producer,
		redis:       rdb,
		smsProvider: smsProvider,
		storage:     store,
	}
}

// RegisterUser registers a new user with their phone number and sends an OTP.
func (s *Service) RegisterUser(ctx context.Context, req *model.RegisterRequest) (*model.RegisterResponse, error) {
	if len(req.Phone) < 10 {
		return nil, errors.New("invalid phone number")
	}

	// Check if user already exists.
	existing, err := s.repo.GetUserByPhone(ctx, req.Phone)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}

	var userID string

	if existing != nil {
		// User exists — send new OTP for login.
		userID = existing.ID
	} else {
		// Create new user.
		now := time.Now().UTC()
		user := &model.User{
			ID:                uuid.New().String(),
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
		userID = user.ID

		// Publish user registered event.
		payload, _ := json.Marshal(map[string]string{
			"user_id": user.ID,
			"phone":   user.Phone,
		})
		_ = s.producer.Publish(ctx, events.TopicUserRegistered, user.ID, payload)
	}

	// Rate limit OTP sends: max 5 per phone per hour.
	if err := otp.CheckRateLimit(ctx, s.redis, req.Phone, 5); err != nil {
		return nil, fmt.Errorf("OTP rate limit: %w", err)
	}

	// Generate and store OTP.
	// In dev/docker mode, use a fixed OTP for easy testing.
	// Fixed OTP for now — switch to otp.Generate(6) when SMS provider is ready.
	code := "111111"

	if err := otp.Store(ctx, s.redis, req.Phone, code, 5*time.Minute); err != nil {
		return nil, fmt.Errorf("storing OTP: %w", err)
	}

	// Send OTP via SMS.
	msg := fmt.Sprintf("Your Civitro verification code is: %s. Valid for 5 minutes.", code)
	if err := s.smsProvider.Send(ctx, req.Phone, msg); err != nil {
		return nil, fmt.Errorf("sending OTP: %w", err)
	}

	return &model.RegisterResponse{
		UserID:  userID,
		Message: "OTP sent to registered phone number",
	}, nil
}

// VerifyOTP verifies the one-time password and returns real JWT + refresh tokens.
func (s *Service) VerifyOTP(ctx context.Context, req *model.VerifyOTPRequest) (*model.AuthTokenResponse, error) {
	if len(req.OTP) != 6 {
		return nil, errors.New("OTP must be 6 digits")
	}

	// Validate OTP against Redis.
	if err := otp.Validate(ctx, s.redis, req.Phone, req.OTP); err != nil {
		switch {
		case errors.Is(err, otp.ErrInvalidOTP):
			return nil, apperrors.ErrBadRequest.WithMessage("invalid OTP")
		case errors.Is(err, otp.ErrOTPExpired):
			return nil, apperrors.ErrBadRequest.WithMessage("OTP expired or not found")
		case errors.Is(err, otp.ErrMaxAttempts):
			return nil, apperrors.ErrRateLimited.WithMessage("maximum verification attempts exceeded")
		default:
			return nil, fmt.Errorf("OTP validation: %w", err)
		}
	}

	// Look up user.
	user, err := s.repo.GetUserByPhone(ctx, req.Phone)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Generate JWT access token.
	accessToken, err := middleware.GenerateToken(user.ID, string(user.VerificationLevel), user.Role)
	if err != nil {
		return nil, fmt.Errorf("generating access token: %w", err)
	}

	// Generate refresh token: 64 random bytes → hex string.
	refreshRaw, refreshHash, err := generateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("generating refresh token: %w", err)
	}

	// Parse refresh token expiry from config.
	cfg := config.Get()
	refreshExpiry, err := time.ParseDuration(cfg.Auth.JWT.RefreshTokenExpiry)
	if err != nil {
		refreshExpiry = 30 * 24 * time.Hour // 30 days fallback
	}

	// Store refresh token in database.
	now := time.Now().UTC()
	rt := &model.RefreshToken{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		TokenHash: refreshHash,
		ExpiresAt: now.Add(refreshExpiry),
		CreatedAt: now,
	}
	if err := s.repo.CreateRefreshToken(ctx, rt); err != nil {
		return nil, fmt.Errorf("storing refresh token: %w", err)
	}

	// Revoke OTP keys from Redis.
	otp.Revoke(ctx, s.redis, req.Phone)

	// Parse access token expiry for ExpiresIn.
	accessExpiry, err := time.ParseDuration(cfg.Auth.JWT.AccessTokenExpiry)
	if err != nil {
		accessExpiry = 24 * time.Hour
	}

	return &model.AuthTokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshRaw,
		ExpiresIn:    int64(accessExpiry.Seconds()),
	}, nil
}

// RefreshToken issues a new access + refresh token pair using a valid refresh token.
// The old refresh token is deleted (rotation).
func (s *Service) RefreshToken(ctx context.Context, req *model.RefreshRequest) (*model.AuthTokenResponse, error) {
	if req.RefreshToken == "" {
		return nil, errors.New("refresh token is required")
	}

	// Hash the incoming token to look it up.
	hash := sha256Hash(req.RefreshToken)

	stored, err := s.repo.GetRefreshTokenByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("invalid refresh token")
		}
		return nil, fmt.Errorf("looking up refresh token: %w", err)
	}

	// Check expiry.
	if time.Now().After(stored.ExpiresAt) {
		s.repo.DeleteRefreshToken(ctx, stored.ID)
		return nil, errors.New("refresh token expired")
	}

	// Delete old refresh token (rotation).
	if err := s.repo.DeleteRefreshToken(ctx, stored.ID); err != nil {
		return nil, fmt.Errorf("revoking old refresh token: %w", err)
	}

	// Look up user for claims.
	user, err := s.repo.GetUserByID(ctx, stored.UserID)
	if err != nil {
		return nil, fmt.Errorf("looking up user: %w", err)
	}

	// Generate new access token.
	accessToken, err := middleware.GenerateToken(user.ID, string(user.VerificationLevel), user.Role)
	if err != nil {
		return nil, fmt.Errorf("generating access token: %w", err)
	}

	// Generate new refresh token.
	refreshRaw, refreshHash, err := generateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("generating refresh token: %w", err)
	}

	cfg := config.Get()
	refreshExpiry, err := time.ParseDuration(cfg.Auth.JWT.RefreshTokenExpiry)
	if err != nil {
		refreshExpiry = 30 * 24 * time.Hour
	}

	now := time.Now().UTC()
	rt := &model.RefreshToken{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		TokenHash: refreshHash,
		ExpiresAt: now.Add(refreshExpiry),
		CreatedAt: now,
	}
	if err := s.repo.CreateRefreshToken(ctx, rt); err != nil {
		return nil, fmt.Errorf("storing refresh token: %w", err)
	}

	accessExpiry, err := time.ParseDuration(cfg.Auth.JWT.AccessTokenExpiry)
	if err != nil {
		accessExpiry = 24 * time.Hour
	}

	return &model.AuthTokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshRaw,
		ExpiresIn:    int64(accessExpiry.Seconds()),
	}, nil
}

// GetProfile retrieves the user profile by ID, including civic score.
func (s *Service) GetProfile(ctx context.Context, userID string) (*model.ProfileResponse, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	civicScore, tier := s.repo.GetCivicScore(ctx, userID)
	lat, lng, boundaryID, boundaryName := s.repo.GetUserLocation(ctx, userID)

	return &model.ProfileResponse{
		ID:                user.ID,
		Phone:             user.Phone,
		Name:              user.Name,
		Email:             user.Email,
		Role:              user.Role,
		VerificationLevel: user.VerificationLevel,
		PreferredLanguage: user.PreferredLanguage,
		CivicScore:        civicScore,
		ReputationTier:    tier,
		BoundaryID:        boundaryID,
		BoundaryName:      boundaryName,
		Lat:               lat,
		Lng:               lng,
		CreatedAt:         user.CreatedAt,
	}, nil
}

// UpdateLanguage updates the user's preferred language.
func (s *Service) UpdateLanguage(ctx context.Context, userID, language string) error {
	return s.repo.UpdatePreferredLanguage(ctx, userID, language)
}

// UpdateLocation updates the user's GPS location, resolves boundaries via the geospatial service,
// and stores the primary (most granular) boundary.
func (s *Service) UpdateLocation(ctx context.Context, userID string, req *model.UpdateLocationRequest) (*model.UpdateLocationResponse, error) {
	if req.Lat < -90 || req.Lat > 90 || req.Lng < -180 || req.Lng > 180 {
		return nil, errors.New("invalid coordinates")
	}

	// Call geospatial service to resolve boundaries
	cfg := config.Get()
	geoHost := cfg.Services.Endpoints["geospatial"]
	geoURL := fmt.Sprintf("http://%s:%d/api/v1/geo/resolve", geoHost.Host, geoHost.HTTPPort)

	payload, _ := json.Marshal(map[string]float64{"lat": req.Lat, "lng": req.Lng})
	resp, err := http.Post(geoURL, "application/json", bytes.NewReader(payload))

	var boundaries []model.Boundary
	var primaryBoundaryID, primaryBoundaryName, primaryBoundaryLevel string

	if err == nil && resp.StatusCode == 200 {
		defer resp.Body.Close()
		var geoResp struct {
			Boundaries []struct {
				ID    string `json:"id"`
				Name  string `json:"name"`
				Level string `json:"level"`
				Track string `json:"track"`
			} `json:"boundaries"`
		}
		if json.NewDecoder(resp.Body).Decode(&geoResp) == nil {
			for _, b := range geoResp.Boundaries {
				boundaries = append(boundaries, model.Boundary{
					ID: b.ID, Name: b.Name, Level: b.Level, Track: b.Track,
				})
			}
			// Primary = most granular (last in sorted list)
			if len(geoResp.Boundaries) > 0 {
				last := geoResp.Boundaries[len(geoResp.Boundaries)-1]
				primaryBoundaryID = last.ID
				primaryBoundaryName = last.Name
				primaryBoundaryLevel = last.Level
			}
		}
	}

	// Store location + primary boundary in users table
	if err := s.repo.UpdateLocation(ctx, userID, req.Lat, req.Lng, primaryBoundaryID); err != nil {
		return nil, fmt.Errorf("failed to update location: %w", err)
	}

	// Publish location event
	evtPayload, _ := json.Marshal(map[string]interface{}{
		"user_id":     userID,
		"lat":         req.Lat,
		"lng":         req.Lng,
		"boundary_id": primaryBoundaryID,
	})
	_ = s.producer.Publish(ctx, events.TopicUserRegistered, userID, evtPayload)

	return &model.UpdateLocationResponse{
		Message:       "location updated",
		BoundaryID:    primaryBoundaryID,
		BoundaryName:  primaryBoundaryName,
		BoundaryLevel: primaryBoundaryLevel,
		Boundaries:    boundaries,
	}, nil
}

// VerifyAadhaar processes offline Aadhaar XML verification for a user.
func (s *Service) VerifyAadhaar(ctx context.Context, userID string, zipData []byte, shareCode string) (*model.VerifyAadhaarResponse, error) {
	// Check if user is already Aadhaar-verified.
	existing, err := s.repo.GetAadhaarVerificationByUser(ctx, userID)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, fmt.Errorf("checking existing verification: %w", err)
	}
	if existing != nil {
		return nil, errors.New("user is already Aadhaar-verified")
	}

	// Determine dev mode from config.
	cfg := config.Get()
	devMode := cfg.Auth.Aadhaar.Provider == "offline-dev"

	// Verify the offline XML.
	data, err := aadhaar.VerifyOfflineXML(zipData, shareCode, devMode)
	if err != nil {
		return nil, fmt.Errorf("aadhaar verification: %w", err)
	}

	// Check dedup: same Aadhaar on another account.
	dupCheck, err := s.repo.GetAadhaarVerificationByUIDHash(ctx, data.UIDHash)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, fmt.Errorf("dedup check: %w", err)
	}
	if dupCheck != nil {
		return nil, errors.New("this Aadhaar is already linked to another account")
	}

	// Store photo in MinIO if available.
	var photoKey string
	if len(data.Photo) > 0 && s.storage != nil {
		photoKey = fmt.Sprintf("kyc/%s/aadhaar-photo.jpg", userID)
		_, err := s.storage.Upload(ctx, photoKey, bytes.NewReader(data.Photo), int64(len(data.Photo)), "image/jpeg")
		if err != nil {
			return nil, fmt.Errorf("uploading photo: %w", err)
		}
	}

	// Create verification record.
	now := time.Now().UTC()
	v := &model.AadhaarVerification{
		ID:             uuid.New().String(),
		UserID:         userID,
		ReferenceID:    data.ReferenceID,
		UIDHash:        data.UIDHash,
		Name:           data.Name,
		DOB:            data.DOB,
		Gender:         data.Gender,
		Address:        data.Address,
		PhotoKey:       photoKey,
		SignatureValid: !devMode, // true if real sig verification ran
		XMLTimestamp:   data.Timestamp,
		VerifiedAt:     now,
	}

	if err := s.repo.CreateAadhaarVerification(ctx, v); err != nil {
		return nil, fmt.Errorf("storing verification: %w", err)
	}

	// Update user verification level.
	if err := s.repo.UpdateVerificationLevel(ctx, userID, model.VerificationAadhaar, data.UIDHash); err != nil {
		return nil, fmt.Errorf("updating verification level: %w", err)
	}

	// Publish verification event.
	verPayload, _ := json.Marshal(map[string]string{
		"user_id": userID,
		"level":   string(model.VerificationAadhaar),
	})
	_ = s.producer.Publish(ctx, events.TopicUserVerified, userID, verPayload)

	return &model.VerifyAadhaarResponse{
		Message:           "Aadhaar verification successful",
		Name:              data.Name,
		VerificationLevel: model.VerificationAadhaar,
	}, nil
}

// GetDashboardStats returns aggregated dashboard stats for the authenticated user.
func (s *Service) GetDashboardStats(ctx context.Context, userID string) (*model.DashboardStats, error) {
	// Verify user exists.
	_, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	stats, err := s.repo.GetDashboardStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get dashboard stats: %w", err)
	}

	return stats, nil
}

// generateRefreshToken returns (raw hex string, SHA256 hash of raw, error).
func generateRefreshToken() (string, string, error) {
	b := make([]byte, 64)
	if _, err := rand.Read(b); err != nil {
		return "", "", fmt.Errorf("generating random bytes: %w", err)
	}
	raw := hex.EncodeToString(b)
	hash := sha256Hash(raw)
	return raw, hash, nil
}

func sha256Hash(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}
