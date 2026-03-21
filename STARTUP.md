# CIVITRO — Startup Instructions for Claude

## EVERY SESSION: Read These First
1. Read `D:/civitro/STARTUP.md` (this file)
2. Read `D:/civitro/memory/project-summary.md` (architecture overview)
3. Read `D:/civitro/logs/conversation-log.md` (previous session notes)
4. Read `D:/civitro/docs/` folder for any new or updated documents
5. Check persistent memory at `C:\Users\prati\.claude\projects\D--civitro\memory\MEMORY.md`

## Project: Civitro — Civic Intelligence Platform
- **Tagline:** "Democracy you can see"
- **Type:** Citizen-Government Collaboration Platform
- **Target:** India launch, 100M+ users scale
- **Architecture:** 23 microservices, event-driven, mobile-first

## Key Docs
- `docs/civitro_2.html` — Full UI prototype (React mobile mockup)
- `docs/civitro_architecture.html` — Enterprise architecture blueprint
- `docs/config-architecture.md` — Centralized config system design

## Project Structure (Organized Monorepo)
- `backend/` — 15 Go microservices + shared pkg
- `ai/` — 8 Python AI/ML services + shared library
- `frontend/` — mobile (React Native) + web (Next.js)
- `proto/` — 15 gRPC definitions (shared API contracts)
- `infra/` — Docker Compose, Terraform, K8s manifests
- `config/` — Centralized YAML config

## Tech Stack (Finalized)
- Mobile: React Native 0.75+
- Web: Next.js 14+
- Backend (Go — 15 services): Gin/Fiber, GORM/sqlc, golang-jwt, gorilla/websocket, gRPC
- Backend (Python — 8 AI services): FastAPI, SQLAlchemy 2.0, Celery, Pydantic v2, Uvicorn
- DB: Aurora PostgreSQL + PostGIS, DocumentDB, Redis, OpenSearch, TimescaleDB
- Events: Apache Kafka (AWS MSK)
- AI/ML: SageMaker, Bedrock (Claude), Rekognition
- Infra: ECS Fargate, Terraform, GitHub Actions + ArgoCD
- Payments: Razorpay (India) / Stripe (global)

## Development Phases
- **MVP (30 days):** Auth, issue reporting, AI classify, ledger, leader profiles, ratings, notifications — COMPLETE
- **Wave 2 (M2-3):** Voices, polls, reputation, CHI, search, leader dashboard — COMPLETE
- **Wave 3 (M4-6):** Promise tracker, sentiment, DM, datamine, party/NGO tools — IN PROGRESS (Community Actions, Pattern Detection, DM, Ward Mood done)
- **Wave 4 (M6-12):** Ads, exit polls, fraud detection, participatory budgeting
- **Wave 5 (Year 2+):** International expansion, advanced AI, API marketplace

## Rules for Claude
- Always read logs and memory at session start
- Update `logs/conversation-log.md` with session summary after each session
- Update `memory/project-summary.md` when architecture decisions change
- Ask user to confirm before making major architectural changes
