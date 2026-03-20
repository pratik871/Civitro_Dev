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
	"github.com/civitro/services/ledger/internal/handler"
	"github.com/civitro/services/ledger/internal/repository"
	"github.com/civitro/services/ledger/internal/service"
)

func main() {
	// Load configuration.
	cfg := config.Get()

	logger.Init()
	log := logger.WithService("ledger")

	log.Info().
		Int("http_port", 8006).
		Int("grpc_port", 50056).
		Msg("starting ledger service")

	// Connect to database.
	ctx := context.Background()
	pool, err := database.Postgres(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer database.ClosePostgres()

	// Initialize Kafka producer.
	producer := events.NewProducer()
	defer producer.Close()

	// Build layers.
	repo := repository.NewLedgerRepository(pool)
	svc := service.NewLedgerService(repo, producer)
	h := handler.NewLedgerHandler(svc)

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
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "ledger"})
	})

	// Register routes (public timeline is readable without auth).
	public := router.Group("/api/v1")
	public.GET("/ledger/issue/:issue_id", h.GetTimeline)
	public.GET("/ledger/entry/:id", h.GetEntry)

	// Authenticated routes for writing (external clients).
	authed := router.Group("/api/v1")
	authed.Use(middleware.JWTAuth())

	// Ledger entry append — also available without auth for internal service-to-service calls.
	// Internal services (issues, notifications) call this directly within the Docker network.
	public.POST("/ledger/entry", h.AppendEntry)

	// Start HTTP server.
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", 8006),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Int("port", 8006).Msg("HTTP server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("HTTP server failed")
		}
	}()

	// TODO: Start gRPC server on port 50056

	// Graceful shutdown.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down ledger service")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("HTTP server shutdown error")
	}

	log.Info().Msg("ledger service stopped")
}
