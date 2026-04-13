"""Configuration loader with YAML + env-var resolution and Pydantic validation."""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Pydantic models mirroring config/default.yaml
# ---------------------------------------------------------------------------


class AppConfig(BaseModel):
    name: str = "civitro"
    environment: str = "local"
    debug: bool = True
    version: str = "0.1.0"


# --- databases ---


class PostgresConfig(BaseModel):
    provider: str = "local"
    host: str = "localhost"
    port: int = 5432
    name: str = "civitro"
    user: str = "civitro"
    password: str = "civitro_dev"
    ssl: bool = False
    pool_size: int = 20
    postgis: bool = True

    @property
    def dsn(self) -> str:
        return (
            f"postgresql://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.name}"
        )


class MongoDBConfig(BaseModel):
    provider: str = "local"
    uri: str = "mongodb://localhost:27017"
    database: str = "civitro"


class RedisConfig(BaseModel):
    provider: str = "local"
    host: str = "localhost"
    port: int = 6379
    password: str = ""
    cluster: bool = False

    @property
    def url(self) -> str:
        if self.password:
            return f"redis://:{self.password}@{self.host}:{self.port}/0"
        return f"redis://{self.host}:{self.port}/0"


class OpenSearchConfig(BaseModel):
    provider: str = "local"
    host: str = "localhost"
    port: int = 9200
    scheme: str = "http"
    username: str = "admin"
    password: str = "admin"


class TimescaleDBConfig(BaseModel):
    provider: str = "local"
    host: str = "localhost"
    port: int = 5433
    name: str = "civitro_ts"
    user: str = "civitro"
    password: str = "civitro_dev"

    @property
    def dsn(self) -> str:
        return (
            f"postgresql://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.name}"
        )


class DatabasesConfig(BaseModel):
    postgres: PostgresConfig = Field(default_factory=PostgresConfig)
    mongodb: MongoDBConfig = Field(default_factory=MongoDBConfig)
    redis: RedisConfig = Field(default_factory=RedisConfig)
    opensearch: OpenSearchConfig = Field(default_factory=OpenSearchConfig)
    timescaledb: TimescaleDBConfig = Field(default_factory=TimescaleDBConfig)


# --- storage ---


class StorageConfig(BaseModel):
    provider: str = "minio"
    endpoint: str = "http://localhost:9000"
    region: str = "us-east-1"
    bucket: str = "civitro-media"
    access_key: str = "minioadmin"
    secret_key: str = "minioadmin"
    cdn_url: str = ""


# --- events ---


class EventTopicsConfig(BaseModel):
    user: str = "civitro.user.events"
    issue: str = "civitro.issue.events"
    voice: str = "civitro.voice.events"
    rating: str = "civitro.rating.events"
    promise: str = "civitro.promise.events"
    chi: str = "civitro.chi.events"
    poll: str = "civitro.poll.events"
    message: str = "civitro.message.events"
    moderation: str = "civitro.moderation.events"
    analytics: str = "civitro.analytics.events"
    org: str = "civitro.org.events"
    ad: str = "civitro.ad.events"


class EventsConfig(BaseModel):
    provider: str = "redpanda"
    brokers: list[str] = Field(default_factory=lambda: ["localhost:9092"])
    schema_registry: str = "http://localhost:8081"
    consumer_group_prefix: str = "civitro"
    topics: EventTopicsConfig = Field(default_factory=EventTopicsConfig)


# --- AI ---


class LLMConfig(BaseModel):
    provider: str = "ollama"
    endpoint: str = "http://localhost:11434"
    model: str = "llama3.1:8b"
    device: str = "npu"
    max_tokens: int = 4096
    temperature: float = 0.3


class VisionConfig(BaseModel):
    provider: str = "local"
    endpoint: str = "http://localhost:8501"
    model: str = "vit-b-16-civitro"
    device: str = "gpu"
    confidence_threshold: float = 0.8
    uncertain_threshold: float = 0.6
    max_latency_ms: int = 500


class SentimentAIConfig(BaseModel):
    provider: str = "local"
    endpoint: str = "http://localhost:8502"
    model: str = "multilingual-bert-sentiment"
    device: str = "npu"


class ModerationConfig(BaseModel):
    provider: str = "local"
    text_endpoint: str = "http://localhost:11434"
    text_model: str = "llama-guard3"
    image_endpoint: str = "http://localhost:8503"
    image_model: str = "open-nsfw2"
    device: str = "npu"
    auto_remove_threshold: float = 0.9
    review_threshold: float = 0.7


class LanguageDetectionConfig(BaseModel):
    provider: str = "local"
    model: str = "fasttext-lid"
    device: str = "npu"


