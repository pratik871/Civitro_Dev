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
	"github.com/civitro/pkg/translate"
	"github.com/civitro/services/issues/internal/handler"
	"github.com/civitro/services/issues/internal/repository"
	"github.com/civitro/services/issues/internal/service"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Get()

	// Initialize logger
	logger.Init()
	log := logger.WithService("issues")

	log.Info().
		Int("http_port", 8005).
		Int("grpc_port", 50055).
		Msg("starting issues service")

	// Connect to database
	ctx := context.Background()
	pool, err := database.Postgres(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer database.ClosePostgres()
	log.Info().Msg("connected to database")

	// Initialize event producer
	producer := events.NewProducer()
	defer producer.Close()

	// Initialize translation client
	translationEp := cfg.Services.Endpoints["translation"]
	translator := translate.NewFromConfig(translationEp.Host, translationEp.HTTPPort)

	// Initialize layers
	repo := repository.NewPostgresRepository(pool)
	svc := service.New(repo, producer, translator)
	h := handler.New(svc)

	// Set up Gin router
	if !cfg.App.Debug {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORS())
	router.Use(middleware.RequestID())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "issues"})
	})

	// Public routes (optional auth — for share pages)
	pub := router.Group("/api/v1")
	pub.Use(middleware.OptionalJWTAuth())
	h.RegisterPublicRoutes(pub)

	// API routes (auth required)
	api := router.Group("/api/v1")
	api.Use(middleware.JWTAuth())
	h.RegisterRoutes(api)

	// Start HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", 8005),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Int("port", 8005).Msg("HTTP server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("HTTP server failed")
		}
	}()

	// TODO: Start gRPC server on port 50055

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down issues service...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("HTTP server shutdown error")
	}

	log.Info().Msg("issues service stopped")
}
