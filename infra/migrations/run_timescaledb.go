// +build ignore

package main

import (
	"context"
	"fmt"
	"os"

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

	sqlBytes, err := os.ReadFile("000002_timescaledb_schema.up.sql")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to read migration file: %v\n", err)
		os.Exit(1)
	}

	_, err = conn.Exec(ctx, string(sqlBytes))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Migration failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("TimescaleDB migration 000002_timescaledb_schema.up.sql applied successfully!")
}
