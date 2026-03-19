package model

import "time"

// VerificationLevel indicates how far a user has been verified.
type VerificationLevel string

const (
	VerificationPhone   VerificationLevel = "phone"
	VerificationAadhaar VerificationLevel = "aadhaar"
	VerificationFull    VerificationLevel = "full"
)

// User represents a registered platform user.
type User struct {
	ID                string            `json:"id"`
	Phone             string            `json:"phone"`
	Name              string            `json:"name"`
	Email             string            `json:"email,omitempty"`
	Role              string            `json:"role"`
	VerificationLevel VerificationLevel `json:"verification_level"`
	AadhaarHash       string            `json:"-"`
	DeviceFingerprint string            `json:"device_fingerprint,omitempty"`
	PreferredLanguage string            `json:"preferred_language"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
}

// RefreshToken represents a stored refresh token.
type RefreshToken struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	TokenHash  string    `json:"-"`
	DeviceInfo string    `json:"device_info,omitempty"`
	ExpiresAt  time.Time `json:"expires_at"`
	CreatedAt  time.Time `json:"created_at"`
}

// AadhaarVerification stores a completed Aadhaar verification record.
type AadhaarVerification struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	ReferenceID    string    `json:"reference_id"`
	UIDHash        string    `json:"-"`
	Name           string    `json:"name"`
	DOB            string    `json:"dob"`
	Gender         string    `json:"gender"`
	Address        string    `json:"address,omitempty"`
	PhotoKey       string    `json:"photo_key,omitempty"`
	SignatureValid bool      `json:"signature_valid"`
	XMLTimestamp   time.Time `json:"xml_timestamp"`
	VerifiedAt     time.Time `json:"verified_at"`
}

// RegisterRequest is the payload for user registration.
type RegisterRequest struct {
	Phone             string `json:"phone" binding:"required"`
	Name              string `json:"name" binding:"required"`
	DeviceFingerprint string `json:"device_fingerprint"`
}

// RegisterResponse is returned after successful registration.
type RegisterResponse struct {
	UserID  string `json:"user_id"`
	Message string `json:"message"`
}

// VerifyOTPRequest is the payload for OTP verification.
type VerifyOTPRequest struct {
	Phone string `json:"phone" binding:"required"`
	OTP   string `json:"otp" binding:"required"`
}

// AuthTokenResponse is returned after successful authentication.
type AuthTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

// RefreshRequest is the payload for token refresh.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// VerifyAadhaarResponse is returned after successful Aadhaar verification.
type VerifyAadhaarResponse struct {
	Message           string            `json:"message"`
	Name              string            `json:"name"`
	VerificationLevel VerificationLevel `json:"verification_level"`
}

// ProfileResponse is the response for user profile retrieval.
type ProfileResponse struct {
	ID                string            `json:"id"`
	Phone             string            `json:"phone"`
	Name              string            `json:"name"`
	Email             string            `json:"email,omitempty"`
	Role              string            `json:"role"`
	VerificationLevel VerificationLevel `json:"verification_level"`
	PreferredLanguage string            `json:"preferred_language"`
	CivicScore        int               `json:"civic_score"`
	ReputationTier    string            `json:"reputation_tier"`
	CreatedAt         time.Time         `json:"created_at"`
}
