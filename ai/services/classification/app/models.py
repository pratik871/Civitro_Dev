"""Pydantic models for the Classification service."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Category(str, Enum):
    POTHOLE = "pothole"
    GARBAGE = "garbage"
    STREETLIGHT = "streetlight"
    WATER_LEAK = "water_leak"
    ROAD_DAMAGE = "road_damage"
    ILLEGAL_CONSTRUCTION = "illegal_construction"
    DRAINAGE = "drainage"
    TRAFFIC = "traffic"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    SAFETY = "safety"
    OTHER = "other"


# Map categories to default departments
CATEGORY_DEPARTMENTS: dict[Category, str] = {
    Category.POTHOLE: "public_works",
    Category.GARBAGE: "sanitation",
    Category.STREETLIGHT: "electrical",
    Category.WATER_LEAK: "water_supply",
    Category.ROAD_DAMAGE: "public_works",
    Category.ILLEGAL_CONSTRUCTION: "urban_planning",
    Category.DRAINAGE: "drainage_dept",
    Category.TRAFFIC: "traffic_police",
    Category.HEALTHCARE: "health_dept",
    Category.EDUCATION: "education_dept",
    Category.SAFETY: "police",
    Category.OTHER: "general_admin",
}


class ClassificationRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    text: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None


class ClassificationResult(BaseModel):
    category: Category
    confidence: float = Field(ge=0.0, le=1.0)
    severity: Severity
    suggested_department: str
    duplicate_issue_id: Optional[str] = None
    confidence_tier: str = Field(
        description="auto (>0.8), uncertain (0.6-0.8), or manual (<0.6)"
    )


class CategoryInfo(BaseModel):
    name: str
    label: str
    department: str


class CategoriesResponse(BaseModel):
    categories: list[CategoryInfo]
