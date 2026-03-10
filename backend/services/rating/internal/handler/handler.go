package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	apperrors "github.com/civitro/pkg/errors"
	"github.com/civitro/services/rating/internal/model"
	"github.com/civitro/services/rating/internal/service"
)

// RatingHandler handles HTTP requests for the rating and accountability service.
type RatingHandler struct {
	svc *service.RatingService
}

// NewRatingHandler creates a new RatingHandler.
func NewRatingHandler(svc *service.RatingService) *RatingHandler {
	return &RatingHandler{svc: svc}
}

// RegisterRoutes registers rating routes on the given Gin router group.
func (h *RatingHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/ratings/representative/:rep_id", h.GetRating)
	rg.GET("/ratings/representative/:rep_id/history", h.GetRatingHistory)
	rg.POST("/ratings/survey", h.SubmitSurvey)
	rg.GET("/ratings/boundary/:boundary_id/rankings", h.GetRankings)
}

// GetRating returns the current composite rating for a representative.
// GET /ratings/representative/:rep_id
func (h *RatingHandler) GetRating(c *gin.Context) {
	repID := c.Param("rep_id")
	if repID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("rep_id is required"))
		return
	}

	rating, err := h.svc.GetRating(c.Request.Context(), repID)
	if err != nil {
		apperrors.AbortWithError(c, apperrors.ErrNotFound.WithMessage("rating not found for representative"))
		return
	}

	c.JSON(http.StatusOK, rating)
}

// GetRatingHistory returns the full history of rating snapshots for a representative.
// GET /ratings/representative/:rep_id/history
func (h *RatingHandler) GetRatingHistory(c *gin.Context) {
	repID := c.Param("rep_id")
	if repID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("rep_id is required"))
		return
	}

	ratings, err := h.svc.GetRatingHistory(c.Request.Context(), repID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"representative_id": repID,
		"ratings":           ratings,
	})
}

// SubmitSurvey records a citizen's satisfaction survey.
// POST /ratings/survey
func (h *RatingHandler) SubmitSurvey(c *gin.Context) {
	var req model.SubmitSurveyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	survey, err := h.svc.SubmitSurvey(c.Request.Context(), req)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, survey)
}

// GetRankings returns representatives ranked by composite score within a boundary.
// GET /ratings/boundary/:boundary_id/rankings
func (h *RatingHandler) GetRankings(c *gin.Context) {
	boundaryID := c.Param("boundary_id")
	if boundaryID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("boundary_id is required"))
		return
	}

	rankings, err := h.svc.GetRankings(c.Request.Context(), boundaryID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"boundary_id": boundaryID,
		"rankings":    rankings,
	})
}
