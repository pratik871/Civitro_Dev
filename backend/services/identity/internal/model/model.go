package model

import "time"

// VerificationLevel indicates how far a user has been verified.
type VerificationLevel string

const (
	VerificationPhone  VerificationLevel = "phone"
	VerificationAadhaar VerificationLevel = "aadhaar"
	VerificationFull   VerificationLevel = "full"
)

// User represents a registered platform user.
type User struct {
	ID                string            `json:"id"`
	Phone             string            `json:"phone"`
	Name              string            `json:"name"`
	Email             string            `json:"email,omitempty"`
	VerificationLevel VerificationLevel `json:"verification_level"`
	AadhaarHash       string            `json:"-"`
	DeviceFingerprint string            `json:"device_fingerprint,omitempty"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
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

// VerifyAadhaarRequest is the payload for Aadhaar verification.
type VerifyAadhaarRequest struct {
	AadhaarNumber string `json:"aadhaar_number" binding:"required"`
	OTP           string `json:"otp" binding:"required"`
}

// ProfileResponse is the response for user profile retrieval.
type ProfileResponse struct {
	ID                string            `json:"id"`
	Phone             string            `json:"phone"`
	Name              string            `json:"name"`
	Email             string            `json:"email,omitempty"`
	VerificationLevel VerificationLevel `json:"verification_level"`
	CreatedAt         time.Time         `json:"created_at"`
}
