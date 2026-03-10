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
	"github.com/civitro/services/geospatial/internal/handler"
	"github.com/civitro/services/geospatial/internal/repository"
	"github.com/civitro/services/geospatial/internal/service"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Get()

	// Initialize logger
	logger.Init()
	log := logger.WithService("geospatial")

	log.Info().
		Int("http_port", 8002).
		Int("grpc_port", 50052).
		Msg("starting geospatial service")

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

	// Initialize layers
	repo := repository.NewPostgresRepository(pool)
	svc := service.New(repo, producer)
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
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "geospatial"})
	})

	// API routes
	api := router.Group("/api/v1")
	h.RegisterRoutes(api)

	// Start HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", 8002),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Int("port", 8002).Msg("HTTP server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("HTTP server failed")
		}
	}()

	// TODO: Start gRPC server on port 50052

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down geospatial service...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("HTTP server shutdown error")
	}

	log.Info().Msg("geospatial service stopped")
}
