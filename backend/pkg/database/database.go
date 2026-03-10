// Package database provides connection helpers for PostgreSQL, Redis, and
// MongoDB. Each backend is in its own file (postgres.go, redis.go, mongodb.go).
//
// Usage:
//
//	pool, err := database.Postgres(ctx)
//	rdb, err := database.Redis(ctx)
//	db, err := database.MongoDB(ctx)
//
// All connections are singletons initialised from pkg/config on first call.
// Call the corresponding Close* function during graceful shutdown.
package database
