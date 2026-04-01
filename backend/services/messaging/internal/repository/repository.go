package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/civitro/services/messaging/internal/model"
)

// MessageRepository handles persistence for conversations and messages.
type MessageRepository struct {
	db *pgxpool.Pool
}

// NewMessageRepository creates a new MessageRepository.
func NewMessageRepository(db *pgxpool.Pool) *MessageRepository {
	return &MessageRepository{db: db}
}

// CreateMessage inserts a new message.
func (r *MessageRepository) CreateMessage(ctx context.Context, msg *model.Message) error {
	query := `
		INSERT INTO messages (id, conversation_id, sender_id, text, media_url, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := r.db.Exec(ctx, query,
		msg.ID, msg.ConversationID, msg.SenderID,
		msg.Text, msg.MediaURL, msg.CreatedAt,
	)
	return err
}

// GetMessages returns messages for a conversation with cursor-based pagination.
// The cursor is the ID of the last message seen; messages older than the cursor are returned.
func (r *MessageRepository) GetMessages(ctx context.Context, conversationID, cursor string, limit int) ([]model.Message, error) {
	if limit <= 0 {
		limit = 50
	}

	var query string
	var args []interface{}

	if cursor == "" {
		query = `
			SELECT id, conversation_id, sender_id, text, media_url, created_at
			FROM messages
			WHERE conversation_id = $1
			ORDER BY created_at DESC
			LIMIT $2`
		args = []interface{}{conversationID, limit}
	} else {
		query = `
			SELECT id, conversation_id, sender_id, text, media_url, created_at
			FROM messages
			WHERE conversation_id = $1 AND created_at < (
				SELECT created_at FROM messages WHERE id = $2
			)
			ORDER BY created_at DESC
			LIMIT $3`
		args = []interface{}{conversationID, cursor, limit}
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []model.Message
	for rows.Next() {
		var m model.Message
		if err := rows.Scan(
			&m.ID, &m.ConversationID, &m.SenderID,
			&m.Text, &m.MediaURL, &m.CreatedAt,
		); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}

// GetConversations returns all conversations for a user with preview information.
// Uses the conversation_participants join table and last_read_at for unread counts.
func (r *MessageRepository) GetConversations(ctx context.Context, userID string) ([]model.ConversationPreview, error) {
	query := `
		SELECT c.id,
		       COALESCE(
		           (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
		           ''
		       ) AS last_message,
		       (SELECT MAX(created_at)::text FROM messages WHERE conversation_id = c.id) AS last_message_at,
		       COALESCE(
		           (SELECT COUNT(*) FROM messages m
		            WHERE m.conversation_id = c.id
		              AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamp)),
		           0
		       ) AS unread_count,
		       COALESCE(other_user.id::text, '') AS other_user_id,
		       COALESCE(other_user.name, 'Citizen') AS other_user_name,
		       COALESCE(other_user.role, '') AS other_user_role
		FROM conversations c
		JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
		LEFT JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id != $1
		LEFT JOIN users other_user ON other_user.id = cp2.user_id
		ORDER BY (
			SELECT MAX(created_at) FROM messages WHERE conversation_id = c.id
		) DESC NULLS LAST`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var previews []model.ConversationPreview
	for rows.Next() {
		var p model.ConversationPreview
		if err := rows.Scan(
			&p.ConversationID, &p.LastMessage, &p.LastMessageAt, &p.UnreadCount,
			&p.OtherUserID, &p.OtherUserName, &p.OtherUserRole,
		); err != nil {
			return nil, err
		}
		previews = append(previews, p)
	}
	return previews, rows.Err()
}

// CreateConversation inserts a new conversation and its participants.
func (r *MessageRepository) CreateConversation(ctx context.Context, conv *model.Conversation) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Insert the conversation row.
	convQuery := `
		INSERT INTO conversations (id, type, created_at)
		VALUES ($1, $2, $3)`

	_, err = tx.Exec(ctx, convQuery, conv.ID, conv.Type, conv.CreatedAt)
	if err != nil {
		return err
	}

	// Insert each participant into the join table.
	participantQuery := `
		INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
		VALUES ($1, $2, $3)`

	for _, userID := range conv.Participants {
		_, err = tx.Exec(ctx, participantQuery, conv.ID, userID, conv.CreatedAt)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// FindDMConversation finds an existing DM conversation between two users.
// Returns nil if no conversation exists.
func (r *MessageRepository) FindDMConversation(ctx context.Context, userA, userB string) (*model.Conversation, error) {
	query := `
		SELECT c.id, c.type, c.created_at
		FROM conversations c
		WHERE c.type = 'dm'
		  AND c.id IN (
			SELECT cp1.conversation_id
			FROM conversation_participants cp1
			JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
			WHERE cp1.user_id = $1 AND cp2.user_id = $2
		  )
		LIMIT 1`

	var conv model.Conversation
	err := r.db.QueryRow(ctx, query, userA, userB).Scan(
		&conv.ID, &conv.Type, &conv.CreatedAt,
	)
	if err != nil {
		return nil, err // pgx.ErrNoRows if not found
	}
	conv.Participants = []string{userA, userB}
	return &conv, nil
}

// GetConversationByID returns a conversation by its ID, including its participants.
func (r *MessageRepository) GetConversationByID(ctx context.Context, id string) (*model.Conversation, error) {
	convQuery := `
		SELECT id, type, created_at
		FROM conversations
		WHERE id = $1`

	var conv model.Conversation
	err := r.db.QueryRow(ctx, convQuery, id).Scan(
		&conv.ID, &conv.Type, &conv.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Fetch participants from the join table.
	partQuery := `
		SELECT user_id FROM conversation_participants
		WHERE conversation_id = $1`

	rows, err := r.db.Query(ctx, partQuery, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		conv.Participants = append(conv.Participants, userID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &conv, nil
}

// MarkAsRead updates the last_read_at timestamp for a user in a conversation,
// marking all current messages as read.
func (r *MessageRepository) MarkAsRead(ctx context.Context, conversationID, userID string) error {
	query := `
		UPDATE conversation_participants
		SET last_read_at = NOW()
		WHERE conversation_id = $1 AND user_id = $2`

	_, err := r.db.Exec(ctx, query, conversationID, userID)
	return err
}
