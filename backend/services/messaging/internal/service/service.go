package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"github.com/civitro/pkg/logger"
	"github.com/civitro/services/messaging/internal/model"
	"github.com/civitro/services/messaging/internal/repository"
)

// MessagingService contains business logic for conversations and messaging.
type MessagingService struct {
	repo *repository.MessageRepository
	hub  *WebSocketHub
}

// NewMessagingService creates a new MessagingService.
func NewMessagingService(repo *repository.MessageRepository) *MessagingService {
	hub := NewWebSocketHub()
	go hub.Run()

	return &MessagingService{
		repo: repo,
		hub:  hub,
	}
}

// SendMessage creates a new message and broadcasts it to connected WebSocket clients.
func (s *MessagingService) SendMessage(ctx context.Context, req model.SendMessageRequest) (*model.Message, error) {
	// Verify the sender is a participant in the conversation.
	conv, err := s.repo.GetConversationByID(ctx, req.ConversationID)
	if err != nil {
		return nil, fmt.Errorf("conversation not found: %w", err)
	}

	isParticipant := false
	for _, p := range conv.Participants {
		if p == req.SenderID {
			isParticipant = true
			break
		}
	}
	if !isParticipant {
		return nil, fmt.Errorf("user is not a participant in this conversation")
	}

	msg := &model.Message{
		ID:             generateID(),
		ConversationID: req.ConversationID,
		SenderID:       req.SenderID,
		Text:           req.Text,
		MediaURL:       req.MediaURL,
		ReadBy:         []string{req.SenderID}, // Sender has read their own message.
		CreatedAt:      time.Now().UTC(),
	}

	if err := s.repo.CreateMessage(ctx, msg); err != nil {
		logger.Error().Err(err).Msg("failed to create message")
		return nil, err
	}

	// Broadcast to WebSocket clients.
	s.hub.BroadcastToConversation(req.ConversationID, model.WebSocketMessage{
		Type:    "message",
		Payload: msg,
	})

	logger.Info().
		Str("msg_id", msg.ID).
		Str("conv_id", req.ConversationID).
		Str("sender", req.SenderID).
		Msg("message sent")
	return msg, nil
}

// GetMessages returns messages for a conversation with cursor-based pagination.
func (s *MessagingService) GetMessages(ctx context.Context, conversationID, cursor string) ([]model.Message, error) {
	messages, err := s.repo.GetMessages(ctx, conversationID, cursor, 50)
	if err != nil {
		logger.Error().Err(err).Str("conv_id", conversationID).Msg("failed to get messages")
		return nil, err
	}

	if messages == nil {
		messages = []model.Message{}
	}
	return messages, nil
}

// GetConversations returns all conversation previews for a user.
func (s *MessagingService) GetConversations(ctx context.Context, userID string) ([]model.ConversationPreview, error) {
	previews, err := s.repo.GetConversations(ctx, userID)
	if err != nil {
		logger.Error().Err(err).Str("user_id", userID).Msg("failed to get conversations")
		return nil, err
	}

	if previews == nil {
		previews = []model.ConversationPreview{}
	}
	return previews, nil
}

// CreateConversation creates a new DM or group conversation.
func (s *MessagingService) CreateConversation(ctx context.Context, req model.CreateConversationRequest) (*model.Conversation, error) {
	if len(req.Participants) < 2 {
		return nil, fmt.Errorf("conversation must have at least 2 participants")
	}

	if req.Type == model.ConversationDM && len(req.Participants) != 2 {
		return nil, fmt.Errorf("DM conversations must have exactly 2 participants")
	}

	conv := &model.Conversation{
		ID:           generateID(),
		Type:         req.Type,
		Participants: req.Participants,
		CreatedAt:    time.Now().UTC(),
	}

	if err := s.repo.CreateConversation(ctx, conv); err != nil {
		logger.Error().Err(err).Msg("failed to create conversation")
		return nil, err
	}

	logger.Info().
		Str("conv_id", conv.ID).
		Str("type", string(conv.Type)).
		Int("participants", len(conv.Participants)).
		Msg("conversation created")
	return conv, nil
}

