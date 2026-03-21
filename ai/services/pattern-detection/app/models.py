"""Pydantic models for the Pattern Detection service (Service 23)."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ClusterType(str, Enum):
    CATEGORY = "category"
    GEOGRAPHIC = "geographic"
    TEMPORAL = "temporal"
    SEMANTIC = "semantic"


class PatternConfidence(str, Enum):
    EMERGING = "emerging"
    CONFIRMED = "confirmed"
    CRITICAL = "critical"
    SYSTEMIC = "systemic"


class PatternStatus(str, Enum):
    ACTIVE = "active"
    ACTION_CREATED = "action_created"
    RESOLVED = "resolved"
    EXPIRED = "expired"


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class AnalyzeRequest(BaseModel):
    ward_id: str


class ProcessIssueRequest(BaseModel):
    issue_id: str
    ward_id: str
    category: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    reported_at: Optional[datetime] = None


class PatternReportLink(BaseModel):
    id: str
    pattern_id: str
    issue_id: str
    similarity_score: float = Field(ge=0.0, le=1.0)
    created_at: datetime


class EvidencePackage(BaseModel):
    pattern_id: str
    category: str
    ward: str
    report_count: int
    unique_locations: int
    date_range: str
    days_unresolved: int
    resolution_count: int = 0
    heat_map_geojson: dict[str, Any] = Field(default_factory=dict)
    timeline_data: list[dict[str, Any]] = Field(default_factory=list)
    representative_photos: list[str] = Field(default_factory=list)
    economic_impact: dict[str, Any] = Field(default_factory=dict)
    comparison: dict[str, Any] = Field(default_factory=dict)
    ai_summary: str = ""


class DetectedPattern(BaseModel):
    id: str
    ward_id: str
    category: str
    cluster_type: ClusterType
    confidence: PatternConfidence
    report_count: int
    unique_locations: int = 0
    centroid_lat: Optional[float] = None
    centroid_lng: Optional[float] = None
    radius_meters: Optional[int] = None
    first_report_at: Optional[datetime] = None
    last_report_at: Optional[datetime] = None
    days_unresolved: int = 0
    economic_impact: Optional[float] = None
    evidence_package_json: Optional[dict[str, Any]] = None
    community_action_id: Optional[str] = None
    status: PatternStatus = PatternStatus.ACTIVE
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PatternReport(BaseModel):
    patterns: list[DetectedPattern]


class PatternMatchResult(BaseModel):
    matched: bool
    pattern_id: Optional[str] = None
    cluster_type: Optional[ClusterType] = None
    confidence: Optional[PatternConfidence] = None
    report_count: Optional[int] = None
