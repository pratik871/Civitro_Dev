package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	apperrors "github.com/civitro/pkg/errors"
	"github.com/civitro/services/messaging/internal/model"
	"github.com/civitro/services/messaging/internal/service"
)

// MessagingHandler handles HTTP and WebSocket requests for the messaging service.
type MessagingHandler struct {
	svc *service.MessagingService
}

// NewMessagingHandler creates a new MessagingHandler.
func NewMessagingHandler(svc *service.MessagingService) *MessagingHandler {
	return &MessagingHandler{svc: svc}
}

// RegisterRoutes registers messaging routes on the given Gin router group.
func (h *MessagingHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/messages", h.SendMessage)
	rg.GET("/messages/:conversation_id", h.GetMessages)
	rg.GET("/conversations", h.GetConversations)
	rg.POST("/conversations", h.CreateConversation)
}

// RegisterWebSocket registers the WebSocket upgrade handler.
func (h *MessagingHandler) RegisterWebSocket(router *gin.Engine) {
	router.GET("/ws/messages", h.HandleWebSocket)
}

// SendMessage sends a new message in a conversation.
// POST /messages
func (h *MessagingHandler) SendMessage(c *gin.Context) {
	var req model.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	msg, err := h.svc.SendMessage(c.Request.Context(), req)
	if err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, msg)
}

// GetMessages returns messages for a conversation with cursor-based pagination.
// GET /messages/:conversation_id?cursor=xxx
func (h *MessagingHandler) GetMessages(c *gin.Context) {
	conversationID := c.Param("conversation_id")
	if conversationID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("conversation_id is required"))
		return
	}

	cursor := c.Query("cursor")

	messages, err := h.svc.GetMessages(c.Request.Context(), conversationID, cursor)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"conversation_id": conversationID,
		"messages":        messages,
	})
}

// GetConversations returns all conversations for the authenticated user.
// GET /conversations
func (h *MessagingHandler) GetConversations(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		apperrors.AbortWithError(c, apperrors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	previews, err := h.svc.GetConversations(c.Request.Context(), userID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"conversations": previews,
	})
}

// CreateConversation creates a new DM or group conversation.
// POST /conversations
func (h *MessagingHandler) CreateConversation(c *gin.Context) {
	var req model.CreateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	conv, err := h.svc.CreateConversation(c.Request.Context(), req)
	if err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, conv)
}

// HandleWebSocket upgrades the HTTP connection to a WebSocket.
// GET /ws/messages?user_id=xxx
func (h *MessagingHandler) HandleWebSocket(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		userID = c.GetString("user_id")
	}
	if userID == "" {
		apperrors.AbortWithError(c, apperrors.ErrUnauthorized.WithMessage("user_id is required for WebSocket"))
		return
	}

	h.svc.HandleWebSocket(c.Writer, c.Request, userID)
}
