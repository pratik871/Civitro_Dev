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
	"github.com/civitro/services/polls/internal/handler"
	"github.com/civitro/services/polls/internal/repository"
	"github.com/civitro/services/polls/internal/service"
)

func main() {
	// Load configuration.
	cfg := config.Get()

	logger.Init()
	log := logger.WithService("polls")

	log.Info().
		Int("http_port", 8013).
		Int("grpc_port", 50063).
		Msg("starting polls service")

	// Connect to database.
	ctx := context.Background()
	pool, err := database.Postgres(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer database.ClosePostgres()

	// Build layers.
	repo := repository.NewPollRepository(pool)
	svc := service.NewPollService(repo)
	h := handler.NewPollHandler(svc)

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
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "polls"})
	})

	// Public routes -- poll results are publicly readable.
	public := router.Group("/api/v1")
	public.GET("/polls/:id", h.GetPoll)
	public.GET("/polls/:id/results", h.GetResults)
	public.GET("/polls/boundary/:boundary_id", h.GetByBoundary)

	// Authenticated routes -- creating polls and voting requires auth.
	authed := router.Group("/api/v1")
	authed.Use(middleware.JWTAuth())
	authed.POST("/polls", h.CreatePoll)
	authed.POST("/polls/:id/vote", h.CastVote)
	authed.DELETE("/polls/:id", h.DeletePoll)

	// Start HTTP server.
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", 8013),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Int("port", 8013).Msg("HTTP server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("HTTP server failed")
		}
	}()

	// TODO: Start gRPC server on port 50063

	// Graceful shutdown.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down polls service")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("HTTP server shutdown error")
	}

	log.Info().Msg("polls service stopped")
}
