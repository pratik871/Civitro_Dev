package middleware

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/civitro/pkg/config"
	apperrors "github.com/civitro/pkg/errors"
	"github.com/civitro/pkg/logger"
)

// Custom JWT claims used across civitro services.
type Claims struct {
	jwt.RegisteredClaims
	UserID            string `json:"user_id"`
	VerificationLevel string `json:"verification_level"` // e.g. "phone", "aadhaar", "full"
}

// JWTAuth returns a Gin middleware that validates a Bearer JWT token in the
// Authorization header. On success it sets "user_id" and
// "verification_level" in the Gin context for downstream handlers.
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			apperrors.AbortWithError(c, apperrors.ErrUnauthorized.WithMessage("missing authorization header"))
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			apperrors.AbortWithError(c, apperrors.ErrUnauthorized.WithMessage("authorization header must be Bearer {token}"))
			return
		}
		tokenString := parts[1]

		claims, err := validateToken(tokenString)
		if err != nil {
			logger.Warn().Err(err).Str("path", c.Request.URL.Path).Msg("jwt validation failed")
			apperrors.AbortWithError(c, apperrors.ErrUnauthorized.WithMessage("invalid or expired token"))
			return
		}

		// Populate context for downstream handlers.
		c.Set("user_id", claims.UserID)
		c.Set("verification_level", claims.VerificationLevel)
		c.Set("claims", claims)

		c.Next()
	}
}

// validateToken parses and validates a JWT string using the secret from config.
func validateToken(tokenString string) (*Claims, error) {
	cfg := config.Get()
	secret := cfg.Auth.JWT.Secret
	if secret == "" {
		return nil, errors.New("jwt secret is not configured")
	}

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		// Ensure signing method is HMAC.
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, fmt.Errorf("parsing token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}

// GenerateToken creates a signed JWT for the given user. This is a convenience
// used by the auth service; other services only validate tokens.
func GenerateToken(userID, verificationLevel string) (string, error) {
	cfg := config.Get()
	secret := cfg.Auth.JWT.Secret
	if secret == "" {
		return "", errors.New("jwt secret is not configured")
	}

	expiry, err := time.ParseDuration(cfg.Auth.JWT.AccessTokenExpiry)
	if err != nil {
		expiry = 24 * time.Hour // fallback
	}

	now := time.Now()
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    cfg.Auth.JWT.Issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(expiry)),
			Subject:   userID,
		},
		UserID:            userID,
		VerificationLevel: verificationLevel,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// OptionalJWTAuth is like JWTAuth but does NOT abort the request when no token
// is present. If a valid token IS present, the context is populated.
func OptionalJWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.Next()
			return
		}

		claims, err := validateToken(parts[1])
		if err == nil {
			c.Set("user_id", claims.UserID)
			c.Set("verification_level", claims.VerificationLevel)
			c.Set("claims", claims)
		}

		c.Next()
	}
}

// GetUserID extracts the authenticated user ID from the Gin context. Returns
// empty string if not set.
func GetUserID(c *gin.Context) string {
	v, _ := c.Get("user_id")
	s, _ := v.(string)
	return s
}

// GetVerificationLevel extracts the verification level from the Gin context.
func GetVerificationLevel(c *gin.Context) string {
	v, _ := c.Get("verification_level")
	s, _ := v.(string)
	return s
}
