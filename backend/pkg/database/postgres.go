package database

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/civitro/pkg/config"
	"github.com/civitro/pkg/logger"
)

// -----------------------------------------------------------------------------
// PostgreSQL connection pool (singleton)
// -----------------------------------------------------------------------------

var (
	pgOnce sync.Once
	pgPool *pgxpool.Pool
)

// Postgres returns a shared pgxpool.Pool. The pool is created on the first
// call using settings from config.
func Postgres(ctx context.Context) (*pgxpool.Pool, error) {
	var initErr error
	pgOnce.Do(func() {
		pool, err := newPostgresPool(ctx)
		if err != nil {
			initErr = err
			return
		}
		pgPool = pool
	})
	if initErr != nil {
		// Reset so next call can retry.
		pgOnce = sync.Once{}
		return nil, initErr
	}
	return pgPool, nil
}

func newPostgresPool(ctx context.Context) (*pgxpool.Pool, error) {
	cfg := config.Get().Databases.Postgres

	poolCfg, err := pgxpool.ParseConfig(cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("postgres: parse config: %w", err)
	}

	if cfg.MaxConns > 0 {
		poolCfg.MaxConns = int32(cfg.MaxConns)
	}
	if cfg.MinConns > 0 {
		poolCfg.MinConns = int32(cfg.MinConns)
	}

	poolCfg.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("postgres: create pool: %w", err)
	}

	// Verify connectivity.
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("postgres: ping: %w", err)
	}

	logger.Info().
		Str("host", cfg.Host).
		Int("port", cfg.Port).
		Str("database", cfg.Database).
		Msg("postgres connection pool established")

	return pool, nil
}

// PostgresHealthCheck pings the database and returns an error if unreachable.
func PostgresHealthCheck(ctx context.Context) error {
	if pgPool == nil {
		return fmt.Errorf("postgres: pool not initialised")
	}
	return pgPool.Ping(ctx)
}

// ClosePostgres gracefully closes the PostgreSQL connection pool.
func ClosePostgres() {
	if pgPool != nil {
		pgPool.Close()
		logger.Info().Msg("postgres connection pool closed")
	}
}
