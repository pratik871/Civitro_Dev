"""Pydantic models for the Fraud Detection service (Service 24)."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class EntityType(str, Enum):
    USER = "user"
    ISSUE = "issue"
    VOICE = "voice"
    UPVOTE = "upvote"


class SignalType(str, Enum):
    DUPLICATE_CONTENT = "duplicate_content"
    VELOCITY_SPIKE = "velocity_spike"
    DEVICE_CLUSTER = "device_cluster"
    BRIGADING = "brigading"
    BOT_BEHAVIOR = "bot_behavior"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class AnalyzeRequest(BaseModel):
    entity_type: EntityType
    entity_id: str
    text: Optional[str] = None
    user_id: Optional[str] = None


class FraudSignal(BaseModel):
    id: str
    entity_type: EntityType
    entity_id: str
    signal_type: SignalType
    severity: Severity
    confidence: float = Field(ge=0.0, le=1.0)
    details: Optional[dict[str, Any]] = None
    resolved: bool = False
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class AnalyzeResponse(BaseModel):
    entity_type: EntityType
    entity_id: str
    signals: list[FraudSignal]
    risk_score: float = Field(ge=0.0, le=1.0, default=0.0)


class SignalListResponse(BaseModel):
    signals: list[FraudSignal]
    total: int


class ResolveRequest(BaseModel):
    resolved_by: str


class DashboardStats(BaseModel):
    total_signals: int
    unresolved_count: int
    by_type: dict[str, int]
    by_severity: dict[str, int]
    recent_signals: list[FraudSignal]
