package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	apperrors "github.com/civitro/pkg/errors"
	"github.com/civitro/services/polls/internal/model"
	"github.com/civitro/services/polls/internal/service"
)

// PollHandler handles HTTP requests for the polls and democracy service.
type PollHandler struct {
	svc *service.PollService
}

// NewPollHandler creates a new PollHandler.
func NewPollHandler(svc *service.PollService) *PollHandler {
	return &PollHandler{svc: svc}
}

// RegisterRoutes registers poll routes on the given Gin router group.
func (h *PollHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/polls", h.ListPolls)
	rg.POST("/polls", h.CreatePoll)
	rg.GET("/polls/:id", h.GetPoll)
	rg.POST("/polls/:id/vote", h.CastVote)
	rg.GET("/polls/:id/results", h.GetResults)
	rg.GET("/polls/boundary/:boundary_id", h.GetByBoundary)
	rg.DELETE("/polls/:id", h.DeletePoll)

	// Participatory Budgeting
	rg.GET("/polls/budgets/:boundary_id", h.ListBudgetProposals)
	rg.POST("/polls/budgets/:boundary_id/vote", h.SubmitBudgetVote)
	rg.GET("/polls/budgets/:boundary_id/results", h.GetBudgetResults)
}

// ListPolls returns all polls formatted for the frontend.
// GET /polls
func (h *PollHandler) ListPolls(c *gin.Context) {
	uid, _ := c.Get("user_id")
	userID, _ := uid.(string)

	polls, err := h.svc.ListPolls(c.Request.Context(), userID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, polls)
}

// CreatePoll creates a new poll.
// POST /polls
func (h *PollHandler) CreatePoll(c *gin.Context) {
	var req model.CreatePollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	poll, err := h.svc.CreatePoll(c.Request.Context(), req)
	if err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, poll)
}

// GetPoll returns a poll by ID.
// GET /polls/:id
func (h *PollHandler) GetPoll(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("id is required"))
		return
	}

	poll, err := h.svc.GetPoll(c.Request.Context(), id)
	if err != nil {
		apperrors.AbortWithError(c, apperrors.ErrNotFound.WithMessage("poll not found"))
		return
	}

	c.JSON(http.StatusOK, poll)
}

// CastVote records a user's vote on a poll.
// POST /polls/:id/vote
func (h *PollHandler) CastVote(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		apperrors.AbortWithError(c, apperrors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	pollID := c.Param("id")
	if pollID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("poll id is required"))
		return
	}

	var body struct {
		OptionID string `json:"option_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	req := model.CastVoteRequest{
		UserID:   userID.(string),
		OptionID: body.OptionID,
	}

	if err := h.svc.CastVote(c.Request.Context(), pollID, req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrConflict.WithMessage(err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "vote recorded"})
}

// RetractVote removes a user's vote from a poll.
// DELETE /polls/:id/vote
func (h *PollHandler) RetractVote(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		apperrors.AbortWithError(c, apperrors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	pollID := c.Param("id")
	if pollID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("poll id is required"))
		return
	}

	if err := h.svc.RetractVote(c.Request.Context(), pollID, userID.(string)); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrConflict.WithMessage(err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "vote retracted"})
}

// GetResults returns the poll results with percentages.
// GET /polls/:id/results
func (h *PollHandler) GetResults(c *gin.Context) {
	pollID := c.Param("id")
	if pollID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("poll id is required"))
		return
	}

	poll, err := h.svc.GetResults(c.Request.Context(), pollID)
	if err != nil {
		apperrors.AbortWithError(c, apperrors.ErrNotFound.WithMessage("poll not found"))
		return
	}

	c.JSON(http.StatusOK, poll)
}

// GetByBoundary returns all polls within a boundary.
// GET /polls/boundary/:boundary_id
func (h *PollHandler) GetByBoundary(c *gin.Context) {
	boundaryID := c.Param("boundary_id")
	if boundaryID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("boundary_id is required"))
		return
	}

	polls, err := h.svc.GetByBoundary(c.Request.Context(), boundaryID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"boundary_id": boundaryID,
		"polls":       polls,
	})
}

// DeletePoll removes a poll and all its data.
// DELETE /polls/:id
func (h *PollHandler) DeletePoll(c *gin.Context) {
	pollID := c.Param("id")
	if pollID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("poll id is required"))
		return
	}

	if err := h.svc.DeletePoll(c.Request.Context(), pollID); err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "poll deleted"})
}

// ---------------------------------------------------------------------------
// Participatory Budgeting endpoints
// ---------------------------------------------------------------------------

// ListBudgetProposals returns budget proposals for a boundary.
// GET /polls/budgets/:boundary_id
func (h *PollHandler) ListBudgetProposals(c *gin.Context) {
	boundaryID := c.Param("boundary_id")
	if boundaryID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("boundary_id is required"))
		return
	}

	uid, _ := c.Get("user_id")
	userID, _ := uid.(string)

	proposals, err := h.svc.ListBudgetProposals(c.Request.Context(), boundaryID, userID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"boundary_id": boundaryID,
		"proposals":   proposals,
	})
}

// SubmitBudgetVote records a user's budget allocation vote.
// POST /polls/budgets/:boundary_id/vote
func (h *PollHandler) SubmitBudgetVote(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		apperrors.AbortWithError(c, apperrors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	boundaryID := c.Param("boundary_id")
	if boundaryID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("boundary_id is required"))
		return
	}

	var req model.BudgetVoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	if err := h.svc.SubmitBudgetVote(c.Request.Context(), boundaryID, userID.(string), req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage(err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "budget vote recorded"})
}

// GetBudgetResults returns aggregated budget results for a boundary.
// GET /polls/budgets/:boundary_id/results
func (h *PollHandler) GetBudgetResults(c *gin.Context) {
	boundaryID := c.Param("boundary_id")
	if boundaryID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("boundary_id is required"))
		return
	}

	results, err := h.svc.GetBudgetResults(c.Request.Context(), boundaryID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, results)
}
