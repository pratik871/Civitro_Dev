.PHONY: infra-up infra-down infra-reset dev-go dev-python dev-all proto test lint migrate-up migrate-down ollama-setup clean

# ── Infrastructure ─────────────────────────────────────────────

infra-up: ## Start all infrastructure services
	docker compose -f infra/docker-compose.yml up -d

infra-down: ## Stop all infrastructure services
	docker compose -f infra/docker-compose.yml down

infra-reset: ## Stop all infrastructure and remove volumes
	docker compose -f infra/docker-compose.yml down -v

# ── Development ────────────────────────────────────────────────

dev-go: ## Run all Go services
	# TODO: Start all Go microservices (identity, geospatial, registry, etc.)
	# Example: use goreman, overmind, or a Procfile runner
	@echo "Starting Go services from backend/services/..."

dev-python: ## Run all Python services
	# TODO: Start all Python AI/ML services (classification, sentiment, etc.)
	# Example: use honcho or a Procfile runner
	@echo "Starting Python services from ai/services/..."

dev-all: infra-up dev-go dev-python ## Run everything

# ── Protobuf ───────────────────────────────────────────────────

proto: ## Generate protobuf code (Go + Python)
	@echo "Generating protobuf code..."
	cd proto && buf generate

# ── Testing ────────────────────────────────────────────────────

test: test-go test-python ## Run all tests

test-go: ## Run Go tests
	@echo "Running Go tests..."
	cd backend && go test ./...

test-python: ## Run Python tests
	@echo "Running Python tests..."
	cd ai && python -m pytest

lint: lint-go lint-python lint-proto ## Run all linters

lint-go: ## Lint Go code
	@echo "Linting Go..."
	cd backend && golangci-lint run ./...

lint-python: ## Lint Python code
	@echo "Linting Python..."
	cd ai && ruff check .

lint-proto: ## Lint proto files
	@echo "Linting Proto..."
	cd proto && buf lint

# ── Migrations ─────────────────────────────────────────────────

migrate-up: ## Run database migrations
	@echo "Running migrations..."
	migrate -path ./infra/migrations -database "postgres://civitro:civitro_dev@localhost:5432/civitro?sslmode=disable" up

migrate-down: ## Rollback database migrations
	@echo "Rolling back migrations..."
	migrate -path ./infra/migrations -database "postgres://civitro:civitro_dev@localhost:5432/civitro?sslmode=disable" down 1

# ── Ollama ─────────────────────────────────────────────────────

ollama-setup: ## Pull required Ollama models
	@echo "Pulling Ollama models..."
	docker exec civitro-ollama ollama pull llama3.1:8b
	docker exec civitro-ollama ollama pull llama-guard3

# ── Cleanup ────────────────────────────────────────────────────

clean: ## Clean build artifacts and temp files
	@echo "Cleaning..."
	rm -rf tmp/
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	cd backend && go clean -cache -testcache
	@echo "Done."

# ── Help ───────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
