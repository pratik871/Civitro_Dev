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
	"github.com/civitro/pkg/logger"
	"github.com/civitro/pkg/middleware"
	"github.com/civitro/pkg/translate"
	"github.com/civitro/services/search/internal/handler"
	"github.com/civitro/services/search/internal/model"
	"github.com/civitro/services/search/internal/repository"
	"github.com/civitro/services/search/internal/service"
)

func main() {
	cfg := config.Get()

	logger.Init()
	log := logger.WithService("search")

	log.Info().
		Int("http_port", 8015).
		Int("grpc_port", 50065).
		Msg("starting search service")

	// OpenSearch URL from environment or default.
	opensearchURL := os.Getenv("OPENSEARCH_URL")
	if opensearchURL == "" {
		opensearchURL = "http://localhost:9200"
	}

	// Initialize translation client.
	translationEp := cfg.Services.Endpoints["translation"]
	translator := translate.NewFromConfig(translationEp.Host, translationEp.HTTPPort)

	// Initialize repository, service, and handler.
	repo := repository.New(opensearchURL)
	svc := service.New(repo, translator)
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
		c.JSON(http.StatusOK, gin.H{"service": "search", "status": "healthy"})
	})

	// Register routes.
	api := router.Group("/api/v1")
	api.Use(middleware.JWTAuth())
	h.RegisterRoutes(api)

	// Start Kafka consumer for near-real-time indexing.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go startIndexConsumer(ctx, cfg, svc)

	// Start HTTP server.
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", 8015),
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Int("port", 8015).Msg("HTTP server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("HTTP server failed")
		}
	}()

	// Graceful shutdown.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down search service")
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("server forced to shutdown")
	}

	log.Info().Msg("search service stopped")
}

// startIndexConsumer consumes indexing events from Kafka for near-real-time search indexing.
func startIndexConsumer(ctx context.Context, cfg *config.Config, svc *service.Service) {
	topics := []string{
		"voice.created", "issue.created", "representative.claimed",
		"search.index", "search.delete",
	}

	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        cfg.Events.Brokers,
		GroupID:        "search-indexer",
		GroupTopics:    topics,
		MinBytes:       1,
		MaxBytes:       10e6,
		CommitInterval: 1 * time.Second,
		MaxWait:        30 * time.Second, // 30s delay for near-real-time
	})
	defer reader.Close()

	logger.Info().Strs("topics", topics).Msg("search index consumer started")

	for {
		select {
		case <-ctx.Done():
			logger.Info().Msg("search index consumer stopping")
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

			var req model.IndexDocumentRequest
			if err := json.Unmarshal(msg.Value, &req); err != nil {
				logger.Error().
					Err(err).
					Str("topic", msg.Topic).
					Msg("failed to unmarshal index request")
				continue
			}

			if err := svc.IndexDocument(ctx, req); err != nil {
				logger.Error().
					Err(err).
					Str("index", req.Index).
					Str("id", req.ID).
					Msg("failed to index document")
			}
		}
	}
}
