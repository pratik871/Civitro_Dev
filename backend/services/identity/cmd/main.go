package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/civitro/pkg/config"
	"github.com/civitro/pkg/database"
	"github.com/civitro/pkg/events"
	"github.com/civitro/pkg/logger"
	"github.com/civitro/pkg/middleware"
	"github.com/civitro/pkg/sms"
	"github.com/civitro/pkg/storage"
	"github.com/civitro/services/identity/internal/handler"
	"github.com/civitro/services/identity/internal/repository"
	"github.com/civitro/services/identity/internal/service"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Get()

	// Initialize logger
	logger.Init()
	log := logger.WithService("identity")

	log.Info().
		Int("http_port", 8001).
		Int("grpc_port", 50051).
		Msg("starting identity service")

	// Connect to database
	ctx := context.Background()
	pool, err := database.Postgres(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer database.ClosePostgres()
	log.Info().Msg("connected to database")

	// Connect to Redis
	rdb, err := database.Redis(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to redis")
	}
	defer database.CloseRedis()
	log.Info().Msg("connected to redis")

	// Initialize S3/MinIO storage (non-fatal if unavailable)
	store, err := storage.S3(ctx)
	if err != nil {
		log.Warn().Err(err).Msg("storage unavailable, photo uploads will be skipped")
	}

	// Initialize event producer
	producer := events.NewProducer()
	defer producer.Close()

	// Initialize SMS provider
	smsProvider := sms.NewProvider(cfg.Notifications.SMS)
	log.Info().Str("sms_provider", smsProvider.Name()).Msg("SMS provider initialized")

	// Initialize layers
	repo := repository.NewPostgresRepository(pool)
	svc := service.New(repo, producer, rdb, smsProvider, store)
	h := handler.New(svc, cfg.Auth.Aadhaar.MaxFileSize)

	// Set up Gin router
	if !cfg.App.Debug {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORS())
	router.Use(middleware.RequestID())

	// Per-route rate limiting
	limits := map[string]middleware.RateLimitConfig{
		"/api/v1/auth/register":       {Max: 5, Window: time.Minute},
		"/api/v1/auth/verify-otp":     {Max: 10, Window: time.Minute},
		"/api/v1/auth/refresh":        {Max: 20, Window: time.Minute},
		"/api/v1/auth/verify-aadhaar": {Max: 3, Window: time.Minute},
	}
	defaultRL := middleware.RateLimitConfig{Max: 60, Window: time.Minute}
	router.Use(middleware.PerRouteRateLimit(rdb, limits, defaultRL))

	// Health check (no auth required)
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "identity"})
	})

	// Register routes
	api := router.Group("/api/v1")
	h.RegisterPublicRoutes(api)
	h.RegisterProtectedRoutes(api)

	// Start HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", 8001),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Int("port", 8001).Msg("HTTP server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("HTTP server failed")
		}
	}()

	// TODO: Start gRPC server on port 50051

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down identity service...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("HTTP server shutdown error")
	}

	log.Info().Msg("identity service stopped")
}
