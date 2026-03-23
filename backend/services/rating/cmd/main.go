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
	"github.com/civitro/services/rating/internal/handler"
	"github.com/civitro/services/rating/internal/repository"
	"github.com/civitro/services/rating/internal/service"
)

func main() {
	// Load configuration.
	cfg := config.Get()

	logger.Init()
	log := logger.WithService("rating")

	log.Info().
		Int("http_port", 8007).
		Int("grpc_port", 50057).
		Msg("starting rating service")

	// Connect to database.
	ctx := context.Background()
	pool, err := database.Postgres(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer database.ClosePostgres()

	// Build layers.
	repo := repository.NewRatingRepository(pool)
	svc := service.NewRatingService(repo)
	h := handler.NewRatingHandler(svc)

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
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "rating"})
	})

	// Public routes -- ratings are publicly readable for accountability.
	public := router.Group("/api/v1")
	public.GET("/ratings/representative/:rep_id", h.GetRating)
	public.GET("/ratings/representative/:rep_id/history", h.GetRatingHistory)
	public.GET("/ratings/boundary/:boundary_id/rankings", h.GetRankings)

	// Authenticated routes -- submitting surveys requires auth.
	authed := router.Group("/api/v1")
	authed.Use(middleware.JWTAuth())
	authed.POST("/ratings/survey", h.SubmitSurvey)
	authed.GET("/ratings/my-rating/:rep_id", h.GetMyRating)

	// Start HTTP server.
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", 8007),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Int("port", 8007).Msg("HTTP server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("HTTP server failed")
		}
	}()

	// TODO: Start gRPC server on port 50057

	// Graceful shutdown.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down rating service")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("HTTP server shutdown error")
	}

	log.Info().Msg("rating service stopped")
}
