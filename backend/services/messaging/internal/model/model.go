package model

import "time"

// ConversationType defines the kind of conversation.
type ConversationType string

const (
	ConversationDM        ConversationType = "dm"
	ConversationGroup     ConversationType = "group"
	ConversationBroadcast ConversationType = "broadcast"
)

// Conversation represents a messaging thread between participants.
type Conversation struct {
	ID           string           `json:"id" db:"id"`
	Type         ConversationType `json:"type" db:"type"`
	Participants []string         `json:"participants"` // populated from conversation_participants table
	CreatedAt    time.Time        `json:"created_at" db:"created_at"`
}

// Message represents a single message within a conversation.
type Message struct {
	ID             string    `json:"id" db:"id"`
	ConversationID string    `json:"conversation_id" db:"conversation_id"`
	SenderID       string    `json:"sender_id" db:"sender_id"`
	Text           string    `json:"text" db:"text"`
	MediaURL       string    `json:"media_url,omitempty" db:"media_url"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

// ConversationPreview is a summary view of a conversation for listing.
type ConversationPreview struct {
	ConversationID string `json:"conversation_id"`
	OtherUserID    string `json:"other_user_id"`
	OtherUserName  string `json:"other_user_name"`
	OtherUserRole  string `json:"other_user_role"`
	LastMessage    string `json:"last_message"`
	UnreadCount    int    `json:"unread_count"`
	Online         bool   `json:"online"`
}

// SendMessageRequest is the payload for sending a message.
type SendMessageRequest struct {
	ConversationID string `json:"conversation_id" binding:"required"`
	SenderID       string `json:"sender_id" binding:"required"`
	Text           string `json:"text" binding:"required"`
	MediaURL       string `json:"media_url"`
}

// CreateConversationRequest is the payload for creating a new conversation.
type CreateConversationRequest struct {
	Type         ConversationType `json:"type" binding:"required"`
	Participants []string         `json:"participants" binding:"required,min=2"`
}

// WebSocketMessage is the envelope for messages sent over WebSocket.
type WebSocketMessage struct {
	Type    string      `json:"type"` // "message", "typing", "read", "online"
	Payload interface{} `json:"payload"`
}
