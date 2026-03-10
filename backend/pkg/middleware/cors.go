package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/civitro/pkg/config"
)

// CORS returns a Gin middleware that sets Cross-Origin Resource Sharing headers.
//
// In local/development mode all origins are allowed. In production the allowed
// origins are read from the AllowedOrigins parameter; if empty it falls back
// to the same permissive behaviour (not recommended for production).
func CORS(allowedOrigins ...string) gin.HandlerFunc {
	cfg := config.Get()
	isLocal := cfg.IsLocal()

	// Build a lookup set for fast origin matching.
	originSet := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[strings.TrimRight(o, "/")] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		if isLocal || len(originSet) == 0 {
			// Allow all origins in local dev or when no explicit list is given.
			c.Header("Access-Control-Allow-Origin", "*")
		} else if origin != "" {
			normalised := strings.TrimRight(origin, "/")
			if _, ok := originSet[normalised]; ok {
				c.Header("Access-Control-Allow-Origin", origin)
				c.Header("Vary", "Origin")
			} else {
				// Origin not allowed -- still process the request but do not
				// set the CORS header so the browser will block the response.
				if c.Request.Method == http.MethodOptions {
					c.AbortWithStatus(http.StatusForbidden)
					return
				}
				c.Next()
				return
			}
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Request-ID")
		c.Header("Access-Control-Expose-Headers", "X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		// Handle preflight requests.
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
