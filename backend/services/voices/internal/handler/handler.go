package handler

import (
	"net/http"
	"strconv"

	"github.com/civitro/pkg/errors"
	"github.com/civitro/services/voices/internal/model"
	"github.com/civitro/services/voices/internal/service"
	"github.com/gin-gonic/gin"
)

// Handler holds the HTTP handlers for the voices service.
type Handler struct {
	svc *service.Service
}

// New creates a new Handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes registers all voices HTTP routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	voices := rg.Group("/voices")
	{
		voices.POST("", h.CreateVoice)
		voices.GET("/feed", h.GetFeed)
		voices.GET("/:id", h.GetVoice)
		voices.POST("/:id/like", h.ToggleLike)
		voices.POST("/:id/share", h.ShareVoice)
		voices.POST("/:id/bookmark", h.BookmarkVoice)
	}

	rg.GET("/hashtags/:tag", h.GetByHashtag)
}

// CreateVoice handles POST /voices.
func (h *Handler) CreateVoice(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	var req model.CreateVoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	resp, err := h.svc.CreateVoice(c.Request.Context(), userID.(string), &req)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// GetFeed handles GET /voices/feed.
func (h *Handler) GetFeed(c *gin.Context) {
	boundaryID := c.Query("boundary_id")
	cursor := c.Query("cursor")
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	resp, err := h.svc.GetFeed(c.Request.Context(), boundaryID, cursor, limit)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	// Populate has_liked for the current user
	if uid, ok := c.Get("user_id"); ok {
		userID, _ := uid.(string)
		if userID != "" && resp != nil {
			for i := range resp.Voices {
				resp.Voices[i].HasLiked = h.svc.HasUserLiked(c.Request.Context(), resp.Voices[i].ID, userID)
			}
		}
	}

	c.JSON(http.StatusOK, resp)
}

// GetVoice handles GET /voices/:id.
func (h *Handler) GetVoice(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("voice id is required"))
		return
	}

	resp, err := h.svc.GetVoice(c.Request.Context(), id)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	// Populate has_liked for the current user
	if uid, ok := c.Get("user_id"); ok {
		userID, _ := uid.(string)
		if userID != "" && resp != nil {
			resp.Voice.HasLiked = h.svc.HasUserLiked(c.Request.Context(), resp.Voice.ID, userID)
		}
	}

	c.JSON(http.StatusOK, resp)
}

// ToggleLike handles POST /voices/:id/like.
func (h *Handler) ToggleLike(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	voiceID := c.Param("id")
	if voiceID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("voice id is required"))
		return
	}

	liked, err := h.svc.ToggleLike(c.Request.Context(), voiceID, userID.(string))
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"liked": liked})
}

// ShareVoice handles POST /voices/:id/share.
func (h *Handler) ShareVoice(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	voiceID := c.Param("id")
	if voiceID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("voice id is required"))
		return
	}

	if err := h.svc.ShareVoice(c.Request.Context(), voiceID, userID.(string)); err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"shared": true})
}

// BookmarkVoice handles POST /voices/:id/bookmark.
func (h *Handler) BookmarkVoice(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.AbortWithError(c, errors.ErrUnauthorized.WithMessage("user not authenticated"))
		return
	}

	voiceID := c.Param("id")
	if voiceID == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("voice id is required"))
		return
	}

	bookmarked, err := h.svc.BookmarkVoice(c.Request.Context(), voiceID, userID.(string))
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"bookmarked": bookmarked})
}

// GetByHashtag handles GET /hashtags/:tag.
func (h *Handler) GetByHashtag(c *gin.Context) {
	tag := c.Param("tag")
	if tag == "" {
		errors.AbortWithError(c, errors.ErrBadRequest.WithMessage("hashtag is required"))
		return
	}

	resp, err := h.svc.GetByHashtag(c.Request.Context(), tag)
	if err != nil {
		errors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}
