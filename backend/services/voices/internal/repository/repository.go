package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/civitro/services/voices/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository defines the data access interface for the voices service.
type Repository interface {
	Create(ctx context.Context, voice *model.Voice) error
	GetByID(ctx context.Context, id string) (*model.Voice, error)
	GetFeed(ctx context.Context, boundaryID string, cursor string, limit int) ([]model.Voice, string, error)
	IncrementCounter(ctx context.Context, voiceID string, field string, delta int) error
	CreateReaction(ctx context.Context, reaction *model.VoiceReaction) error
	DeleteReaction(ctx context.Context, voiceID, userID string, reactionType model.ReactionType) error
	GetReaction(ctx context.Context, voiceID, userID string, reactionType model.ReactionType) (*model.VoiceReaction, error)
	GetByHashtag(ctx context.Context, hashtag string, limit int) ([]model.Voice, error)
}

// ErrNotFound is returned when a record is not found.
var ErrNotFound = errors.New("record not found")

// PostgresRepository implements Repository using PostgreSQL.
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository creates a new PostgresRepository.
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// Create inserts a new voice into the database.
func (r *PostgresRepository) Create(ctx context.Context, voice *model.Voice) error {
	query := `
		INSERT INTO voices (id, user_id, text, media_urls, hashtags, mentions,
		                     location_lat, location_lng, language, likes_count,
		                     replies_count, shares_count, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	var lat, lng *float64
	if voice.Location != nil {
		lat = &voice.Location.Lat
		lng = &voice.Location.Lng
	}

	_, err := r.pool.Exec(ctx, query,
		voice.ID, voice.UserID, voice.Text, voice.MediaURLs, voice.Hashtags,
		voice.Mentions, lat, lng, voice.Language,
		voice.LikesCount, voice.RepliesCount, voice.SharesCount, voice.CreatedAt,
	)
	return err
}

// GetByID retrieves a voice by its ID.
func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*model.Voice, error) {
	query := `
		SELECT id, user_id, text, media_urls, hashtags, mentions,
		       location_lat, location_lng, language, likes_count,
		       replies_count, shares_count, created_at
		FROM voices WHERE id = $1
	`

	voice := &model.Voice{}
	var lat, lng *float64
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&voice.ID, &voice.UserID, &voice.Text, &voice.MediaURLs, &voice.Hashtags,
		&voice.Mentions, &lat, &lng, &voice.Language,
		&voice.LikesCount, &voice.RepliesCount, &voice.SharesCount, &voice.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if lat != nil && lng != nil {
		voice.Location = &model.Location{Lat: *lat, Lng: *lng}
	}

	return voice, nil
}

// GetFeed retrieves a paginated feed of voices for a boundary.
func (r *PostgresRepository) GetFeed(ctx context.Context, boundaryID string, cursor string, limit int) ([]model.Voice, string, error) {
	if limit <= 0 {
		limit = 20
	}

	var query string
	var args []interface{}

	if cursor != "" {
		query = `
			SELECT id, user_id, text, media_urls, hashtags, mentions,
			       location_lat, location_lng, language, likes_count,
			       replies_count, shares_count, created_at
			FROM voices
			WHERE created_at < (SELECT created_at FROM voices WHERE id = $1)
			ORDER BY created_at DESC
			LIMIT $2
		`
		args = []interface{}{cursor, limit + 1}
	} else {
		query = `
			SELECT id, user_id, text, media_urls, hashtags, mentions,
			       location_lat, location_lng, language, likes_count,
			       replies_count, shares_count, created_at
			FROM voices
			ORDER BY created_at DESC
			LIMIT $1
		`
		args = []interface{}{limit + 1}
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var voices []model.Voice
	for rows.Next() {
		var v model.Voice
		var lat, lng *float64
		if err := rows.Scan(
			&v.ID, &v.UserID, &v.Text, &v.MediaURLs, &v.Hashtags,
			&v.Mentions, &lat, &lng, &v.Language,
			&v.LikesCount, &v.RepliesCount, &v.SharesCount, &v.CreatedAt,
		); err != nil {
			return nil, "", err
		}
		if lat != nil && lng != nil {
			v.Location = &model.Location{Lat: *lat, Lng: *lng}
		}
		voices = append(voices, v)
	}

	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	var nextCursor string
	if len(voices) > limit {
		nextCursor = voices[limit-1].ID
		voices = voices[:limit]
	}

	return voices, nextCursor, nil
}

// IncrementCounter atomically increments a counter field on a voice.
func (r *PostgresRepository) IncrementCounter(ctx context.Context, voiceID string, field string, delta int) error {
	// Validate field to prevent SQL injection
	validFields := map[string]bool{"likes_count": true, "replies_count": true, "shares_count": true}
	if !validFields[field] {
		return fmt.Errorf("invalid counter field: %s", field)
	}

	query := fmt.Sprintf("UPDATE voices SET %s = %s + $1 WHERE id = $2", field, field)
	tag, err := r.pool.Exec(ctx, query, delta, voiceID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// CreateReaction inserts a new reaction.
func (r *PostgresRepository) CreateReaction(ctx context.Context, reaction *model.VoiceReaction) error {
	query := `
		INSERT INTO voice_reactions (voice_id, user_id, type)
		VALUES ($1, $2, $3)
		ON CONFLICT (voice_id, user_id, type) DO NOTHING
	`
	_, err := r.pool.Exec(ctx, query, reaction.VoiceID, reaction.UserID, reaction.Type)
	return err
}

// DeleteReaction removes a reaction.
func (r *PostgresRepository) DeleteReaction(ctx context.Context, voiceID, userID string, reactionType model.ReactionType) error {
	query := `DELETE FROM voice_reactions WHERE voice_id = $1 AND user_id = $2 AND type = $3`
	_, err := r.pool.Exec(ctx, query, voiceID, userID, reactionType)
	return err
}

// GetReaction retrieves a specific reaction.
func (r *PostgresRepository) GetReaction(ctx context.Context, voiceID, userID string, reactionType model.ReactionType) (*model.VoiceReaction, error) {
	query := `
		SELECT voice_id, user_id, type FROM voice_reactions
		WHERE voice_id = $1 AND user_id = $2 AND type = $3
	`
	reaction := &model.VoiceReaction{}
	err := r.pool.QueryRow(ctx, query, voiceID, userID, reactionType).Scan(
		&reaction.VoiceID, &reaction.UserID, &reaction.Type,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return reaction, nil
}

// GetByHashtag retrieves voices containing a specific hashtag.
func (r *PostgresRepository) GetByHashtag(ctx context.Context, hashtag string, limit int) ([]model.Voice, error) {
	if limit <= 0 {
		limit = 20
	}

	query := `
		SELECT id, user_id, text, media_urls, hashtags, mentions,
		       location_lat, location_lng, language, likes_count,
		       replies_count, shares_count, created_at
		FROM voices
		WHERE $1 = ANY(hashtags)
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, hashtag, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var voices []model.Voice
	for rows.Next() {
		var v model.Voice
		var lat, lng *float64
		if err := rows.Scan(
			&v.ID, &v.UserID, &v.Text, &v.MediaURLs, &v.Hashtags,
			&v.Mentions, &lat, &lng, &v.Language,
			&v.LikesCount, &v.RepliesCount, &v.SharesCount, &v.CreatedAt,
		); err != nil {
			return nil, err
		}
		if lat != nil && lng != nil {
			v.Location = &model.Location{Lat: *lat, Lng: *lng}
		}
		voices = append(voices, v)
	}

	return voices, rows.Err()
}

func generateID() string {
	data := fmt.Sprintf("%d", time.Now().UnixNano())
	h := sha256.Sum256([]byte(data))
	return hex.EncodeToString(h[:16])
}
