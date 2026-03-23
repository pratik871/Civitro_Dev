package handler

import (
	"net/http"
	"strconv"

	"github.com/civitro/pkg/errors"
	"github.com/civitro/pkg/logger"
	"github.com/civitro/services/community-action/internal/model"
	"github.com/civitro/services/community-action/internal/service"
	"github.com/gin-gonic/gin"
)

// Handler holds the HTTP handlers for the community action service.
type Handler struct {
	svc *service.Service
}

// New creates a new Handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes registers all community action HTTP routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	actions := rg.Group("/actions")
	{
		actions.GET("", h.ListTrending)
		actions.POST("", h.CreateAction)
		actions.GET("/trending", h.ListTrending)
		actions.GET("/:id", h.GetAction)
		actions.GET("/ward/:ward_id", h.ListByWard)
		actions.POST("/:id/support", h.AddSupport)
		actions.DELETE("/:id/support", h.RemoveSupport)
		actions.POST("/:id/evidence", h.AddEvidence)
		actions.POST("/:id/respond", h.AddResponse)
		actions.GET("/:id/timeline", h.GetTimeline)
		actions.POST("/:id/verify", h.AddVerification)
	}
}

// CreateAction handles POST /actions.
func (h *Handler) CreateAction(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	var req model.CreateActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	resp, err := h.svc.CreateAction(c.Request.Context(), userID.(string), &req)
	if err != nil {
		msg := err.Error()
		// Guardrail errors should be 400, not 500
		if msg == "Minimum civic score of 5 required to create community actions" ||
			msg == "Actions require at least 3 linked issues or 1 detected pattern" ||
			msg == "Maximum 2 actions per month. Please wait before creating another." {
			errors.AbortWithError(c, errors.ErrBadRequest.WithMessage(msg))
		} else {
			errors.HandleError(c, err)
		}
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// GetAction handles GET /actions/:id.
func (h *Handler) GetAction(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid, _ := userID.(string)

	id := c.Param("id")
	if id == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("action id is required"))
		return
	}

	resp, err := h.svc.GetAction(c.Request.Context(), id, uid)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ListByWard handles GET /actions/ward/:ward_id.
func (h *Handler) ListByWard(c *gin.Context) {
	wardID := c.Param("ward_id")
	if wardID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("ward_id is required"))
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	resp, err := h.svc.ListByWard(c.Request.Context(), wardID, limit, offset)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// AddSupport handles POST /actions/:id/support.
func (h *Handler) AddSupport(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	actionID := c.Param("id")
	if actionID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("action id is required"))
		return
	}

	supported, newCount, err := h.svc.AddSupport(c.Request.Context(), actionID, userID.(string))
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"supported": supported, "support_count": newCount})
}

// RemoveSupport handles DELETE /actions/:id/support.
func (h *Handler) RemoveSupport(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	actionID := c.Param("id")
	if actionID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("action id is required"))
		return
	}

	newCount, err := h.svc.RemoveSupport(c.Request.Context(), actionID, userID.(string))
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"supported": false, "support_count": newCount})
}

// AddEvidence handles POST /actions/:id/evidence.
func (h *Handler) AddEvidence(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	actionID := c.Param("id")
	if actionID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("action id is required"))
		return
	}

	var req model.AddEvidenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	evidence, err := h.svc.AddEvidence(c.Request.Context(), actionID, userID.(string), &req)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"evidence": evidence})
}

// AddResponse handles POST /actions/:id/respond.
func (h *Handler) AddResponse(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	// Check for representative role
	role, _ := c.Get("user_role")
	roleStr, _ := role.(string)
	if roleStr != "representative" && roleStr != "admin" {
		errors.AbortWithError(c, errors.ErrForbidden.WithMessage("only representatives can respond to actions"))
		return
	}

	actionID := c.Param("id")
	if actionID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("action id is required"))
		return
	}

	var req model.AddResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	response, err := h.svc.AddResponse(c.Request.Context(), actionID, userID.(string), &req)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"response": response})
}

// GetTimeline handles GET /actions/:id/timeline.
func (h *Handler) GetTimeline(c *gin.Context) {
	actionID := c.Param("id")
	if actionID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("action id is required"))
		return
	}

	resp, err := h.svc.GetTimeline(c.Request.Context(), actionID)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// AddVerification handles POST /actions/:id/verify.
func (h *Handler) AddVerification(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	actionID := c.Param("id")
	if actionID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("action id is required"))
		return
	}

	var req model.AddVerificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	verification, err := h.svc.AddVerification(c.Request.Context(), actionID, userID.(string), &req)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"verification": verification})
}

// ListTrending handles GET /actions/trending.
func (h *Handler) ListTrending(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	resp, err := h.svc.ListTrending(c.Request.Context(), limit)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	// Populate has_supported for current user
	uid, ok := c.Get("user_id")
	logger.Info().Bool("has_user_id", ok).Interface("user_id", uid).Msg("trending: checking has_supported")
	if ok {
		userID, _ := uid.(string)
		if userID != "" && resp != nil {
			for i := range resp.Actions {
				supported, _ := h.svc.HasSupported(c.Request.Context(), resp.Actions[i].ID, userID)
				resp.Actions[i].HasSupported = supported
				logger.Info().Str("action_id", resp.Actions[i].ID).Bool("supported", supported).Msg("trending: has_supported check")
			}
		}
	}

	c.JSON(http.StatusOK, resp)
}
