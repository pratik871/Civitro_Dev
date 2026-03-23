package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"
	"unicode/utf8"

	"github.com/civitro/pkg/events"
	"github.com/civitro/services/voices/internal/model"
	"github.com/civitro/services/voices/internal/repository"
)

// Service implements the business logic for the voices service.
type Service struct {
	repo      repository.Repository
	producer *events.Producer
}

// New creates a new voices Service.
func New(repo repository.Repository, producer *events.Producer) *Service {
	return &Service{
		repo:     repo,
		producer: producer,
	}
}

// CreateVoice creates a new voice post.
func (s *Service) CreateVoice(ctx context.Context, userID string, req *model.CreateVoiceRequest) (*model.VoiceResponse, error) {
	if utf8.RuneCountInString(req.Text) > model.MaxVoiceTextLength {
		return nil, fmt.Errorf("text exceeds maximum length of %d characters", model.MaxVoiceTextLength)
	}

	if req.Text == "" {
		return nil, errors.New("text is required")
	}

	voice := &model.Voice{
		ID:        generateID(),
		UserID:    userID,
		Text:      req.Text,
		MediaURLs: req.MediaURLs,
		Hashtags:  req.Hashtags,
		Mentions:  req.Mentions,
		Location:  req.Location,
		Language:  req.Language,
		CreatedAt: time.Now().UTC(),
	}

	if err := s.repo.Create(ctx, voice); err != nil {
		return nil, fmt.Errorf("failed to create voice: %w", err)
	}

	// Publish voice created event
	payload, _ := json.Marshal(map[string]interface{}{
		"voice_id": voice.ID,
		"user_id":  userID,
		"hashtags": voice.Hashtags,
		"mentions": voice.Mentions,
	})
	_ = s.producer.Publish(ctx, events.TopicVoiceCreated, voice.ID, payload)

	return &model.VoiceResponse{Voice: *voice}, nil
}

// AddComment adds a comment to a voice.
func (s *Service) AddComment(ctx context.Context, voiceID, userID, text string) (map[string]interface{}, error) {
	id := generateID()
	err := s.repo.AddComment(ctx, id, voiceID, userID, text)
	if err != nil {
		return nil, fmt.Errorf("failed to add comment: %w", err)
	}
	// Increment replies count
	_ = s.repo.IncrementCounter(ctx, voiceID, "replies_count", 1)
	return map[string]interface{}{
		"id": id, "voice_id": voiceID, "user_id": userID, "content": text,
	}, nil
}

// GetComments returns all comments for a voice.
func (s *Service) GetComments(ctx context.Context, voiceID string) ([]map[string]interface{}, error) {
	return s.repo.GetComments(ctx, voiceID)
}

// UpvoteComment toggles upvote on a comment.
func (s *Service) UpvoteComment(ctx context.Context, commentID, userID string) (bool, error) {
	return s.repo.ToggleCommentUpvote(ctx, commentID, userID)
}

// ReplyToComment adds a reply to a comment.
func (s *Service) ReplyToComment(ctx context.Context, voiceID, parentID, userID, text string) (map[string]interface{}, error) {
	id := generateID()
	err := s.repo.AddReply(ctx, id, voiceID, parentID, userID, text)
	if err != nil {
		return nil, fmt.Errorf("failed to add reply: %w", err)
	}
	return map[string]interface{}{
		"id": id, "voice_id": voiceID, "parent_id": parentID, "user_id": userID, "content": text,
	}, nil
}

// HasUserLiked checks if a user has liked a voice.
func (s *Service) HasUserLiked(ctx context.Context, voiceID, userID string) bool {
	return s.repo.HasUserReaction(ctx, voiceID, userID, "like")
}

