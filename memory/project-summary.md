# Civitro — Project Summary & Architecture Notes

## Platform Identity
- **Name:** Civitro
- **Tagline:** "Democracy you can see"
- **Classification:** Citizen-Government Collaboration Platform
- **Strategic Framing:** Collaboration & civic utility — NOT a political criticism tool

## 20 Microservices
1. **Identity & Auth** — Phone OTP, Aadhaar/DigiLocker KYC, JWT, device fingerprinting
2. **Geospatial Mapping** — GPS→constituency, PostGIS boundaries, India admin hierarchy (Nation→Ward)
3. **Representative Registry** — 500K+ elected officials, profile claims, staff accounts
4. **Voices & Content** — 500-char posts, 15 languages, hashtags, mentions, media
5. **Issue Reporting** — Photo+GPS+AI classify in <30s, auto-route, 12 categories, 7-state lifecycle
6. **Public Work Ledger** — Immutable event-sourced tracking ("GitHub commits for governance")
7. **Rating & Accountability** — Dynamic 0-5 stars (5 weighted factors, 90-day window)
8. **AI Classification (CivitroVision)** — ViT-B/16 image classifier, text NER, severity, <500ms
9. **AI Sentiment & Trends** — Multilingual NLP, 15 languages, emotion detection, trending
10. **Promise Tracker** — AI extracts promises from speeches/news, progress tracking
11. **CHI Engine** — 8-dimension Constituency Health Index (0-100), daily compute
12. **Citizen Reputation** — Credibility (0-1000) + Influence (0-100), 5 tiers
13. **Polls & Democracy** — Constituency polls, participatory budgeting, exit polls
14. **Messaging** — 1:1 DM, group, broadcast, WebSocket real-time
15. **Search & Discovery** — Elasticsearch, trending algorithm, 5 indices
16. **Datamine Analytics** — Premium dashboards, heatmaps, downloadable reports
17. **Notifications** — Push/in-app/email/SMS, max 10 push/day
18. **Admin & Moderation** — AI+human 4-layer moderation, brigading detection
19. **Party & Organization** — Political party/NGO/RWA management, hierarchy, broadcast
20. **Advertising** — Self-serve ads, geo-targeted, CPM/CPC, political compliance

## 6 User Personas
1. Citizens (free + premium)
2. Elected Leaders (dashboard, analytics)
3. Political Parties (org management, broadcast)
4. NGOs/RWAs/Clubs (community tools)
5. Advertisers/Brands (campaigns)
6. Civitro Admin Staff (moderation, platform health)

## 6 AI/ML Pipelines
1. Issue Classification (CivitroVision — ViT-B/16, GPU)
2. Sentiment Analysis (Multilingual BERT, NPU)
3. Promise Tracking (Llama 3.1 8B, NPU)
4. CHI Computation (multi-signal daily batch, GPU)
5. Fraud & Abuse Detection (real-time + batch)
6. Corruption Pattern Detection (signal generation)

## Bhashini Integration (Indian Language AI)
- ASR (Speech-to-Text): 22 Indian languages
- NMT (Translation): 36 text languages
- TTS (Text-to-Speech): 22 voice languages
- OCR: Document text extraction
- Modes: offline (NPU via OpenVINO) | cloud API | hybrid
- Used in: Issue Reporting, Voices, Sentiment, Notifications, Messaging, Promises

## Hardware (Dev Machine)
- CPU: Intel Ultra 9
- GPU: RTX 5070 (12GB VRAM)
- NPU: 36GB dedicated
- RAM: 64GB

## NPU Allocation (~18GB / 36GB used)
- Bhashini ASR (~2GB), NMT (~3GB), TTS (~2GB)
- Llama 3.1 8B (~5GB), Llama Guard 3 (~5GB)
- Multilingual BERT (~700MB), fastText (~1MB)

## Config Architecture
- Centralized YAML config: config/default.yaml (local), config/production.yaml (AWS)
- Every endpoint/provider switchable via config — zero code changes
- See docs/config-architecture.md for full spec

