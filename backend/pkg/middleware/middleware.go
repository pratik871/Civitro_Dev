// Package middleware provides reusable Gin middleware for the civitro platform:
//
//   - auth.go    -- JWT authentication (JWTAuth, OptionalJWTAuth)
//   - cors.go    -- CORS headers
//   - ratelimit.go -- Redis-backed sliding window rate limiting
//
// This file contains additional utility middleware.
package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
)

// RequestID adds a request ID to each request for tracing. If the client sends
// an X-Request-ID header it is reused; otherwise one is generated.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

func generateRequestID() string {
	return time.Now().Format("20060102150405.000000")
}
