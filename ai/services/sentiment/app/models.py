"""Pydantic models for the Sentiment service."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Sentiment(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


class Emotion(str, Enum):
    ANGER = "anger"
    FRUSTRATION = "frustration"
    HOPE = "hope"
    SATISFACTION = "satisfaction"
    FEAR = "fear"


class SentimentRequest(BaseModel):
    text: str
    language: str = "en"


class SentimentResult(BaseModel):
    sentiment: Sentiment
    confidence: float = Field(ge=0.0, le=1.0)
    emotions: list[Emotion]
    urgency_score: float = Field(ge=0.0, le=1.0)


class BatchSentimentRequest(BaseModel):
    items: list[SentimentRequest]


class BatchSentimentResult(BaseModel):
    results: list[SentimentResult]


class SentimentDistribution(BaseModel):
    positive: float = 0.0
    negative: float = 0.0
    neutral: float = 0.0


class TrendAnalysis(BaseModel):
    topic: str
    region: str
    sentiment_distribution: SentimentDistribution
    intensity: float = Field(ge=0.0, le=1.0)
    report_count: int
    change_pct: float


class TrendResponse(BaseModel):
    boundary_id: str
    trends: list[TrendAnalysis]
    computed_at: datetime


class SentimentAlert(BaseModel):
    id: str
    boundary_id: str
    topic: str
    alert_type: str
    negative_shift_pct: float
    window_hours: int = 24
    triggered_at: datetime
    acknowledged: bool = False


class AlertsResponse(BaseModel):
    alerts: list[SentimentAlert]
