"""API routes for the Datamine service."""

from __future__ import annotations

from fastapi import APIRouter

from app.models import (
    AnalyticsReport,
    CreateReportRequest,
    DemographicSnapshot,
    HeatmapData,
    IssueTrendsData,
)
from app import service

router = APIRouter(prefix="/datamine", tags=["datamine"])


@router.post("/reports", response_model=AnalyticsReport, status_code=202)
async def create_report(req: CreateReportRequest) -> AnalyticsReport:
    """Create an analytics report (processed in background via Celery)."""
    return await service.create_report(req)


@router.get("/reports/{report_id}", response_model=AnalyticsReport)
async def get_report(report_id: str) -> AnalyticsReport:
    """Get the status / result of an analytics report."""
    return await service.get_report(report_id)


@router.get("/heatmap/{boundary_id}", response_model=HeatmapData)
async def get_heatmap(boundary_id: str) -> HeatmapData:
    """Get heatmap data for a boundary (issue locations with intensity)."""
    return await service.get_heatmap(boundary_id)


@router.get("/demographics/{boundary_id}", response_model=DemographicSnapshot)
async def get_demographics(boundary_id: str) -> DemographicSnapshot:
    """Get demographic snapshot for a boundary."""
    return await service.get_demographics(boundary_id)


@router.get("/issue-trends/{boundary_id}", response_model=IssueTrendsData)
async def get_issue_trends(boundary_id: str) -> IssueTrendsData:
    """Get issue trend data for a boundary."""
    return await service.get_issue_trends(boundary_id)
