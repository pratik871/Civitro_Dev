package model

import "encoding/json"

// OfficialType distinguishes elected, appointed, and nominated officials.
type OfficialType string

const (
	OfficialElected   OfficialType = "elected"
	OfficialAppointed OfficialType = "appointed"
	OfficialNominated OfficialType = "nominated"
)

// Representative represents an elected or appointed public official.
type Representative struct {
	ID               string          `json:"id"`
	Name             string          `json:"name"`
	Party            string          `json:"party"`
	Position         string          `json:"position"`
	Level            string          `json:"level"`
	BoundaryID       string          `json:"boundary_id"`
	PhotoURL         string          `json:"photo_url,omitempty"`
	Claimed          bool            `json:"claimed"`
	ClaimedByUserID  string          `json:"claimed_by_user_id,omitempty"`
	Verified         bool            `json:"verified"`
	Rating           float64         `json:"rating"`
	ContactInfo      json.RawMessage `json:"contact_info,omitempty"`
	OfficialType     OfficialType    `json:"official_type"`
	Designation      string          `json:"designation,omitempty"`
	StateDesignation string          `json:"state_designation,omitempty"`
	TermStart        *string         `json:"term_start,omitempty"`
	TermEnd          *string         `json:"term_end,omitempty"`
	ElectionCycleID  string          `json:"election_cycle_id,omitempty"`
	StaffAccounts    []StaffAccount  `json:"staff_accounts,omitempty"`
}

// StaffAccount represents a staff member managing a representative's profile.
type StaffAccount struct {
	ID          string          `json:"id"`
	RepID       string          `json:"rep_id"`
	UserID      string          `json:"user_id"`
	Role        string          `json:"role"`
	Permissions json.RawMessage `json:"permissions,omitempty"`
}

// ElectionCycle represents a specific election event.
type ElectionCycle struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	ElectionType string  `json:"election_type"`
	StateCode    *string `json:"state_code,omitempty"`
	Year         int     `json:"year"`
	Month        *int    `json:"month,omitempty"`
	Status       string  `json:"status"`
}

// SeatReservation represents the reservation category for a seat in a specific election cycle.
type SeatReservation struct {
	ID                  string `json:"id"`
	BoundaryID          string `json:"boundary_id"`
	ElectionCycleID     string `json:"election_cycle_id"`
	ReservationCategory string `json:"reservation_category"`
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

// CreateRepresentativeRequest is the payload for creating a representative.
type CreateRepresentativeRequest struct {
	Name             string          `json:"name" binding:"required"`
	Party            string          `json:"party"`
	Position         string          `json:"position" binding:"required"`
	Level            string          `json:"level" binding:"required"`
	BoundaryID       string          `json:"boundary_id"`
	PhotoURL         string          `json:"photo_url"`
	OfficialType     string          `json:"official_type" binding:"required"`
	Designation      string          `json:"designation" binding:"required"`
	StateDesignation string          `json:"state_designation"`
	TermStart        *string         `json:"term_start"`
	TermEnd          *string         `json:"term_end"`
	ElectionCycleID  string          `json:"election_cycle_id"`
	ContactInfo      json.RawMessage `json:"contact_info"`
}
