# Civitro — Configuration Architecture

## Principle
Every external dependency (AI models, databases, APIs, storage) is configured via a single config system.
Switching from local → cloud → different provider = change config file only. Zero code changes.

## Config Hierarchy (Priority: highest → lowest)
```
1. Environment variables          ← deployment overrides (K8s, ECS)
2. .env.{environment} file        ← per-environment config
3. config/{environment}.yaml      ← structured config
4. config/default.yaml            ← base defaults (local dev)
```

## Environments
```
local       → Everything on your machine (Docker, NPU, Ollama)
development → Shared dev server
staging     → Pre-production (cloud)
production  → Live (full AWS)
```

---

## Config Structure

### config/default.yaml (Local Development)
```yaml
app:
  name: civitro
  environment: local
  debug: true
  port: 8080

# ─────────────────────────────────────────
# DATABASES
# ─────────────────────────────────────────
databases:
  postgres:
    provider: local                    # local | aws_aurora
    host: localhost
    port: 5432
    name: civitro
    user: civitro
    password: civitro_dev
    ssl: false
    pool_size: 20
    postgis: true

  mongodb:
    provider: local                    # local | aws_documentdb
    uri: mongodb://localhost:27017
    database: civitro
    replica_set: ""

  redis:
    provider: local                    # local | aws_elasticache
    host: localhost
    port: 6379
    password: ""
    cluster: false

  opensearch:
    provider: local                    # local | aws_opensearch
    host: localhost
    port: 9200
    scheme: http
    username: admin
    password: admin

  timescaledb:
    provider: local                    # local | aws_timescale
    host: localhost
    port: 5433
    name: civitro_ts
    user: civitro
    password: civitro_dev

# ─────────────────────────────────────────
# OBJECT STORAGE
# ─────────────────────────────────────────
storage:
  provider: minio                      # minio | aws_s3
  endpoint: http://localhost:9000
  region: us-east-1
  bucket: civitro-media
  access_key: minioadmin
  secret_key: minioadmin
  cdn_url: ""                          # empty for local, CloudFront URL for prod

# ─────────────────────────────────────────
# EVENT BUS
# ─────────────────────────────────────────
events:
  provider: redpanda                   # redpanda | aws_msk | confluent
  brokers:
    - localhost:9092
  schema_registry: http://localhost:8081
  consumer_group_prefix: civitro
  topics:
    user: civitro.user.events
    issue: civitro.issue.events
    voice: civitro.voice.events
    rating: civitro.rating.events
    promise: civitro.promise.events
    chi: civitro.chi.events
    poll: civitro.poll.events
    message: civitro.message.events
    moderation: civitro.moderation.events
    analytics: civitro.analytics.events
    org: civitro.org.events
    ad: civitro.ad.events

# ─────────────────────────────────────────
# AI / ML MODELS
# ─────────────────────────────────────────
ai:
  # LLM (Promise extraction, summarization, analysis)
  llm:
    provider: ollama                   # ollama | openai | aws_bedrock | vllm
    endpoint: http://localhost:11434
    model: llama3.1:8b
    device: npu                        # npu | gpu | cpu
    max_tokens: 4096
    temperature: 0.3

  # Image Classification (CivitroVision)
  vision:
    provider: local                    # local | aws_sagemaker
    endpoint: http://localhost:8501
    model: vit-b-16-civitro
    device: gpu                        # gpu | cpu
    confidence_threshold: 0.8
    uncertain_threshold: 0.6
    max_latency_ms: 500

  # Sentiment Analysis
  sentiment:
    provider: local                    # local | aws_sagemaker
    endpoint: http://localhost:8502
    model: multilingual-bert-sentiment
    device: npu                        # npu | gpu | cpu
    languages:
      - en
      - hi
      - mr
      - ta
      - te
      - bn
      - gu
      - kn
      - ml
      - pa
      - or
      - as
      - ur
      - sd
      - ne

  # Content Moderation
  moderation:
    provider: local                    # local | aws_rekognition | openai
    text_endpoint: http://localhost:11434
    text_model: llama-guard3
    image_endpoint: http://localhost:8503
    image_model: open-nsfw2
    device: npu
    auto_remove_threshold: 0.9
    review_threshold: 0.7

  # Language Detection
  language_detection:
    provider: local                    # local | aws_comprehend
    model: fasttext-lid
    device: npu

# ─────────────────────────────────────────
# BHASHINI (Indian Language AI)
# ─────────────────────────────────────────
bhashini:
  mode: offline                        # offline | api | hybrid

  # Offline mode (NPU via OpenVINO)
  offline:
    runtime: openvino                  # openvino | onnx
    device: npu                        # npu | gpu | cpu
    models_dir: ./models/bhashini
    asr:
      enabled: true
      model: bhashini-asr-multilingual
      languages: [hi, ta, te, bn, mr, gu, kn, ml, pa, en]
    nmt:
      enabled: true
      model: bhashini-nmt-multilingual
      source_languages: [hi, ta, te, bn, mr, gu, kn, ml, pa, en]
      target_languages: [hi, ta, te, bn, mr, gu, kn, ml, pa, en]
    tts:
      enabled: true
      model: bhashini-tts-multilingual
      languages: [hi, ta, te, bn, mr, gu, kn, ml, en]
      voices: [male, female]
    ocr:
      enabled: true
      model: bhashini-ocr
      languages: [hi, ta, te, bn, mr, en]

  # API mode (Cloud)
  api:
    base_url: https://dhruva-api.bhashini.gov.in
    api_key: ""                        # from BHASHINI_API_KEY env var
    user_id: ""
    ulca_api_key: ""
    pipeline_id: ""
    timeout_ms: 5000
    retry_count: 3

  # Hybrid mode: try offline first, fallback to API
  hybrid:
    prefer: offline                    # offline | api
    fallback_on_error: true
    fallback_on_unsupported_language: true

# ─────────────────────────────────────────
# AUTH & IDENTITY
# ─────────────────────────────────────────
auth:
  jwt:
    secret: "${JWT_SECRET:-civitro-local-dev-secret-change-in-prod}"
    expiry: 24h
    refresh_expiry: 720h
    issuer: civitro

  otp:
    provider: console                  # console | twilio | msg91
    # Console mode: prints OTP to terminal (local dev)
    twilio:
      account_sid: ""
      auth_token: ""
      from_number: ""
    msg91:
      auth_key: ""
      template_id: ""

  aadhaar:
    provider: mock                     # mock | digilocker
    digilocker:
      client_id: ""
      client_secret: ""
      redirect_uri: ""

# ─────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────
notifications:
  push:
    provider: console                  # console | fcm
    fcm:
      credentials_file: ""
      project_id: ""
  email:
    provider: console                  # console | ses | sendgrid
    ses:
      region: ap-south-1
      from: noreply@civitro.in
    sendgrid:
      api_key: ""
      from: noreply@civitro.in
  sms:
    provider: console                  # console | twilio | msg91
    # Reuses auth.otp provider config

# ─────────────────────────────────────────
# PAYMENTS
# ─────────────────────────────────────────
payments:
  provider: mock                       # mock | razorpay | stripe
  razorpay:
    key_id: ""
    key_secret: ""
    webhook_secret: ""
  stripe:
    secret_key: ""
    publishable_key: ""
    webhook_secret: ""

# ─────────────────────────────────────────
# GEOSPATIAL
# ─────────────────────────────────────────
geo:
  geocoding:
    provider: mock                     # mock | google_maps | mapmyindia
    google:
      api_key: ""
    mapmyindia:
      client_id: ""
      client_secret: ""
  boundaries:
    source: local_shapefile            # local_shapefile | api
    shapefile_dir: ./data/boundaries

# ─────────────────────────────────────────
# MONITORING
# ─────────────────────────────────────────
monitoring:
  metrics:
    provider: prometheus               # prometheus | datadog | grafana_cloud
    port: 9090
  tracing:
    provider: jaeger                   # jaeger | xray | otel
    endpoint: http://localhost:14268
  logging:
    level: debug                       # debug | info | warn | error
    format: text                       # text | json
    output: stdout                     # stdout | file | cloudwatch

# ─────────────────────────────────────────
# SERVICES (Inter-service communication)
# ─────────────────────────────────────────
services:
  protocol: grpc                       # grpc | rest
  discovery: static                    # static | consul | aws_cloudmap

  endpoints:
    identity:       { host: localhost, grpc_port: 50051, http_port: 8001 }
    geospatial:     { host: localhost, grpc_port: 50052, http_port: 8002 }
    registry:       { host: localhost, grpc_port: 50053, http_port: 8003 }
    voices:         { host: localhost, grpc_port: 50054, http_port: 8004 }
    issues:         { host: localhost, grpc_port: 50055, http_port: 8005 }
    ledger:         { host: localhost, grpc_port: 50056, http_port: 8006 }
    rating:         { host: localhost, grpc_port: 50057, http_port: 8007 }
    classification: { host: localhost, grpc_port: 50058, http_port: 8008 }
    sentiment:      { host: localhost, grpc_port: 50059, http_port: 8009 }
    promises:       { host: localhost, grpc_port: 50060, http_port: 8010 }
    chi:            { host: localhost, grpc_port: 50061, http_port: 8011 }
    reputation:     { host: localhost, grpc_port: 50062, http_port: 8012 }
    polls:          { host: localhost, grpc_port: 50063, http_port: 8013 }
    messaging:      { host: localhost, grpc_port: 50064, http_port: 8014 }
    search:         { host: localhost, grpc_port: 50065, http_port: 8015 }
    datamine:       { host: localhost, grpc_port: 50066, http_port: 8016 }
    notifications:  { host: localhost, grpc_port: 50067, http_port: 8017 }
    admin:          { host: localhost, grpc_port: 50068, http_port: 8018 }
    party:          { host: localhost, grpc_port: 50069, http_port: 8019 }
    advertising:    { host: localhost, grpc_port: 50070, http_port: 8020 }
```

---

## Switching Examples

### Local → AWS Production
```yaml
# Change in config/production.yaml (only overrides needed)
databases:
  postgres:
    provider: aws_aurora
    host: civitro-cluster.abc123.ap-south-1.rds.amazonaws.com
    ssl: true

storage:
  provider: aws_s3
  bucket: civitro-media-prod
  cdn_url: https://cdn.civitro.in

ai:
  llm:
    provider: aws_bedrock
    model: anthropic.claude-3-sonnet

bhashini:
  mode: api
```

### Switch Ollama → vLLM
```yaml
ai:
  llm:
    provider: vllm
    endpoint: http://localhost:8000
    model: meta-llama/Llama-3.1-8B
```

### Switch Bhashini offline → cloud API
```yaml
bhashini:
  mode: api
  api:
    api_key: "your-key-here"
```

### Switch payment provider
```yaml
payments:
  provider: stripe    # was: razorpay
```

**Zero code changes. Just config.**