## UI Prototype (civitro_2.html)
- React 18 single-file prototype
- Mobile mockup (393x852px, iPhone-style)
- Screens: Home, Report, Leaders, Map, Trending, Ledger, CHI, Promises, Profile, Leader Dashboard, Messages, Search, Notifications, Polls, Resolved Issues
- Design: Saffron (#FF6B35) + Navy (#0B1426), Plus Jakarta Sans font
- Mock data: Mumbai Ward 27, Andheri East context

## Tech Stack Decision (Finalized 2026-03-10)

### Backend: Hybrid Go + Python

**Go (Gin/Fiber) — 14 high-throughput services:**
1. Identity & Auth
2. Geospatial Mapping
3. Representative Registry
4. Voices & Content
5. Issue Reporting
6. Public Work Ledger
7. Rating & Accountability
12. Citizen Reputation
13. Polls & Democracy
14. Messaging (WebSocket — Go goroutines)
15. Search & Discovery
17. Notifications
18. Admin & Moderation
19. Party & Organization

**Python (FastAPI) — 6 AI/analytics services:**
8. AI Classification (CivitroVision)
9. AI Sentiment & Trends
10. Promise Tracker (LLM/Claude)
11. CHI Engine (data science)
16. Datamine Analytics
20. Advertising

### Go Stack
- Framework: Gin / Fiber
- ORM: GORM / sqlc
- Geospatial: go-geom + PostGIS
- Kafka: confluent-kafka-go
- WebSocket: gorilla/websocket
- Auth: golang-jwt
- gRPC: inter-service comms
- Migration: golang-migrate

### Python Stack
- Framework: FastAPI
- ORM: SQLAlchemy 2.0 + GeoAlchemy2
- Tasks: Celery + Redis
- Kafka: aiokafka
- Validation: Pydantic v2
- Server: Uvicorn

### Frontend (unchanged)
- Mobile: React Native 0.75+
- Web: Next.js 14+
- State: Redux Toolkit + RTK Query

### Databases
- Aurora PostgreSQL 16+ with PostGIS (primary relational)
- DocumentDB/MongoDB (flexible schema — voices, messages)
- Redis 7+ (sessions, counters, cache, pub/sub)
- OpenSearch 2.x (search, trending, autocomplete)
- TimescaleDB (time-series — CHI, ratings, sentiment)
- S3 + CloudFront (media, reports)

### Infrastructure
- Containers: ECS Fargate
- IaC: Terraform + Terragrunt
- CI/CD: GitHub Actions + ArgoCD
- Monitoring: Datadog / Grafana Cloud
- Events: Apache Kafka (AWS MSK)

## Key Architectural Decisions
- Hybrid Go+Python backend (performance + AI strength)
- Event-driven via Kafka (12 domain topics, 67 events)
- CQRS pattern (write to Postgres, read from ES/Redis)
- gRPC for inter-service communication
- PostGIS for 250K+ ward boundaries
- Offline-first mobile (SQLite queue, background sync)
- India network optimization (<500KB photos, progressive loading)

## Docker Port Mappings (local dev — avoids local service conflicts)
All civitro Docker services use 1xxxx host ports to avoid conflicts with local PostgreSQL/Redis/wslrelay:
- PostgreSQL+PostGIS: **15432**, TimescaleDB: **15433**, Redis: **16379**
- MongoDB: 27017, Redpanda: **19092**, OpenSearch: **19200**
- MinIO: **19000/19001**, Ollama: 11434, Jaeger: 16686/**14317**/**14318**
- OpenSearch Dashboards: **15601**, Redpanda Console: **18888**

## Current Status (Updated 2026-03-13)
- **Backend: FULLY DOCKERIZED** — All 14 Go services in Docker Compose (5 MVP + 9 wave2 profile)
- **Infrastructure: ALL RUNNING** — 11 Docker containers + 14 Go services + nginx gateway
- **Database: MIGRATED** — 36 tables + comment threading + role column on users
- **Frontend Web:** Next.js 14, 67 files, 24 pages, builds successfully
- **Frontend Mobile:** React Native 0.76, 18+ screens, ALL wired to real APIs, ZERO mock data
- **Polls:** Full flow — list, vote (select→confirm), retract, detail. Creation locked to admin/representative via RequireRole middleware.
- **Voices:** Full flow — list (feed), create, detail, like/share/bookmark. PostGIS location queries fixed.
- **Comment System:** Threaded replies, upvote toggle, like counts, comment counts on issue cards
- **Civic Score:** End-to-end wired (issues→reputation→identity), 5 tiers, points for actions
- **RBAC:** Role field in JWT claims (citizen/representative/admin), RequireRole middleware, tested
- **Sentiment AI:** Python service running locally (port 8009), Multilingual BERT, single+batch analysis working
- **API Gateway:** Nginx with dynamic DNS resolution (resolver 127.0.0.11), no more 502 on service rebuild
- **Python AI:** Sentiment tested + working. 4/6 pass health check. Not yet dockerized — accessed via host.docker.internal
- **Phone Testing:** LAN IP 192.168.1.8, OTP hardcoded to 111111 for dev, full login flow works
- **Seeded Data:** 3 polls with options, 3 voices, 3 representatives, 6 promises
- **Next:** Wire sentiment into voices UI, messages e2e, photo upload, dockerize Python AI, add .next to .gitignore
