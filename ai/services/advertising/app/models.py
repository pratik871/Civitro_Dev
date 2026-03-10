"""Pydantic models for the Advertising service."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class CampaignType(str, Enum):
    POLITICAL = "political"
    CIVIC = "civic"
    COMMERCIAL = "commercial"


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class Creative(BaseModel):
    media_url: str
    text: str
    cta: str = ""


class Targeting(BaseModel):
    boundaries: list[str] = Field(default_factory=list)
    demographics: dict[str, Any] = Field(default_factory=dict)
    interests: list[str] = Field(default_factory=list)


class Campaign(BaseModel):
    id: str
    advertiser_id: str
    name: str
    type: CampaignType
    status: CampaignStatus = CampaignStatus.DRAFT
    budget: float = Field(ge=0.0)
    spent: float = Field(ge=0.0, default=0.0)
    targeting: Targeting = Field(default_factory=Targeting)
    creatives: list[Creative] = Field(default_factory=list)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime
    is_political: bool = False


class CreateCampaignRequest(BaseModel):
    advertiser_id: str
    name: str
    type: CampaignType
    budget: float = Field(ge=0.0)
    targeting: Targeting = Field(default_factory=Targeting)
    creatives: list[Creative] = Field(default_factory=list)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class UpdateCampaignRequest(BaseModel):
    name: Optional[str] = None
    budget: Optional[float] = Field(ge=0.0, default=None)
    targeting: Optional[Targeting] = None
    creatives: Optional[list[Creative]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class AdImpression(BaseModel):
    campaign_id: str
    user_id: str
    timestamp: datetime
    clicked: bool = False


class CampaignStats(BaseModel):
    campaign_id: str
    impressions: int = 0
    clicks: int = 0
    ctr: float = 0.0
    spent: float = 0.0
    reach: int = 0


class ServeAdRequest(BaseModel):
    user_id: str
    boundary_id: str


class ServedAd(BaseModel):
    campaign_id: str
    creative: Creative
    is_political: bool = False
    impression_id: str
