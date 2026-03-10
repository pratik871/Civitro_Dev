package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	apperrors "github.com/civitro/pkg/errors"
	"github.com/civitro/services/admin/internal/model"
	"github.com/civitro/services/admin/internal/service"
)

// Handler handles HTTP requests for the admin service.
type Handler struct {
	svc *service.Service
}

// New creates a new admin handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes registers all admin HTTP routes.
func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/admin/moderation/queue", h.GetModerationQueue)
	r.PUT("/admin/moderation/:id/review", h.ReviewItem)
	r.GET("/admin/audit-log", h.GetAuditLog)
	r.POST("/admin/users/:id/suspend", h.SuspendUser)
	r.DELETE("/admin/users/:id/suspend", h.UnsuspendUser)
	r.GET("/admin/appeals", h.GetAppeals)
	r.PUT("/admin/appeals/:id/review", h.ReviewAppeal)
	r.GET("/admin/stats", h.GetPlatformStats)
}

// GetModerationQueue handles GET /admin/moderation/queue
func (h *Handler) GetModerationQueue(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	queue, err := h.svc.GetModerationQueue(c.Request.Context(), page, limit)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, queue)
}

// ReviewItem handles PUT /admin/moderation/:id/review
func (h *Handler) ReviewItem(c *gin.Context) {
	itemID := c.Param("id")
	adminUserID := c.GetString("user_id")
	ipAddress := c.ClientIP()

	var req model.ReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	if err := h.svc.ReviewItem(c.Request.Context(), itemID, req, adminUserID, ipAddress); err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// GetAuditLog handles GET /admin/audit-log
func (h *Handler) GetAuditLog(c *gin.Context) {
	adminUserID := c.Query("admin_user_id")
	action := c.Query("action")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	auditLog, err := h.svc.GetAuditLog(c.Request.Context(), adminUserID, action, page, limit)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, auditLog)
}

// SuspendUser handles POST /admin/users/:id/suspend
func (h *Handler) SuspendUser(c *gin.Context) {
	userID := c.Param("id")
	adminUserID := c.GetString("user_id")
	ipAddress := c.ClientIP()

	var req model.SuspendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	if err := h.svc.SuspendUser(c.Request.Context(), userID, req, adminUserID, ipAddress); err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "suspended"})
}

// UnsuspendUser handles DELETE /admin/users/:id/suspend
func (h *Handler) UnsuspendUser(c *gin.Context) {
	userID := c.Param("id")
	adminUserID := c.GetString("user_id")
	ipAddress := c.ClientIP()

	if err := h.svc.UnsuspendUser(c.Request.Context(), userID, adminUserID, ipAddress); err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "unsuspended"})
}

// GetAppeals handles GET /admin/appeals
func (h *Handler) GetAppeals(c *gin.Context) {
	status := model.AppealStatus(c.Query("status"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	appeals, err := h.svc.GetAppeals(c.Request.Context(), status, page, limit)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, appeals)
}

// ReviewAppeal handles PUT /admin/appeals/:id/review
func (h *Handler) ReviewAppeal(c *gin.Context) {
	appealID := c.Param("id")
	adminUserID := c.GetString("user_id")
	ipAddress := c.ClientIP()

	var req model.AppealReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	if err := h.svc.ReviewAppeal(c.Request.Context(), appealID, req, adminUserID, ipAddress); err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// GetPlatformStats handles GET /admin/stats
func (h *Handler) GetPlatformStats(c *gin.Context) {
	stats, err := h.svc.GetPlatformStats(c.Request.Context())
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, stats)
}
