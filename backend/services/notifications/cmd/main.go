package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/segmentio/kafka-go"

	"github.com/civitro/pkg/config"
	"github.com/civitro/pkg/database"
	"github.com/civitro/pkg/logger"
	"github.com/civitro/pkg/middleware"
	"github.com/civitro/services/notifications/internal/handler"
	"github.com/civitro/services/notifications/internal/model"
	"github.com/civitro/services/notifications/internal/repository"
	"github.com/civitro/services/notifications/internal/service"
)

func main() {
	cfg := config.Get()

	logger.Init()
	log := logger.WithService("notifications")

	log.Info().
		Int("http_port", 8017).
		Int("grpc_port", 50067).
		Msg("starting notifications service")

	// Connect to PostgreSQL.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := database.Postgres(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer database.ClosePostgres()

	// Initialize repository, service, and handler.
	repo := repository.New(pool)
	svc := service.New(repo)
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
		c.JSON(http.StatusOK, gin.H{"service": "notifications", "status": "healthy"})
	})

	// Register routes.
	api := router.Group("/api/v1")
	api.Use(middleware.JWTAuth())
	h.RegisterRoutes(api)

	// Start Kafka consumer for notification delivery.
	go startNotificationConsumer(ctx, cfg, svc)

	// Start HTTP server.
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", 8017),
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Int("port", 8017).Msg("HTTP server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("HTTP server failed")
		}
	}()

	// Graceful shutdown.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down notifications service")
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("server forced to shutdown")
	}

	log.Info().Msg("notifications service stopped")
}

// startNotificationConsumer consumes notification events from Kafka.
func startNotificationConsumer(ctx context.Context, cfg *config.Config, svc *service.Service) {
	topics := []string{
		"notification.send",
		"issue.status.updated",
		"voice.trending",
		"promise.updated",
		"achievement.unlocked",
	}

	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        cfg.Events.Brokers,
		GroupID:        "notification-sender",
		GroupTopics:    topics,
		MinBytes:       1,
		MaxBytes:       10e6,
		CommitInterval: 1 * time.Second,
	})
	defer reader.Close()

	logger.Info().Strs("topics", topics).Msg("notification consumer started")

	for {
		select {
		case <-ctx.Done():
			logger.Info().Msg("notification consumer stopping")
			return
		default:
			msg, err := reader.ReadMessage(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				logger.Error().Err(err).Msg("failed to read kafka message")
				continue
			}

			var req model.SendNotificationRequest
			if err := json.Unmarshal(msg.Value, &req); err != nil {
				logger.Error().
					Err(err).
					Str("topic", msg.Topic).
					Msg("failed to unmarshal notification request")
				continue
			}

			if err := svc.SendNotification(ctx, req); err != nil {
				logger.Error().
					Err(err).
					Str("user_id", req.UserID).
					Str("type", string(req.Type)).
					Msg("failed to send notification")
			}
		}
	}
}
