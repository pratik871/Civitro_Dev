package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	apperrors "github.com/civitro/pkg/errors"
	"github.com/civitro/services/ledger/internal/model"
	"github.com/civitro/services/ledger/internal/service"
)

// LedgerHandler handles HTTP requests for the public work ledger.
type LedgerHandler struct {
	svc *service.LedgerService
}

// NewLedgerHandler creates a new LedgerHandler.
func NewLedgerHandler(svc *service.LedgerService) *LedgerHandler {
	return &LedgerHandler{svc: svc}
}

// RegisterRoutes registers ledger routes on the given Gin router group.
func (h *LedgerHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/ledger/issue/:issue_id", h.GetTimeline)
	rg.POST("/ledger/entry", h.AppendEntry)
	rg.GET("/ledger/entry/:id", h.GetEntry)
}

// GetTimeline returns the full chronological timeline for an issue.
// GET /ledger/issue/:issue_id
func (h *LedgerHandler) GetTimeline(c *gin.Context) {
	issueID := c.Param("issue_id")
	if issueID == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("issue_id is required"))
		return
	}

	timeline, err := h.svc.GetTimeline(c.Request.Context(), issueID)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, timeline)
}

// AppendEntry appends a new immutable entry to the ledger.
// POST /ledger/entry
func (h *LedgerHandler) AppendEntry(c *gin.Context) {
	var req model.CreateEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("invalid request body: "+err.Error()))
		return
	}

	entry, err := h.svc.AppendEntry(c.Request.Context(), req)
	if err != nil {
		apperrors.HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, entry)
}

// GetEntry returns a single ledger entry by ID.
// GET /ledger/entry/:id
func (h *LedgerHandler) GetEntry(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		apperrors.AbortWithError(c, apperrors.ErrBadRequest.WithMessage("id is required"))
		return
	}

	entry, err := h.svc.GetEntry(c.Request.Context(), id)
	if err != nil {
		apperrors.AbortWithError(c, apperrors.ErrNotFound.WithMessage("ledger entry not found"))
		return
	}

	c.JSON(http.StatusOK, entry)
}
