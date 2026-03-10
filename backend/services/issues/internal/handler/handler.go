package handler

import (
	"net/http"
	"strconv"

	"github.com/civitro/pkg/errors"
	"github.com/civitro/services/issues/internal/model"
	"github.com/civitro/services/issues/internal/service"
	"github.com/gin-gonic/gin"
)

// Handler holds the HTTP handlers for the issues service.
type Handler struct {
	svc *service.Service
}

// New creates a new Handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes registers all issues HTTP routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	issues := rg.Group("/issues")
	{
		issues.POST("", h.CreateIssue)
		issues.GET("/:id", h.GetIssue)
		issues.PUT("/:id/status", h.UpdateStatus)
		issues.GET("/boundary/:boundary_id", h.GetByBoundary)
		issues.POST("/:id/upvote", h.UpvoteIssue)
		issues.POST("/:id/confirm", h.ConfirmIssue)
		issues.GET("/nearby", h.GetNearby)
	}
}

// CreateIssue handles POST /issues.
func (h *Handler) CreateIssue(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	var req model.CreateIssueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	resp, err := h.svc.CreateIssue(c.Request.Context(), userID.(string), &req)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// GetIssue handles GET /issues/:id.
func (h *Handler) GetIssue(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("issue id is required"))
		return
	}

	resp, err := h.svc.GetIssue(c.Request.Context(), id)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// UpdateStatus handles PUT /issues/:id/status.
func (h *Handler) UpdateStatus(c *gin.Context) {
	issueID := c.Param("id")
	if issueID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("issue id is required"))
		return
	}

	var req model.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	if err := h.svc.UpdateStatus(c.Request.Context(), issueID, &req); err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "status updated successfully"})
}

// GetByBoundary handles GET /issues/boundary/:boundary_id.
func (h *Handler) GetByBoundary(c *gin.Context) {
	boundaryID := c.Param("boundary_id")
	if boundaryID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("boundary_id is required"))
		return
	}

	resp, err := h.svc.GetByBoundary(c.Request.Context(), boundaryID)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// UpvoteIssue handles POST /issues/:id/upvote.
func (h *Handler) UpvoteIssue(c *gin.Context) {
	issueID := c.Param("id")
	if issueID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("issue id is required"))
		return
	}

	if err := h.svc.UpvoteIssue(c.Request.Context(), issueID); err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "upvoted successfully"})
}

// ConfirmIssue handles POST /issues/:id/confirm.
func (h *Handler) ConfirmIssue(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	issueID := c.Param("id")
	if issueID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("issue id is required"))
		return
	}

	var req model.ConfirmIssueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	if err := h.svc.ConfirmIssue(c.Request.Context(), issueID, userID.(string), &req); err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "confirmation recorded"})
}

// GetNearby handles GET /issues/nearby?lat=&lng=&radius=.
func (h *Handler) GetNearby(c *gin.Context) {
	latStr := c.Query("lat")
	lngStr := c.Query("lng")
	radiusStr := c.Query("radius")

	if latStr == "" || lngStr == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("lat and lng are required"))
		return
	}

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid latitude"))
		return
	}

	lng, err := strconv.ParseFloat(lngStr, 64)
	if err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid longitude"))
		return
	}

	radius := 5.0 // default 5km
	if radiusStr != "" {
		if r, err := strconv.ParseFloat(radiusStr, 64); err == nil {
			radius = r
		}
	}

	query := &model.NearbyQuery{
		Lat:    lat,
		Lng:    lng,
		Radius: radius,
	}

	resp, err := h.svc.GetNearby(c.Request.Context(), query)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}
