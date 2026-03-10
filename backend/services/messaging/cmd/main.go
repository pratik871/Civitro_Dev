package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/civitro/pkg/config"
	"github.com/civitro/pkg/database"
	"github.com/civitro/pkg/logger"
	"github.com/civitro/pkg/middleware"
	"github.com/civitro/services/messaging/internal/handler"
	"github.com/civitro/services/messaging/internal/repository"
	"github.com/civitro/services/messaging/internal/service"
)

func main() {
	// Load configuration.
	cfg := config.Get()

	logger.Init()
	log := logger.WithService("messaging")

	log.Info().
		Int("http_port", 8014).
		Int("grpc_port", 50064).
		Msg("starting messaging service")

	// Connect to database.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := database.Postgres(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer database.ClosePostgres()

	// Build layers.
	repo := repository.NewMessageRepository(pool)
	svc := service.NewMessagingService(repo)
	h := handler.NewMessagingHandler(svc)

	// Setup Gin router.
	if !cfg.App.Debug {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORS())
	router.Use(middleware.RequestID())

	// Health check.
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "messaging"})
	})

	// WebSocket endpoint — on the same port as HTTP (8014).
	h.RegisterWebSocket(router)

	// Authenticated routes — messaging requires verification.
	authed := router.Group("/api/v1")
	authed.Use(middleware.JWTAuth())
	h.RegisterRoutes(authed)

	// Start HTTP + WebSocket server.
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", 8014),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  120 * time.Second, // Longer idle for WebSocket connections.
	}

	go func() {
		log.Info().Int("port", 8014).Msg("HTTP + WebSocket server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("HTTP server failed")
		}
	}()

	// TODO: Start gRPC server on port 50064
	// TODO: Start Redis pub/sub subscriber for cross-instance WebSocket delivery

	// Graceful shutdown.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down messaging service")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("HTTP server shutdown error")
	}

	log.Info().Msg("messaging service stopped")
}
