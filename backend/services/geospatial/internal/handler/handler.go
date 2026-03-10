package handler

import (
	"net/http"

	"github.com/civitro/pkg/errors"
	"github.com/civitro/services/geospatial/internal/model"
	"github.com/civitro/services/geospatial/internal/service"
	"github.com/gin-gonic/gin"
)

// Handler holds the HTTP handlers for the geospatial service.
type Handler struct {
	svc *service.Service
}

// New creates a new Handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes registers all geospatial HTTP routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	geo := rg.Group("/geo")
	{
		geo.POST("/resolve", h.ResolveLocation)
		geo.GET("/boundaries/:id", h.GetBoundary)
		geo.GET("/boundaries/:id/children", h.GetChildren)
		geo.GET("/user/:id/representatives", h.GetUserRepresentatives)
	}
}

// ResolveLocation handles POST /geo/resolve.
func (h *Handler) ResolveLocation(c *gin.Context) {
	var req model.ResolveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	resp, err := h.svc.ResolveLocation(c.Request.Context(), req.Lat, req.Lng)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetBoundary handles GET /geo/boundaries/:id.
func (h *Handler) GetBoundary(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("boundary id is required"))
		return
	}

	resp, err := h.svc.GetBoundary(c.Request.Context(), id)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetChildren handles GET /geo/boundaries/:id/children.
func (h *Handler) GetChildren(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("boundary id is required"))
		return
	}

	resp, err := h.svc.GetChildren(c.Request.Context(), id)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetUserRepresentatives handles GET /geo/user/:id/representatives.
func (h *Handler) GetUserRepresentatives(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("user id is required"))
		return
	}

	resp, err := h.svc.GetUserRepresentatives(c.Request.Context(), userID)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}
