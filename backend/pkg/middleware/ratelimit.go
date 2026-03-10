package middleware

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	apperrors "github.com/civitro/pkg/errors"
	"github.com/civitro/pkg/logger"
)

// RateLimitConfig describes the limit for a single window.
type RateLimitConfig struct {
	// Max is the maximum number of requests allowed within the Window.
	Max int
	// Window is the sliding window duration.
	Window time.Duration
	// KeyFunc is an optional function that returns the rate-limit key for a
	// request. Defaults to client IP.
	KeyFunc func(c *gin.Context) string
}

// DefaultKeyFunc returns the client IP as the rate-limit key.
func DefaultKeyFunc(c *gin.Context) string {
	return c.ClientIP()
}

// RateLimit returns a Gin middleware that enforces a sliding window rate limit
// backed by Redis. When the limit is exceeded the middleware responds with
// HTTP 429 and a Retry-After header.
//
// Usage:
//
//	router.Use(middleware.RateLimit(redisClient, middleware.RateLimitConfig{
//	    Max:    100,
//	    Window: time.Minute,
//	}))
func RateLimit(rdb *redis.Client, cfg RateLimitConfig) gin.HandlerFunc {
	if cfg.KeyFunc == nil {
		cfg.KeyFunc = DefaultKeyFunc
	}

	return func(c *gin.Context) {
		ctx := c.Request.Context()
		key := fmt.Sprintf("rl:%s:%s", c.FullPath(), cfg.KeyFunc(c))

		allowed, remaining, retryAfter, err := slidingWindowCheck(ctx, rdb, key, cfg.Max, cfg.Window)
		if err != nil {
			// If Redis is down we fail open (allow request) but log the error.
			logger.Error().Err(err).Str("key", key).Msg("rate limiter redis error, failing open")
			c.Next()
			return
		}

		// Set informational headers.
		c.Header("X-RateLimit-Limit", strconv.Itoa(cfg.Max))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))

		if !allowed {
			c.Header("Retry-After", strconv.Itoa(int(retryAfter.Seconds())))
			apperrors.AbortWithError(c, apperrors.ErrRateLimited.WithMessage(
				fmt.Sprintf("rate limit exceeded, retry after %ds", int(retryAfter.Seconds())),
			))
			return
		}

		c.Next()
	}
}

// slidingWindowCheck implements a Redis sliding-window rate limiter using a
// sorted set. Members are scored by their timestamp (UnixNano). Each call
// removes expired entries, adds the current request, and checks the count.
//
// Returns (allowed, remaining, retryAfter, err).
func slidingWindowCheck(
	ctx context.Context,
	rdb *redis.Client,
	key string,
	max int,
	window time.Duration,
) (bool, int, time.Duration, error) {
	now := time.Now()
	windowStart := now.Add(-window)

	pipe := rdb.Pipeline()

	// Remove entries older than the window.
	pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", windowStart.UnixNano()))

	// Add current request.
	pipe.ZAdd(ctx, key, redis.Z{
		Score:  float64(now.UnixNano()),
		Member: fmt.Sprintf("%d", now.UnixNano()),
	})

	// Count entries in the window.
	countCmd := pipe.ZCard(ctx, key)

	// Set key expiry so Redis cleans up idle keys.
	pipe.Expire(ctx, key, window+time.Second)

	if _, err := pipe.Exec(ctx); err != nil {
		return false, 0, 0, fmt.Errorf("rate limit pipeline: %w", err)
	}

	count := int(countCmd.Val())
	remaining := max - count
	if remaining < 0 {
		remaining = 0
	}

	if count > max {
		// Calculate how long until the oldest entry in the window expires.
		oldestCmd := rdb.ZRangeWithScores(ctx, key, 0, 0)
		members, err := oldestCmd.Result()
		if err != nil || len(members) == 0 {
			return false, 0, window, nil
		}
		oldestNano := int64(members[0].Score)
		oldestTime := time.Unix(0, oldestNano)
		retryAfter := oldestTime.Add(window).Sub(now)
		if retryAfter < 0 {
			retryAfter = time.Second
		}
		return false, 0, retryAfter, nil
	}

	return true, remaining, 0, nil
}

// PerRouteRateLimit is a convenience for applying different limits to different
// route groups.
//
// Usage:
//
//	limits := map[string]middleware.RateLimitConfig{
//	    "/api/v1/auth/otp/send": {Max: 5, Window: time.Minute},
//	    "/api/v1/auth/otp/verify": {Max: 10, Window: time.Minute},
//	}
//	router.Use(middleware.PerRouteRateLimit(redisClient, limits, defaultCfg))
func PerRouteRateLimit(rdb *redis.Client, routes map[string]RateLimitConfig, defaultCfg RateLimitConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		cfg, ok := routes[c.FullPath()]
		if !ok {
			cfg = defaultCfg
		}
		if cfg.KeyFunc == nil {
			cfg.KeyFunc = DefaultKeyFunc
		}

		// Inline the same logic to avoid creating a new handler per request.
		ctx := c.Request.Context()
		key := fmt.Sprintf("rl:%s:%s", c.FullPath(), cfg.KeyFunc(c))

		allowed, remaining, retryAfter, err := slidingWindowCheck(ctx, rdb, key, cfg.Max, cfg.Window)
		if err != nil {
			logger.Error().Err(err).Str("key", key).Msg("rate limiter redis error, failing open")
			c.Next()
			return
		}

		c.Header("X-RateLimit-Limit", strconv.Itoa(cfg.Max))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))

		if !allowed {
			c.Header("Retry-After", strconv.Itoa(int(retryAfter.Seconds())))
			apperrors.AbortWithError(c, apperrors.ErrRateLimited.WithMessage(
				fmt.Sprintf("rate limit exceeded, retry after %ds", int(retryAfter.Seconds())),
			))
			return
		}

		c.Next()
	}
}
