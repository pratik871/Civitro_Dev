package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	apperrors "github.com/civitro/pkg/errors"
	"github.com/civitro/services/notifications/internal/model"
	"github.com/civitro/services/notifications/internal/service"
)

// Handler handles HTTP requests for the notifications service.
type Handler struct {
	svc *service.Service
}

// New creates a new notifications handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes registers all notification HTTP routes (auth-protected).
func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	// User-scoped routes under /notifications/users/:user_id
	users := r.Group("/notifications/users/:user_id")
	users.GET("", h.GetNotifications)
	users.GET("/prefs", h.GetPrefs)
	users.PUT("/prefs", h.UpdatePrefs)
	users.GET("/unread-count", h.GetUnreadCount)
	users.PUT("/read-all", h.MarkAllRead)
	users.DELETE("/clear", h.ClearAll)

	// Notification-scoped routes under /notifications/:id
	r.PUT("/notifications/:id/read", h.MarkRead)
}

// RegisterInternalRoutes registers internal service-to-service endpoints (no auth).
func (h *Handler) RegisterInternalRoutes(r *gin.RouterGroup) {
	r.POST("/notifications/send", h.SendNotification)
}

// GetNotifications handles GET /notifications/:user_id
func (h *Handler) GetNotifications(c *gin.Context) {
	userID := c.Param("user_id")
	cursor := c.Query("cursor")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	result, err := h.svc.GetNotifications(c.Request.Context(), userID, cursor, limit)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

// MarkRead handles PUT /notifications/:id/read
func (h *Handler) MarkRead(c *gin.Context) {
	notificationID := c.Param("id")

	if err := h.svc.MarkRead(c.Request.Context(), notificationID); err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// MarkAllRead handles PUT /notifications/users/:user_id/read-all
func (h *Handler) MarkAllRead(c *gin.Context) {
	userID := c.Param("user_id")

	if err := h.svc.MarkAllRead(c.Request.Context(), userID); err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// ClearAll handles DELETE /notifications/users/:user_id/clear
func (h *Handler) ClearAll(c *gin.Context) {
	userID := c.Param("user_id")
	if err := h.svc.ClearAll(c.Request.Context(), userID); err != nil {
		apperrors.HandleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// GetPrefs handles GET /notifications/:user_id/prefs
func (h *Handler) GetPrefs(c *gin.Context) {
	userID := c.Param("user_id")

	prefs, err := h.svc.GetPrefs(c.Request.Context(), userID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, prefs)
}

// UpdatePrefs handles PUT /notifications/:user_id/prefs
func (h *Handler) UpdatePrefs(c *gin.Context) {
	userID := c.Param("user_id")

	var prefs model.NotificationPrefs
	if err := c.ShouldBindJSON(&prefs); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}
	prefs.UserID = userID

	if err := h.svc.UpdatePrefs(c.Request.Context(), &prefs); err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// SendNotification handles POST /notifications/send (internal service-to-service).
func (h *Handler) SendNotification(c *gin.Context) {
	var req model.SendNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	if err := h.svc.SendNotification(c.Request.Context(), req); err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"status": "sent"})
}

// GetUnreadCount handles GET /notifications/:user_id/unread-count
func (h *Handler) GetUnreadCount(c *gin.Context) {
	userID := c.Param("user_id")

	result, err := h.svc.GetUnreadCount(c.Request.Context(), userID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}
