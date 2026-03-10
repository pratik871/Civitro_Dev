"""Pydantic models for the Datamine service."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class ReportType(str, Enum):
    HEATMAP = "heatmap"
    DEMOGRAPHIC = "demographic"
    VOICE_TRAITS = "voice_traits"
    ISSUE_TRENDS = "issue_trends"
    LEADER_COMPARISON = "leader_comparison"


class ReportStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalyticsReport(BaseModel):
    id: str
    type: ReportType
    boundary_id: Optional[str] = None
    parameters: dict[str, Any] = Field(default_factory=dict)
    status: ReportStatus = ReportStatus.QUEUED
    result_url: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class CreateReportRequest(BaseModel):
    type: ReportType
    boundary_id: Optional[str] = None
    parameters: dict[str, Any] = Field(default_factory=dict)


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    intensity: float = Field(ge=0.0, le=1.0)
    category: Optional[str] = None


class HeatmapData(BaseModel):
    boundary_id: str
    points: list[HeatmapPoint]
    total_points: int
    generated_at: datetime


class ActivityMetrics(BaseModel):
    voices_last_30d: int = 0
    issues_last_30d: int = 0
    polls_participated_last_30d: int = 0
    avg_daily_active_users: int = 0


class VerificationBreakdown(BaseModel):
    aadhaar_verified: int = 0
    phone_verified: int = 0
    unverified: int = 0


class DemographicSnapshot(BaseModel):
    boundary_id: str
    total_users: int
    verification_breakdown: VerificationBreakdown
    activity_metrics: ActivityMetrics
    generated_at: datetime


class IssueTrendPoint(BaseModel):
    date: str
    category: str
    count: int
    resolution_rate: float = 0.0


class IssueTrendsData(BaseModel):
    boundary_id: str
    trends: list[IssueTrendPoint]
    period_days: int = 30
    generated_at: datetime