// HandleWebSocket upgrades an HTTP connection to WebSocket and manages the client.
func (s *MessagingService) HandleWebSocket(w http.ResponseWriter, r *http.Request, userID string) {
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins in development; restrict in production.
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error().Err(err).Str("user_id", userID).Msg("websocket upgrade failed")
		return
	}

	client := &WebSocketClient{
		UserID: userID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		Hub:    s.hub,
	}

	s.hub.Register <- client

	// Start read and write pumps in separate goroutines.
	go client.WritePump()
	go client.ReadPump()
}

// GetHub returns the WebSocket hub for external access.
func (s *MessagingService) GetHub() *WebSocketHub {
	return s.hub
}

// --- WebSocket Hub ---

// WebSocketHub manages active WebSocket connections and message broadcasting.
// For multi-instance deployment, use Redis pub/sub to relay messages across instances.
type WebSocketHub struct {
	// Registered clients indexed by user ID.
	clients map[string]*WebSocketClient

	// Channel for registering clients.
	Register chan *WebSocketClient

	// Channel for unregistering clients.
	Unregister chan *WebSocketClient

	// Mutex for thread-safe client map access.
	mu sync.RWMutex
}

// NewWebSocketHub creates a new WebSocketHub.
func NewWebSocketHub() *WebSocketHub {
	return &WebSocketHub{
		clients:    make(map[string]*WebSocketClient),
		Register:   make(chan *WebSocketClient),
		Unregister: make(chan *WebSocketClient),
	}
}

// Run starts the hub's main event loop.
func (h *WebSocketHub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.clients[client.UserID] = client
			h.mu.Unlock()
			logger.Info().Str("user_id", client.UserID).Msg("websocket client connected")

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.UserID]; ok {
				delete(h.clients, client.UserID)
				close(client.Send)
			}
			h.mu.Unlock()
			logger.Info().Str("user_id", client.UserID).Msg("websocket client disconnected")
		}
	}
}

// BroadcastToConversation sends a message to all participants in a conversation.
// In production, this would also publish to Redis pub/sub for cross-instance delivery.
func (h *WebSocketHub) BroadcastToConversation(conversationID string, msg model.WebSocketMessage) {
	// TODO: Look up conversation participants and send to each.
	// For now, broadcast to all connected clients. In production, filter by participants
	// and use Redis pub/sub for multi-instance coordination.
	_ = conversationID

	data, err := encodeJSON(msg)
	if err != nil {
		logger.Error().Err(err).Msg("failed to encode websocket message")
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, client := range h.clients {
		select {
		case client.Send <- data:
		default:
			// Client send buffer is full; drop the message.
			logger.Warn().Str("user_id", client.UserID).Msg("dropping message for slow client")
		}
	}
}

// IsOnline checks whether a user has an active WebSocket connection.
func (h *WebSocketHub) IsOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	_, ok := h.clients[userID]
	return ok
}

// --- WebSocket Client ---

// WebSocketClient represents a single WebSocket connection.
type WebSocketClient struct {
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
	Hub    *WebSocketHub
}

// ReadPump reads messages from the WebSocket connection.
func (c *WebSocketClient) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(4096)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Error().Err(err).Str("user_id", c.UserID).Msg("websocket read error")
			}
			break
		}
		// Handle incoming messages (typing indicators, read receipts, etc.)
		// In production, parse the message and route accordingly.
	}
}

// WritePump writes messages to the WebSocket connection.
func (c *WebSocketClient) WritePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Drain any queued messages into the current write.
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte("\n"))
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			// Send ping to keep connection alive.
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// --- Helpers ---

func generateID() string {
	return time.Now().UTC().Format("20060102150405.000000")
}

func encodeJSON(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}
