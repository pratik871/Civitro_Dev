package errors

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// -----------------------------------------------------------------------------
// AppError
// -----------------------------------------------------------------------------

// AppError is the standard error type used across all civitro services.
type AppError struct {
	Code       string      `json:"code"`
	Message    string      `json:"message"`
	HTTPStatus int         `json:"-"`
	Details    interface{} `json:"details,omitempty"`
}

// Error implements the error interface.
func (e *AppError) Error() string {
	if e.Details != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// WithMessage returns a shallow copy of the error with an overridden message.
func (e *AppError) WithMessage(msg string) *AppError {
	cp := *e
	cp.Message = msg
	return &cp
}

// WithDetails returns a shallow copy of the error with attached details.
func (e *AppError) WithDetails(details interface{}) *AppError {
	cp := *e
	cp.Details = details
	return &cp
}

// WithMessagef is a convenience for formatted messages.
func (e *AppError) WithMessagef(format string, args ...interface{}) *AppError {
	cp := *e
	cp.Message = fmt.Sprintf(format, args...)
	return &cp
}

// Is supports errors.Is comparison by code.
func (e *AppError) Is(target error) bool {
	t, ok := target.(*AppError)
	if !ok {
		return false
	}
	return e.Code == t.Code
}

// -----------------------------------------------------------------------------
// Sentinel errors
// -----------------------------------------------------------------------------

var (
	ErrNotFound = &AppError{
		Code:       "NOT_FOUND",
		Message:    "the requested resource was not found",
		HTTPStatus: http.StatusNotFound,
	}

	ErrUnauthorized = &AppError{
		Code:       "UNAUTHORIZED",
		Message:    "authentication is required",
		HTTPStatus: http.StatusUnauthorized,
	}

	ErrForbidden = &AppError{
		Code:       "FORBIDDEN",
		Message:    "you do not have permission to perform this action",
		HTTPStatus: http.StatusForbidden,
	}

	ErrBadRequest = &AppError{
		Code:       "BAD_REQUEST",
		Message:    "the request was invalid",
		HTTPStatus: http.StatusBadRequest,
	}

	ErrInternal = &AppError{
		Code:       "INTERNAL_ERROR",
		Message:    "an internal error occurred",
		HTTPStatus: http.StatusInternalServerError,
	}

	ErrConflict = &AppError{
		Code:       "CONFLICT",
		Message:    "the request conflicts with the current state",
		HTTPStatus: http.StatusConflict,
	}

	ErrRateLimited = &AppError{
		Code:       "RATE_LIMITED",
		Message:    "too many requests",
		HTTPStatus: http.StatusTooManyRequests,
	}

	ErrValidation = &AppError{
		Code:       "VALIDATION_ERROR",
		Message:    "validation failed",
		HTTPStatus: http.StatusUnprocessableEntity,
	}

	ErrServiceUnavailable = &AppError{
		Code:       "SERVICE_UNAVAILABLE",
		Message:    "the service is temporarily unavailable",
		HTTPStatus: http.StatusServiceUnavailable,
	}
)

// -----------------------------------------------------------------------------
// Gin helpers
// -----------------------------------------------------------------------------

// ErrorResponse is the JSON body returned to the client on errors.
type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

// ErrorBody contains the structured error information.
type ErrorBody struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// AbortWithError writes an AppError as JSON and aborts the Gin chain.
func AbortWithError(c *gin.Context, err *AppError) {
	c.AbortWithStatusJSON(err.HTTPStatus, ErrorResponse{
		Error: ErrorBody{
			Code:    err.Code,
			Message: err.Message,
			Details: err.Details,
		},
	})
}

// RespondWithError is a non-aborting variant: writes the error response but
// does not call c.Abort(). Useful inside the final handler.
func RespondWithError(c *gin.Context, err *AppError) {
	c.JSON(err.HTTPStatus, ErrorResponse{
		Error: ErrorBody{
			Code:    err.Code,
			Message: err.Message,
			Details: err.Details,
		},
	})
}

// HandleError maps a generic Go error to an AppError and writes the response.
// If the error is already an *AppError it is used directly; otherwise it is
// wrapped as ErrInternal.
func HandleError(c *gin.Context, err error) {
	if appErr, ok := err.(*AppError); ok {
		AbortWithError(c, appErr)
		return
	}
	AbortWithError(c, ErrInternal.WithMessage(err.Error()))
}

// NewAppError creates a new AppError with the given parameters.
func NewAppError(code string, message string, httpStatus int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		HTTPStatus: httpStatus,
	}
}
