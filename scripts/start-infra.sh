#!/bin/bash
# Start all infrastructure for local development
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "Starting Civitro infrastructure..."
docker compose -f infra/docker-compose.yml up -d

echo "Waiting for services to be healthy..."
sleep 10

echo "Running database migrations..."
# Check if migrate tool is installed
if command -v migrate &> /dev/null; then
    migrate -path ./infra/migrations -database "postgres://civitro:civitro_dev@localhost:5432/civitro?sslmode=disable" up
else
    echo "golang-migrate not installed. Running SQL directly..."
    if [ -f infra/migrations/000001_initial_schema.up.sql ]; then
        docker exec -i civitro-postgres psql -U civitro -d civitro < infra/migrations/000001_initial_schema.up.sql
    else
        echo "No migration files found. Skipping migrations."
    fi
fi

echo "Setting up MinIO bucket..."
docker exec civitro-minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>/dev/null || true
docker exec civitro-minio mc mb local/civitro-media 2>/dev/null || true

echo "Infrastructure ready!"
echo ""
echo "Services:"
echo "  PostgreSQL:      localhost:5432"
echo "  MongoDB:         localhost:27017"
echo "  Redis:           localhost:6379"
echo "  Kafka (Redpanda): localhost:9092"
echo "  OpenSearch:      localhost:9200"
echo "  TimescaleDB:     localhost:5433"
echo "  MinIO:           localhost:9000 (console: 9001)"
echo "  Ollama:          localhost:11434"
echo "  Jaeger:          localhost:16686"
