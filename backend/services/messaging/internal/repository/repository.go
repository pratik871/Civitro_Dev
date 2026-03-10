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
		INSERT INTO messages (id, conversation_id, sender_id, text, media_url, read_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := r.db.Exec(ctx, query,
		msg.ID, msg.ConversationID, msg.SenderID,
		msg.Text, msg.MediaURL, msg.ReadBy, msg.CreatedAt,
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
			SELECT id, conversation_id, sender_id, text, media_url, read_by, created_at
			FROM messages
			WHERE conversation_id = $1
			ORDER BY created_at DESC
			LIMIT $2`
		args = []interface{}{conversationID, limit}
	} else {
		query = `
			SELECT id, conversation_id, sender_id, text, media_url, read_by, created_at
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
			&m.Text, &m.MediaURL, &m.ReadBy, &m.CreatedAt,
		); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}

// GetConversations returns all conversations for a user with preview information.
func (r *MessageRepository) GetConversations(ctx context.Context, userID string) ([]model.ConversationPreview, error) {
	query := `
		SELECT c.id,
		       COALESCE(
		           (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
		           ''
		       ) AS last_message,
		       COALESCE(
		           (SELECT COUNT(*) FROM messages
		            WHERE conversation_id = c.id AND NOT ($1 = ANY(read_by))),
		           0
		       ) AS unread_count
		FROM conversations c
		WHERE $1 = ANY(c.participants)
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
			&p.ConversationID, &p.LastMessage, &p.UnreadCount,
		); err != nil {
			return nil, err
		}
		// OtherUserName, OtherUserRole, and Online status would be enriched
		// via a call to the identity service in production.
		previews = append(previews, p)
	}
	return previews, rows.Err()
}

// CreateConversation inserts a new conversation.
func (r *MessageRepository) CreateConversation(ctx context.Context, conv *model.Conversation) error {
	query := `
		INSERT INTO conversations (id, type, participants, created_at)
		VALUES ($1, $2, $3, $4)`

	_, err := r.db.Exec(ctx, query,
		conv.ID, conv.Type, conv.Participants, conv.CreatedAt,
	)
	return err
}

// GetConversationByID returns a conversation by its ID.
func (r *MessageRepository) GetConversationByID(ctx context.Context, id string) (*model.Conversation, error) {
	query := `
		SELECT id, type, participants, created_at
		FROM conversations
		WHERE id = $1`

	var conv model.Conversation
	err := r.db.QueryRow(ctx, query, id).Scan(
		&conv.ID, &conv.Type, &conv.Participants, &conv.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &conv, nil
}

// MarkAsRead adds a user to the read_by array for all unread messages in a conversation.
func (r *MessageRepository) MarkAsRead(ctx context.Context, conversationID, userID string) error {
	query := `
		UPDATE messages
		SET read_by = array_append(read_by, $1)
		WHERE conversation_id = $2 AND NOT ($1 = ANY(read_by))`

	_, err := r.db.Exec(ctx, query, userID, conversationID)
	return err
}
