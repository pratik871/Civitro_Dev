package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	apperrors "github.com/civitro/pkg/errors"
	"github.com/civitro/services/search/internal/model"
	"github.com/civitro/services/search/internal/service"
)

// Handler handles HTTP requests for the search service.
type Handler struct {
	svc *service.Service
}

// New creates a new search handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes registers all search HTTP routes.
func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/search", h.Search)
	r.GET("/search/trending", h.GetTrending)
	r.GET("/search/autocomplete", h.Autocomplete)
	r.GET("/search/hashtags/trending", h.GetTrendingHashtags)
}

// Search handles GET /search?q=&type=&boundary=&page=&limit=
func (h *Handler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("query parameter 'q' is required"))
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	searchQuery := model.SearchQuery{
		Query:      query,
		Type:       model.SearchType(c.DefaultQuery("type", "all")),
		BoundaryID: c.Query("boundary"),
		Page:       page,
		Limit:      limit,
	}

	result, err := h.svc.Search(c.Request.Context(), searchQuery)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetTrending handles GET /search/trending
func (h *Handler) GetTrending(c *gin.Context) {
	trendType := c.Query("type")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	items, err := h.svc.GetTrending(c.Request.Context(), trendType, limit)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"trending": items})
}

// Autocomplete handles GET /search/autocomplete?q=
func (h *Handler) Autocomplete(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("query parameter 'q' is required"))
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	results, err := h.svc.Autocomplete(c.Request.Context(), query, limit)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"suggestions": results})
}

// GetTrendingHashtags handles GET /search/hashtags/trending
func (h *Handler) GetTrendingHashtags(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	items, err := h.svc.GetTrendingHashtags(c.Request.Context(), limit)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"trending_hashtags": items})
}
