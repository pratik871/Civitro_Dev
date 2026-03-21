package handler

import (
	"io"
	"net/http"

	"github.com/civitro/pkg/errors"
	"github.com/civitro/pkg/middleware"
	"github.com/civitro/services/identity/internal/model"
	"github.com/civitro/services/identity/internal/service"
	"github.com/gin-gonic/gin"
)

// Handler holds the HTTP handlers for the identity service.
type Handler struct {
	svc         *service.Service
	maxFileSize int
}

// New creates a new Handler.
func New(svc *service.Service, maxFileSize int) *Handler {
	if maxFileSize <= 0 {
		maxFileSize = 2 << 20 // 2MB default
	}
	return &Handler{svc: svc, maxFileSize: maxFileSize}
}

// RegisterPublicRoutes registers unauthenticated routes.
func (h *Handler) RegisterPublicRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	{
		auth.POST("/register", h.Register)
		auth.POST("/verify-otp", h.VerifyOTP)
		auth.POST("/refresh", h.RefreshToken)
	}
}

// RegisterProtectedRoutes registers routes that require JWT authentication.
func (h *Handler) RegisterProtectedRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	auth.Use(middleware.JWTAuth())
	{
		auth.GET("/me", h.GetProfile)
		auth.GET("/dashboard-stats", h.GetDashboardStats)
		auth.PUT("/language", h.UpdateLanguage)
		auth.PUT("/location", h.UpdateLocation)
		auth.POST("/verify-aadhaar", h.VerifyAadhaar)
	}
}

// Register handles POST /auth/register.
func (h *Handler) Register(c *gin.Context) {
	var req model.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	resp, err := h.svc.RegisterUser(c.Request.Context(), &req)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// VerifyOTP handles POST /auth/verify-otp.
func (h *Handler) VerifyOTP(c *gin.Context) {
	var req model.VerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	resp, err := h.svc.VerifyOTP(c.Request.Context(), &req)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// RefreshToken handles POST /auth/refresh.
func (h *Handler) RefreshToken(c *gin.Context) {
	var req model.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	resp, err := h.svc.RefreshToken(c.Request.Context(), &req)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetProfile handles GET /auth/me.
func (h *Handler) GetProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	resp, err := h.svc.GetProfile(c.Request.Context(), userID)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetDashboardStats handles GET /auth/dashboard-stats.
func (h *Handler) GetDashboardStats(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	stats, err := h.svc.GetDashboardStats(c.Request.Context(), userID)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, stats)
}

// UpdateLanguage handles PUT /auth/language.
func (h *Handler) UpdateLanguage(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	var req struct {
		Language string `json:"language" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request"))
		return
	}

	if err := h.svc.UpdateLanguage(c.Request.Context(), userID.(string), req.Language); err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "language updated", "language": req.Language})
}

// UpdateLocation handles PUT /auth/location.
func (h *Handler) UpdateLocation(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	var req model.UpdateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	resp, err := h.svc.UpdateLocation(c.Request.Context(), userID, &req)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// VerifyAadhaar handles POST /auth/verify-aadhaar (multipart form).
func (h *Handler) VerifyAadhaar(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	// Parse multipart form with size limit.
	if err := c.Request.ParseMultipartForm(int64(h.maxFileSize)); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("file too large or invalid multipart form"))
		return
	}

	shareCode := c.Request.FormValue("share_code")
	if len(shareCode) != 4 {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("share_code must be exactly 4 digits"))
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("missing file upload"))
		return
	}
	defer file.Close()

	zipData, err := io.ReadAll(io.LimitReader(file, int64(h.maxFileSize)))
	if err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("failed to read uploaded file"))
		return
	}

	resp, err := h.svc.VerifyAadhaar(c.Request.Context(), userID, zipData, shareCode)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}
