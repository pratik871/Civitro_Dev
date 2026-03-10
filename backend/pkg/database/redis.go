package database

import (
	"context"
	"fmt"
	"sync"

	"github.com/redis/go-redis/v9"

	"github.com/civitro/pkg/config"
	"github.com/civitro/pkg/logger"
)

// -----------------------------------------------------------------------------
// Redis client (singleton)
// -----------------------------------------------------------------------------

var (
	redisOnce   sync.Once
	redisClient *redis.Client
)

// Redis returns a shared *redis.Client. The client is created on the first
// call using settings from config.
func Redis(ctx context.Context) (*redis.Client, error) {
	var initErr error
	redisOnce.Do(func() {
		client, err := newRedisClient(ctx)
		if err != nil {
			initErr = err
			return
		}
		redisClient = client
	})
	if initErr != nil {
		redisOnce = sync.Once{}
		return nil, initErr
	}
	return redisClient, nil
}

func newRedisClient(ctx context.Context) (*redis.Client, error) {
	cfg := config.Get().Databases.Redis

	opts := &redis.Options{
		Addr:     cfg.Addr(),
		Password: cfg.Password,
		DB:       cfg.DB,
	}

	if cfg.PoolSize > 0 {
		opts.PoolSize = cfg.PoolSize
	}

	client := redis.NewClient(opts)

	// Verify connectivity.
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis: ping: %w", err)
	}

	logger.Info().
		Str("addr", cfg.Addr()).
		Int("db", cfg.DB).
		Msg("redis connection established")

	return client, nil
}

// RedisHealthCheck pings the Redis server.
func RedisHealthCheck(ctx context.Context) error {
	if redisClient == nil {
		return fmt.Errorf("redis: client not initialised")
	}
	return redisClient.Ping(ctx).Err()
}

// CloseRedis gracefully closes the Redis client.
func CloseRedis() error {
	if redisClient != nil {
		logger.Info().Msg("redis connection closed")
		return redisClient.Close()
	}
	return nil
}

// RedisClient returns the raw redis client without initialisation. Use Redis()
// if you need automatic setup.
func RedisClient() *redis.Client {
	return redisClient
}
