package database

import (
	"context"
	"fmt"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"

	"github.com/civitro/pkg/config"
	"github.com/civitro/pkg/logger"
)

// -----------------------------------------------------------------------------
// MongoDB client (singleton)
// -----------------------------------------------------------------------------

var (
	mongoOnce   sync.Once
	mongoClient *mongo.Client
	mongoDB     *mongo.Database
)

// MongoDB returns a shared *mongo.Database. The client is created on the first
// call using settings from config.
func MongoDB(ctx context.Context) (*mongo.Database, error) {
	var initErr error
	mongoOnce.Do(func() {
		db, err := newMongoClient(ctx)
		if err != nil {
			initErr = err
			return
		}
		mongoDB = db
	})
	if initErr != nil {
		mongoOnce = sync.Once{}
		return nil, initErr
	}
	return mongoDB, nil
}

func newMongoClient(ctx context.Context) (*mongo.Database, error) {
	cfg := config.Get().Databases.Mongo

	if cfg.URI == "" {
		return nil, fmt.Errorf("mongodb: URI is not configured")
	}

	clientOpts := options.Client().
		ApplyURI(cfg.URI).
		SetConnectTimeout(10 * time.Second).
		SetServerSelectionTimeout(5 * time.Second)

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, fmt.Errorf("mongodb: connect: %w", err)
	}

	// Verify connectivity.
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := client.Ping(pingCtx, readpref.Primary()); err != nil {
		return nil, fmt.Errorf("mongodb: ping: %w", err)
	}

	mongoClient = client

	dbName := cfg.Database
	if dbName == "" {
		dbName = "civitro"
	}

	logger.Info().
		Str("database", dbName).
		Msg("mongodb connection established")

	return client.Database(dbName), nil
}

// MongoHealthCheck pings the MongoDB server.
func MongoHealthCheck(ctx context.Context) error {
	if mongoClient == nil {
		return fmt.Errorf("mongodb: client not initialised")
	}
	return mongoClient.Ping(ctx, readpref.Primary())
}

// CloseMongoDB gracefully disconnects the MongoDB client.
func CloseMongoDB(ctx context.Context) error {
	if mongoClient != nil {
		logger.Info().Msg("mongodb connection closed")
		return mongoClient.Disconnect(ctx)
	}
	return nil
}
