// +build ignore

package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5"
)

func main() {
	connStr := "postgres://civitro:civitro_dev@127.0.0.1:15433/civitro_ts?sslmode=disable"
	ctx := context.Background()

	conn, err := pgx.Connect(ctx, connStr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to connect to TimescaleDB: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(ctx)

	fmt.Println("Connected to TimescaleDB successfully.")

	migrationFile := filepath.Join("D:", "civitro", "infra", "migrations", "000002_timescaledb_schema.up.sql")
	sqlBytes, err := os.ReadFile(migrationFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to read migration file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Executing migration from %s (%d bytes)...\n", migrationFile, len(sqlBytes))

	_, err = conn.Exec(ctx, string(sqlBytes))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Migration failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("TimescaleDB migration 000002_timescaledb_schema.up.sql applied successfully!")
}
