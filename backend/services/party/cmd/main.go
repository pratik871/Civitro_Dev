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
	"github.com/civitro/pkg/events"
	"github.com/civitro/pkg/logger"
	"github.com/civitro/pkg/middleware"
	"github.com/civitro/services/party/internal/handler"
	"github.com/civitro/services/party/internal/repository"
	"github.com/civitro/services/party/internal/service"
)

func main() {
	cfg := config.Get()

	logger.Init()
	log := logger.WithService("party")

	log.Info().
		Int("http_port", 8019).
		Int("grpc_port", 50069).
		Msg("starting party service")

	// Connect to PostgreSQL.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := database.Postgres(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer database.ClosePostgres()

	// Initialize Kafka producer.
	producer := events.NewProducer()
	defer producer.Close()

	// Initialize repository, service, and handler.
	repo := repository.New(pool)
	svc := service.New(repo, producer)
	h := handler.New(svc)

	// Set up Gin router.
	if !cfg.App.Debug {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORS())
	router.Use(middleware.RequestID())

	// Health check.
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": "party", "status": "healthy"})
	})

	// Register routes.
	api := router.Group("/api/v1")
	api.Use(middleware.JWTAuth())
	h.RegisterRoutes(api)

	// Start HTTP server.
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", 8019),
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Int("port", 8019).Msg("HTTP server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("HTTP server failed")
		}
	}()

	// Graceful shutdown.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down party service")
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("server forced to shutdown")
	}

	log.Info().Msg("party service stopped")
}
