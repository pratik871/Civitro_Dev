"""Pydantic models for the Promises service."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class PromiseStatus(str, Enum):
    DETECTED = "detected"
    ON_TRACK = "on_track"
    DELAYED = "delayed"
    FULFILLED = "fulfilled"
    BROKEN = "broken"


class SourceType(str, Enum):
    SPEECH = "speech"
    INTERVIEW = "interview"
    MANIFESTO = "manifesto"
    SOCIAL_MEDIA = "social_media"
    NEWS = "news"


class Promise(BaseModel):
    id: str
    leader_id: str
    promise_text: str
    category: str
    location: Optional[str] = None
    timeline: Optional[str] = None
    status: PromiseStatus = PromiseStatus.DETECTED
    progress_pct: float = Field(ge=0.0, le=100.0, default=0.0)
    source: str = ""
    source_url: Optional[str] = None
    detected_at: datetime
    verified: bool = False
    verified_by: Optional[str] = None


class PromiseExtractionRequest(BaseModel):
    text: str
    source_type: SourceType
    leader_id: Optional[str] = None
    source_url: Optional[str] = None


class ExtractedPromise(BaseModel):
    promise: str
    category: str
    timeline: Optional[str] = None
    location: Optional[str] = None


class ExtractionResult(BaseModel):
    promises: list[ExtractedPromise]
    source_type: SourceType
    raw_text_length: int


class PromiseStatusUpdate(BaseModel):
    status: PromiseStatus
    progress_pct: Optional[float] = Field(ge=0.0, le=100.0, default=None)
    note: Optional[str] = None


class PromiseVerification(BaseModel):
    verified: bool
    verified_by: str
    note: Optional[str] = None


class PromiseListResponse(BaseModel):
    promises: list[Promise]
    total: int
