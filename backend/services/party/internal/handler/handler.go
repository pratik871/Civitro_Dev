package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	apperrors "github.com/civitro/pkg/errors"
	"github.com/civitro/services/party/internal/model"
	"github.com/civitro/services/party/internal/service"
)

// Handler handles HTTP requests for the party service.
type Handler struct {
	svc *service.Service
}

// New creates a new party handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes registers all party HTTP routes.
func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	r.POST("/orgs", h.CreateOrg)
	r.GET("/orgs/:id", h.GetOrg)
	r.POST("/orgs/:id/members", h.AddMember)
	r.GET("/orgs/:id/members", h.GetMembers)
	r.DELETE("/orgs/:id/members/:user_id", h.RemoveMember)
	r.POST("/orgs/:id/broadcast", h.SendBroadcast)
	r.GET("/orgs/:id/broadcasts", h.GetBroadcasts)
	r.PUT("/orgs/:id/members/:user_id/role", h.UpdateMemberRole)
	r.GET("/orgs/:id/analytics", h.GetAnalytics)
}

// CreateOrg handles POST /orgs
func (h *Handler) CreateOrg(c *gin.Context) {
	var req model.CreateOrgRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	org, err := h.svc.CreateOrg(c.Request.Context(), req)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, org)
}

// GetOrg handles GET /orgs/:id
func (h *Handler) GetOrg(c *gin.Context) {
	orgID := c.Param("id")

	org, err := h.svc.GetOrg(c.Request.Context(), orgID)
	if err != nil {
		apperrors.AbortWithError(c, apperrors.ErrNotFound.WithMessage("organization not found"))
		return
	}

	c.JSON(http.StatusOK, org)
}

// AddMember handles POST /orgs/:id/members
func (h *Handler) AddMember(c *gin.Context) {
	orgID := c.Param("id")

	var req model.AddMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	member, err := h.svc.AddMember(c.Request.Context(), orgID, req)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, member)
}

// GetMembers handles GET /orgs/:id/members
func (h *Handler) GetMembers(c *gin.Context) {
	orgID := c.Param("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	result, err := h.svc.GetMembers(c.Request.Context(), orgID, page, limit)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

// RemoveMember handles DELETE /orgs/:id/members/:user_id
func (h *Handler) RemoveMember(c *gin.Context) {
	orgID := c.Param("id")
	userID := c.Param("user_id")

	if err := h.svc.RemoveMember(c.Request.Context(), orgID, userID); err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "removed"})
}

// SendBroadcast handles POST /orgs/:id/broadcast
func (h *Handler) SendBroadcast(c *gin.Context) {
	orgID := c.Param("id")
	senderID := c.GetString("user_id")

	var req model.BroadcastRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	broadcast, err := h.svc.SendBroadcast(c.Request.Context(), orgID, senderID, req)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, broadcast)
}

// GetBroadcasts handles GET /orgs/:id/broadcasts
func (h *Handler) GetBroadcasts(c *gin.Context) {
	orgID := c.Param("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	result, err := h.svc.GetBroadcasts(c.Request.Context(), orgID, page, limit)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

// UpdateMemberRole handles PUT /orgs/:id/members/:user_id/role
func (h *Handler) UpdateMemberRole(c *gin.Context) {
	orgID := c.Param("id")
	userID := c.Param("user_id")

	var req model.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	if err := h.svc.UpdateMemberRole(c.Request.Context(), orgID, userID, req); err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

// GetAnalytics handles GET /orgs/:id/analytics
func (h *Handler) GetAnalytics(c *gin.Context) {
	orgID := c.Param("id")

	analytics, err := h.svc.GetAnalytics(c.Request.Context(), orgID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, analytics)
}
