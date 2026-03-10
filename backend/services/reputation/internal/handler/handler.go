package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	apperrors "github.com/civitro/pkg/errors"
	"github.com/civitro/services/reputation/internal/service"
)

// ReputationHandler handles HTTP requests for the citizen reputation service.
type ReputationHandler struct {
	svc *service.ReputationService
}

// NewReputationHandler creates a new ReputationHandler.
func NewReputationHandler(svc *service.ReputationService) *ReputationHandler {
	return &ReputationHandler{svc: svc}
}

// RegisterRoutes registers reputation routes on the given Gin router group.
func (h *ReputationHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/reputation/:user_id", h.GetReputation)
	rg.GET("/reputation/:user_id/history", h.GetHistory)
	rg.GET("/reputation/leaderboard/:boundary_id", h.GetLeaderboard)
}

// GetReputation returns the civic score for a user.
// GET /reputation/:user_id
func (h *ReputationHandler) GetReputation(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("user_id is required"))
		return
	}

	score, err := h.svc.GetReputation(c.Request.Context(), userID)
	if err != nil {
		apperrors.AbortWithError(c, apperrors.ErrNotFound.WithMessage("reputation not found"))
		return
	}

	c.JSON(http.StatusOK, score)
}

// GetHistory returns the score event history for a user.
// GET /reputation/:user_id/history
func (h *ReputationHandler) GetHistory(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("user_id is required"))
		return
	}

	events, err := h.svc.GetHistory(c.Request.Context(), userID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id": userID,
		"events":  events,
	})
}

// GetLeaderboard returns the top citizens by credibility score in a boundary.
// GET /reputation/leaderboard/:boundary_id
func (h *ReputationHandler) GetLeaderboard(c *gin.Context) {
	boundaryID := c.Param("boundary_id")
	if boundaryID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("boundary_id is required"))
		return
	}

	scores, err := h.svc.GetLeaderboard(c.Request.Context(), boundaryID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"boundary_id": boundaryID,
		"leaderboard": scores,
	})
}
