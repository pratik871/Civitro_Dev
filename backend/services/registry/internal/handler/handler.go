package handler

import (
	"net/http"

	"github.com/civitro/pkg/errors"
	"github.com/civitro/pkg/middleware"
	"github.com/civitro/services/registry/internal/model"
	"github.com/civitro/services/registry/internal/service"
	"github.com/gin-gonic/gin"
)

// Handler holds the HTTP handlers for the registry service.
type Handler struct {
	svc *service.Service
}

// New creates a new Handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes registers all registry HTTP routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	reps := rg.Group("/representatives")
	{
		reps.GET("/:id", h.GetRepresentative)
		reps.GET("/boundary/:boundary_id", h.GetByBoundary)
		reps.GET("/designation/:designation", h.GetByDesignation)
		reps.GET("/type/:official_type", h.GetByOfficialType)
		reps.POST("", middleware.RequireRole("admin"), h.CreateRepresentative)
		reps.POST("/:id/claim", h.ClaimProfile)
		reps.POST("/:id/staff", h.AddStaff)
		reps.GET("/:id/staff", h.GetStaff)
	}
}

// GetRepresentative handles GET /representatives/:id.
func (h *Handler) GetRepresentative(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("representative id is required"))
		return
	}

	resp, err := h.svc.GetRepresentative(c.Request.Context(), id)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetByBoundary handles GET /representatives/boundary/:boundary_id.
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

// GetByDesignation handles GET /representatives/designation/:designation.
// Optional query param: ?boundary_id=xxx
func (h *Handler) GetByDesignation(c *gin.Context) {
	designation := c.Param("designation")
	if designation == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("designation is required"))
		return
	}

	boundaryID := c.Query("boundary_id")

	resp, err := h.svc.GetByDesignation(c.Request.Context(), designation, boundaryID)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetByOfficialType handles GET /representatives/type/:official_type.
// Optional query param: ?boundary_id=xxx
func (h *Handler) GetByOfficialType(c *gin.Context) {
	officialType := c.Param("official_type")
	if officialType == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("official_type is required"))
		return
	}

	boundaryID := c.Query("boundary_id")

	resp, err := h.svc.GetByOfficialType(c.Request.Context(), officialType, boundaryID)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// CreateRepresentative handles POST /representatives (admin only).
func (h *Handler) CreateRepresentative(c *gin.Context) {
	var req model.CreateRepresentativeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	resp, err := h.svc.CreateRepresentative(c.Request.Context(), &req)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// ClaimProfile handles POST /representatives/:id/claim.
func (h *Handler) ClaimProfile(c *gin.Context) {
	repID := c.Param("id")
	if repID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("representative id is required"))
		return
	}

	var req model.ClaimRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	resp, err := h.svc.ClaimProfile(c.Request.Context(), repID, &req)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// AddStaff handles POST /representatives/:id/staff.
func (h *Handler) AddStaff(c *gin.Context) {
	repID := c.Param("id")
	if repID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("representative id is required"))
		return
	}

	var req model.AddStaffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	staff, err := h.svc.AddStaff(c.Request.Context(), repID, &req)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, staff)
}

// GetStaff handles GET /representatives/:id/staff.
func (h *Handler) GetStaff(c *gin.Context) {
	repID := c.Param("id")
	if repID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("representative id is required"))
		return
	}

	resp, err := h.svc.GetStaff(c.Request.Context(), repID)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}