// GetFeed retrieves a paginated feed of voices.
func (s *Service) GetFeed(ctx context.Context, boundaryID, cursor string, limit int) (*model.FeedResponse, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	voices, nextCursor, err := s.repo.GetFeed(ctx, boundaryID, cursor, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get feed: %w", err)
	}

	return &model.FeedResponse{
		Voices:     voices,
		NextCursor: nextCursor,
	}, nil
}

// GetVoice retrieves a single voice by ID.
func (s *Service) GetVoice(ctx context.Context, id string) (*model.VoiceResponse, error) {
	voice, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("voice not found")
		}
		return nil, fmt.Errorf("failed to get voice: %w", err)
	}

	return &model.VoiceResponse{Voice: *voice}, nil
}

// ToggleLike toggles a like reaction on a voice.
func (s *Service) ToggleLike(ctx context.Context, voiceID, userID string) (bool, error) {
	// Check if already liked
	existing, err := s.repo.GetReaction(ctx, voiceID, userID, model.ReactionLike)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return false, fmt.Errorf("failed to check reaction: %w", err)
	}

	if existing != nil {
		// Unlike
		if err := s.repo.DeleteReaction(ctx, voiceID, userID, model.ReactionLike); err != nil {
			return false, fmt.Errorf("failed to remove like: %w", err)
		}
		_ = s.repo.IncrementCounter(ctx, voiceID, "likes_count", -1)
		return false, nil
	}

	// Like
	reaction := &model.VoiceReaction{
		VoiceID: voiceID,
		UserID:  userID,
		Type:    model.ReactionLike,
	}
	if err := s.repo.CreateReaction(ctx, reaction); err != nil {
		return false, fmt.Errorf("failed to create like: %w", err)
	}
	_ = s.repo.IncrementCounter(ctx, voiceID, "likes_count", 1)
	return true, nil
}

// ShareVoice records a share action on a voice.
func (s *Service) ShareVoice(ctx context.Context, voiceID, userID string) error {
	reaction := &model.VoiceReaction{
		VoiceID: voiceID,
		UserID:  userID,
		Type:    model.ReactionShare,
	}
	if err := s.repo.CreateReaction(ctx, reaction); err != nil {
		return fmt.Errorf("failed to record share: %w", err)
	}
	_ = s.repo.IncrementCounter(ctx, voiceID, "shares_count", 1)
	return nil
}

// BookmarkVoice toggles a bookmark on a voice.
func (s *Service) BookmarkVoice(ctx context.Context, voiceID, userID string) (bool, error) {
	existing, err := s.repo.GetReaction(ctx, voiceID, userID, model.ReactionBookmark)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return false, fmt.Errorf("failed to check bookmark: %w", err)
	}

	if existing != nil {
		if err := s.repo.DeleteReaction(ctx, voiceID, userID, model.ReactionBookmark); err != nil {
			return false, fmt.Errorf("failed to remove bookmark: %w", err)
		}
		return false, nil
	}

	reaction := &model.VoiceReaction{
		VoiceID: voiceID,
		UserID:  userID,
		Type:    model.ReactionBookmark,
	}
	if err := s.repo.CreateReaction(ctx, reaction); err != nil {
		return false, fmt.Errorf("failed to create bookmark: %w", err)
	}
	return true, nil
}

// GetByHashtag retrieves voices matching a hashtag.
func (s *Service) GetByHashtag(ctx context.Context, hashtag string) (*model.HashtagResponse, error) {
	if hashtag == "" {
		return nil, errors.New("hashtag is required")
	}

	voices, err := s.repo.GetByHashtag(ctx, hashtag, 50)
	if err != nil {
		return nil, fmt.Errorf("failed to get voices by hashtag: %w", err)
	}

	return &model.HashtagResponse{
		Hashtag: hashtag,
		Voices:  voices,
		Count:   len(voices),
	}, nil
}

func generateID() string {
	data := fmt.Sprintf("%d", time.Now().UnixNano())
	h := sha256.Sum256([]byte(data))
	return hex.EncodeToString(h[:16])
}
