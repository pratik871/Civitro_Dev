package model

import "time"

// ReactionType represents the type of reaction a user can have on a voice.
type ReactionType string

const (
	ReactionLike     ReactionType = "like"
	ReactionShare    ReactionType = "share"
	ReactionBookmark ReactionType = "bookmark"
)

// MaxVoiceTextLength is the maximum allowed character count for voice text.
const MaxVoiceTextLength = 500

// Voice represents a citizen voice post.
type Voice struct {
	ID           string            `json:"id"`
	UserID       string            `json:"user_id"`
	Text         string            `json:"text"`
	TextEN       string            `json:"text_en,omitempty"`
	MediaURLs    []string          `json:"media_urls,omitempty"`
	Hashtags     []string          `json:"hashtags,omitempty"`
	Mentions     []string          `json:"mentions,omitempty"`
	Location     *Location         `json:"location,omitempty"`
	Language     string            `json:"language,omitempty"`
	Translations map[string]string `json:"translations,omitempty"`
	LikesCount   int64             `json:"likes_count"`
	RepliesCount int64             `json:"replies_count"`
	SharesCount  int64             `json:"shares_count"`
	HasLiked     bool              `json:"has_liked"`
	CreatedAt    time.Time         `json:"created_at"`
}

// Location represents geographic coordinates.
type Location struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// VoiceReaction represents a user's reaction to a voice post.
type VoiceReaction struct {
	VoiceID string       `json:"voice_id"`
	UserID  string       `json:"user_id"`
	Type    ReactionType `json:"type"`
}

// CreateVoiceRequest is the payload for creating a new voice.
type CreateVoiceRequest struct {
	Text      string    `json:"text" binding:"required"`
	MediaURLs []string  `json:"media_urls,omitempty"`
	Hashtags  []string  `json:"hashtags,omitempty"`
	Mentions  []string  `json:"mentions,omitempty"`
	Location  *Location `json:"location,omitempty"`
	Language  string    `json:"language,omitempty"`
}

// VoiceResponse is the response for a single voice post.
type VoiceResponse struct {
	Voice Voice `json:"voice"`
}

// FeedResponse is the response for a paginated voice feed.
type FeedResponse struct {
	Voices     []Voice `json:"voices"`
	NextCursor string  `json:"next_cursor,omitempty"`
}

// HashtagResponse is the response for voices matching a hashtag.
type HashtagResponse struct {
	Hashtag string  `json:"hashtag"`
	Voices  []Voice `json:"voices"`
	Count   int     `json:"count"`
}