class AIConfig(BaseModel):
    llm: LLMConfig = Field(default_factory=LLMConfig)
    vision: VisionConfig = Field(default_factory=VisionConfig)
    sentiment: SentimentAIConfig = Field(default_factory=SentimentAIConfig)
    moderation: ModerationConfig = Field(default_factory=ModerationConfig)
    language_detection: LanguageDetectionConfig = Field(
        default_factory=LanguageDetectionConfig
    )


# --- bhashini ---


class BhashiniASRConfig(BaseModel):
    enabled: bool = True
    model: str = "bhashini-asr-multilingual"
    languages: list[str] = Field(
        default_factory=lambda: ["hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "pa", "en"]
    )


class BhashiniNMTConfig(BaseModel):
    enabled: bool = True
    model: str = "bhashini-nmt-multilingual"
    source_languages: list[str] = Field(
        default_factory=lambda: ["hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "pa", "en"]
    )
    target_languages: list[str] = Field(
        default_factory=lambda: ["hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "pa", "en"]
    )


class BhashiniTTSConfig(BaseModel):
    enabled: bool = True
    model: str = "bhashini-tts-multilingual"
    languages: list[str] = Field(
        default_factory=lambda: ["hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "en"]
    )
    voices: list[str] = Field(default_factory=lambda: ["male", "female"])


class BhashiniOCRConfig(BaseModel):
    enabled: bool = True
    model: str = "bhashini-ocr"
    languages: list[str] = Field(
        default_factory=lambda: ["hi", "ta", "te", "bn", "mr", "en"]
    )


class BhashiniOfflineConfig(BaseModel):
    runtime: str = "openvino"
    device: str = "npu"
    models_dir: str = "./models/bhashini"
    asr: BhashiniASRConfig = Field(default_factory=BhashiniASRConfig)
    nmt: BhashiniNMTConfig = Field(default_factory=BhashiniNMTConfig)
    tts: BhashiniTTSConfig = Field(default_factory=BhashiniTTSConfig)
    ocr: BhashiniOCRConfig = Field(default_factory=BhashiniOCRConfig)


class BhashiniAPIConfig(BaseModel):
    base_url: str = "https://dhruva-api.bhashini.gov.in"
    api_key: str = ""
    user_id: str = ""
    ulca_api_key: str = ""
    pipeline_id: str = ""
    timeout_ms: int = 5000
    retry_count: int = 3


class BhashiniHybridConfig(BaseModel):
    prefer: str = "offline"
    fallback_on_error: bool = True
    fallback_on_unsupported_language: bool = True


class BhashiniConfig(BaseModel):
    mode: str = "offline"
    offline: BhashiniOfflineConfig = Field(default_factory=BhashiniOfflineConfig)
    api: BhashiniAPIConfig = Field(default_factory=BhashiniAPIConfig)
    hybrid: BhashiniHybridConfig = Field(default_factory=BhashiniHybridConfig)


# --- auth ---


class JWTConfig(BaseModel):
    secret: str = "civitro-local-dev-secret-change-in-prod"
    expiry: str = "24h"
    refresh_expiry: str = "720h"
    issuer: str = "civitro"


class OTPConfig(BaseModel):
    provider: str = "console"


class AadhaarConfig(BaseModel):
    provider: str = "mock"


class AuthConfig(BaseModel):
    jwt: JWTConfig = Field(default_factory=JWTConfig)
    otp: OTPConfig = Field(default_factory=OTPConfig)
    aadhaar: AadhaarConfig = Field(default_factory=AadhaarConfig)


# --- notifications ---


class PushConfig(BaseModel):
    provider: str = "console"


class EmailConfig(BaseModel):
    provider: str = "console"


class SMSConfig(BaseModel):
    provider: str = "console"


class NotificationsConfig(BaseModel):
    push: PushConfig = Field(default_factory=PushConfig)
    email: EmailConfig = Field(default_factory=EmailConfig)
    sms: SMSConfig = Field(default_factory=SMSConfig)


# --- payments ---


class PaymentsConfig(BaseModel):
    provider: str = "mock"


# --- geo ---


class GeocodingConfig(BaseModel):
    provider: str = "mock"


class BoundariesConfig(BaseModel):
    source: str = "local_shapefile"
    shapefile_dir: str = "./data/boundaries"


class GeoConfig(BaseModel):
    geocoding: GeocodingConfig = Field(default_factory=GeocodingConfig)
    boundaries: BoundariesConfig = Field(default_factory=BoundariesConfig)


# --- monitoring ---


class MetricsConfig(BaseModel):
    provider: str = "prometheus"
    port: int = 9090


class TracingConfig(BaseModel):
    provider: str = "jaeger"
    endpoint: str = "http://localhost:14268"


class LoggingConfig(BaseModel):
    level: str = "debug"
    format: str = "text"
    output: str = "stdout"


class MonitoringConfig(BaseModel):
    metrics: MetricsConfig = Field(default_factory=MetricsConfig)
    tracing: TracingConfig = Field(default_factory=TracingConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)


# --- services ---


class ServiceEndpoint(BaseModel):
    host: str = "localhost"
    grpc_port: int = 0
    http_port: int = 0


class ServicesConfig(BaseModel):
    protocol: str = "grpc"
    discovery: str = "static"
    endpoints: dict[str, ServiceEndpoint] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Root config
# ---------------------------------------------------------------------------


class CivitroConfig(BaseModel):
    app: AppConfig = Field(default_factory=AppConfig)
    databases: DatabasesConfig = Field(default_factory=DatabasesConfig)
    storage: StorageConfig = Field(default_factory=StorageConfig)
    events: EventsConfig = Field(default_factory=EventsConfig)
    ai: AIConfig = Field(default_factory=AIConfig)
    bhashini: BhashiniConfig = Field(default_factory=BhashiniConfig)
    auth: AuthConfig = Field(default_factory=AuthConfig)
    notifications: NotificationsConfig = Field(default_factory=NotificationsConfig)
    payments: PaymentsConfig = Field(default_factory=PaymentsConfig)
    geo: GeoConfig = Field(default_factory=GeoConfig)
    monitoring: MonitoringConfig = Field(default_factory=MonitoringConfig)
    services: ServicesConfig = Field(default_factory=ServicesConfig)


# ---------------------------------------------------------------------------
# Env-var resolution  ${VAR:-default}
# ---------------------------------------------------------------------------

_ENV_PATTERN = re.compile(r"\$\{(\w+)(?::-(.*?))?\}")


def _resolve_env_vars(value: Any) -> Any:
    """Recursively resolve ${ENV_VAR:-default} placeholders in strings."""
    if isinstance(value, str):
        def _replace(m: re.Match) -> str:
            env_name = m.group(1)
            default = m.group(2) if m.group(2) is not None else ""
            return os.environ.get(env_name, default)

        return _ENV_PATTERN.sub(_replace, value)
    if isinstance(value, dict):
        return {k: _resolve_env_vars(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_resolve_env_vars(item) for item in value]
    return value


# ---------------------------------------------------------------------------
# Loader (singleton)
# ---------------------------------------------------------------------------

_CONFIG: CivitroConfig | None = None


def _find_project_root() -> Path:
    """Walk up from current file to find the project root (where config/ exists)."""
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "config").is_dir():
            return parent
    return Path.cwd()


def load_config(
    *,
    config_path: str | Path | None = None,
    environment: str | None = None,
) -> CivitroConfig:
    """Load configuration from YAML, resolve env vars, validate via Pydantic.

    The function caches the result as a module-level singleton.  Pass
    ``config_path`` explicitly to override auto-detection.
    """
    global _CONFIG
    if _CONFIG is not None:
        return _CONFIG

    root = _find_project_root()
    base_path = Path(config_path) if config_path else root / "config" / "default.yaml"

    raw: dict[str, Any] = {}
    if base_path.exists():
        with open(base_path, "r", encoding="utf-8") as fh:
            raw = yaml.safe_load(fh) or {}

    # Overlay environment-specific file (e.g. config/production.yaml)
    env = environment or os.environ.get("CIVITRO_ENV") or os.environ.get("APP_ENV") or raw.get("app", {}).get("environment", "local")
    env_path = base_path.parent / f"{env}.yaml"
    if env_path.exists() and env_path != base_path:
        with open(env_path, "r", encoding="utf-8") as fh:
            overlay = yaml.safe_load(fh) or {}
        raw = _deep_merge(raw, overlay)

    raw = _resolve_env_vars(raw)
    _CONFIG = CivitroConfig.model_validate(raw)
    return _CONFIG


def get_config() -> CivitroConfig:
    """Return the cached config, loading it if necessary."""
    if _CONFIG is None:
        return load_config()
    return _CONFIG


def reset_config() -> None:
    """Reset the singleton (useful for testing)."""
    global _CONFIG
    _CONFIG = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _deep_merge(base: dict, overlay: dict) -> dict:
    """Recursively merge *overlay* into *base*, returning a new dict."""
    merged = base.copy()
    for key, value in overlay.items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged
