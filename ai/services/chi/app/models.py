"""Pydantic models for the CHI service."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class DimensionLabel(str, Enum):
    INFRASTRUCTURE = "infrastructure"
    SANITATION = "sanitation"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    PUBLIC_SAFETY = "public_safety"
    WATER_SUPPLY = "water_supply"
    TRANSPORT = "transport"
    AIR_QUALITY = "air_quality"


class Trend(str, Enum):
    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"


class RankingLevel(str, Enum):
    WARD = "ward"
    CONSTITUENCY = "constituency"
    DISTRICT = "district"
    STATE = "state"
    NATIONAL = "national"


class CHIDimension(BaseModel):
    label: DimensionLabel
    score: float = Field(ge=0.0, le=100.0)
    weight: float = Field(ge=0.0, le=1.0)
    signals_count: int = 0
    trend: Trend = Trend.STABLE


class CHIScore(BaseModel):
    boundary_id: str
    overall_score: float = Field(ge=0.0, le=100.0)
    rank: int
    rank_total: int
    dimensions: list[CHIDimension]
    computed_at: datetime


class CHITimePoint(BaseModel):
    score: float = Field(ge=0.0, le=100.0)
    computed_at: datetime


class CHIHistory(BaseModel):
    boundary_id: str
    scores: list[CHITimePoint]


class CHIRankingEntry(BaseModel):
    boundary_id: str
    boundary_name: str
    overall_score: float = Field(ge=0.0, le=100.0)
    rank: int
    change: int = 0  # rank change vs previous period


class CHIRankingResponse(BaseModel):
    level: RankingLevel
    entries: list[CHIRankingEntry]
    total: int
    computed_at: datetime


class CHIAlert(BaseModel):
    boundary_id: str
    dimension: DimensionLabel
    drop_points: float
    period_days: int = 30
    triggered_at: datetime


class ComputeResponse(BaseModel):
    boundary_id: str
    overall_score: float
    dimensions: list[CHIDimension]
    computed_at: datetime
