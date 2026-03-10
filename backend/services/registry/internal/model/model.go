package model

import "encoding/json"

// Representative represents an elected or appointed public representative.
type Representative struct {
	ID              string          `json:"id"`
	Name            string          `json:"name"`
	Party           string          `json:"party"`
	Position        string          `json:"position"`
	Level           string          `json:"level"`
	BoundaryID      string          `json:"boundary_id"`
	PhotoURL        string          `json:"photo_url,omitempty"`
	Claimed         bool            `json:"claimed"`
	ClaimedByUserID string          `json:"claimed_by_user_id,omitempty"`
	Verified        bool            `json:"verified"`
	Rating          float64         `json:"rating"`
	ContactInfo     json.RawMessage `json:"contact_info,omitempty"`
	StaffAccounts   []StaffAccount  `json:"staff_accounts,omitempty"`
}

// StaffAccount represents a staff member managing a representative's profile.
type StaffAccount struct {
	ID          string          `json:"id"`
	RepID       string          `json:"rep_id"`
	UserID      string          `json:"user_id"`
	Role        string          `json:"role"`
	Permissions json.RawMessage `json:"permissions,omitempty"`
}

// RepresentativeResponse is the response DTO for a single representative.
type RepresentativeResponse struct {
	Representative Representative `json:"representative"`
}

// RepresentativeListResponse is the response for listing representatives.
type RepresentativeListResponse struct {
	Representatives []Representative `json:"representatives"`
}

// ClaimRequest is the payload for claiming a representative profile.
type ClaimRequest struct {
	UserID       string `json:"user_id" binding:"required"`
	Verification string `json:"verification" binding:"required"`
}

// ClaimResponse is the response after a claim request.
type ClaimResponse struct {
	Message string `json:"message"`
	Claimed bool   `json:"claimed"`
}

// AddStaffRequest is the payload for adding a staff member.
type AddStaffRequest struct {
	UserID      string          `json:"user_id" binding:"required"`
	Role        string          `json:"role" binding:"required"`
	Permissions json.RawMessage `json:"permissions,omitempty"`
}

// StaffListResponse is the response for listing staff accounts.
type StaffListResponse struct {
	Staff []StaffAccount `json:"staff"`
}
