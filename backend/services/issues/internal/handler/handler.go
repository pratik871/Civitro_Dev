package handler

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/civitro/pkg/errors"
	"github.com/civitro/pkg/storage"
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
		issues.GET("", h.ListIssues)
		issues.POST("", h.CreateIssue)
		issues.GET("/trending", h.GetTrending)
		issues.GET("/promises", h.ListPromises)
		issues.GET("/chi", h.GetCHI)
		issues.GET("/:id", h.GetIssue)
		issues.PUT("/:id/status", h.UpdateStatus)
		issues.GET("/boundary/:boundary_id", h.GetByBoundary)
		issues.POST("/:id/upvote", h.UpvoteIssue)
		issues.POST("/:id/confirm", h.ConfirmIssue)
		issues.GET("/nearby", h.GetNearby)
		issues.POST("/upload", h.UploadPhoto)
		issues.GET("/:id/comments", h.ListComments)
		issues.POST("/:id/comments", h.CreateComment)
		issues.POST("/:id/comments/:comment_id/like", h.LikeComment)
	}
}

// ListIssues handles GET /issues.
func (h *Handler) ListIssues(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid, _ := userID.(string)

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	resp, err := h.svc.ListIssues(c.Request.Context(), uid, limit, offset)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
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
	userID, _ := c.Get("user_id")
	uid, _ := userID.(string)

	id := c.Param("id")
	if id == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("issue id is required"))
		return
	}

	resp, err := h.svc.GetIssue(c.Request.Context(), id, uid)
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

// UpvoteIssue handles POST /issues/:id/upvote (toggle).
func (h *Handler) UpvoteIssue(c *gin.Context) {
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

	upvoted, err := h.svc.UpvoteIssue(c.Request.Context(), issueID, userID.(string))
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"upvoted": upvoted})
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

// UploadPhoto handles POST /issues/upload.
func (h *Handler) UploadPhoto(c *gin.Context) {
	file, header, err := c.Request.FormFile("photo")
	if err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("photo file is required"))
		return
	}
	defer file.Close()

	// Validate content type
	ct := header.Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "image/") {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("file must be an image"))
		return
	}

	// Limit to 10MB
	if header.Size > 10<<20 {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("file too large (max 10MB)"))
		return
	}

	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	key := fmt.Sprintf("issues/%d%s", time.Now().UnixNano(), ext)

	s3, err := storage.S3(c.Request.Context())
	if err != nil {
		errors.HandleError(c, fmt.Errorf("storage unavailable: %w", err))
		return
	}

	_, err = s3.Upload(c.Request.Context(), key, file, header.Size, ct)
	if err != nil {
		errors.HandleError(c, fmt.Errorf("failed to upload photo: %w", err))
		return
	}

	// Return the object key — the client can construct the full URL or use it directly
	c.JSON(http.StatusOK, gin.H{
		"url": fmt.Sprintf("/media/%s", key),
		"key": key,
	})
}

// GetTrending handles GET /issues/trending.
func (h *Handler) GetTrending(c *gin.Context) {
	topics, err := h.svc.GetTrending(c.Request.Context())
	if err != nil {
		errors.HandleError(c, err)
		return
	}
	c.JSON(http.StatusOK, topics)
}

// ListComments handles GET /issues/:id/comments.
func (h *Handler) ListComments(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid, _ := userID.(string)
	issueID := c.Param("id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	resp, err := h.svc.ListComments(c.Request.Context(), issueID, uid, limit)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// CreateComment handles POST /issues/:id/comments.
func (h *Handler) CreateComment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	issueID := c.Param("id")
	var req model.CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	comment, err := h.svc.CreateComment(c.Request.Context(), issueID, userID.(string), req.Content, req.ParentID)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"comment": comment})
}

// ListPromises handles GET /issues/promises.
func (h *Handler) ListPromises(c *gin.Context) {
	promises, err := h.svc.ListPromises(c.Request.Context())
	if err != nil {
		errors.HandleError(c, err)
		return
	}
	c.JSON(http.StatusOK, promises)
}

// GetCHI handles GET /issues/chi.
func (h *Handler) GetCHI(c *gin.Context) {
	chi, err := h.svc.GetCHI(c.Request.Context())
	if err != nil {
		errors.HandleError(c, err)
		return
	}
	c.JSON(http.StatusOK, chi)
}

// LikeComment handles POST /issues/:id/comments/:comment_id/like.
func (h *Handler) LikeComment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	commentID := c.Param("comment_id")
	if commentID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("comment id is required"))
		return
	}

	liked, err := h.svc.LikeComment(c.Request.Context(), commentID, userID.(string))
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"liked": liked})
}
