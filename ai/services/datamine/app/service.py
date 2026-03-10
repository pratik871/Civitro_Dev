"""Business logic for the Datamine service — analytics, heatmaps, demographics."""

from __future__ import annotations

from datetime import datetime, timezone

from civitro_common.config import get_config
from civitro_common.errors import NotFoundError, PaymentRequiredError
from civitro_common.logger import get_logger
from civitro_common.storage import upload_file, generate_presigned_url

from app.models import (
    ActivityMetrics,
    AnalyticsReport,
    CreateReportRequest,
    DemographicSnapshot,
    HeatmapData,
    HeatmapPoint,
    IssueTrendPoint,
    IssueTrendsData,
    ReportStatus,
    VerificationBreakdown,
)
from app.repository import (
    create_report as repo_create,
    get_demographics as repo_demographics,
    get_heatmap_points,
    get_issue_trends as repo_trends,
    get_report as repo_get,
    update_report_status,
)

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Report lifecycle
# ---------------------------------------------------------------------------


async def create_report(req: CreateReportRequest) -> AnalyticsReport:
    """Create a report job and dispatch to Celery for background processing."""
    report_id = await repo_create(
        report_type=req.type.value,
        boundary_id=req.boundary_id,
        parameters=req.parameters,
    )

    # Dispatch to Celery (import here to avoid circular / startup issues)
    try:
        from app.tasks import process_report

        process_report.delay(report_id)
        log.info("report queued", report_id=report_id, type=req.type.value)
    except Exception:
        log.warning("celery dispatch failed, will process inline", report_id=report_id)
        # Fallback: mark as failed so it can be retried
        await update_report_status(report_id, ReportStatus.FAILED.value, error_message="Worker unavailable")

    row = await repo_get(report_id)
    return AnalyticsReport(**row)  # type: ignore[arg-type]


async def get_report(report_id: str) -> AnalyticsReport:
    row = await repo_get(report_id)
    if not row:
        raise NotFoundError("Report", report_id)
    return AnalyticsReport(**row)


# ---------------------------------------------------------------------------
# Heatmap
# ---------------------------------------------------------------------------


async def get_heatmap(boundary_id: str) -> HeatmapData:
    rows = await get_heatmap_points(boundary_id)
    points = [
        HeatmapPoint(
            lat=r["lat"],
            lng=r["lng"],
            intensity=min(max(r["intensity"], 0), 1),
            category=r.get("category"),
        )
        for r in rows
    ]
    return HeatmapData(
        boundary_id=boundary_id,
        points=points,
        total_points=len(points),
        generated_at=datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# Demographics
# ---------------------------------------------------------------------------


async def get_demographics(boundary_id: str) -> DemographicSnapshot:
    data = await repo_demographics(boundary_id)
    vb = data.get("verification_breakdown", {})
    am = data.get("activity_metrics", {})

    return DemographicSnapshot(
        boundary_id=boundary_id,
        total_users=data.get("total_users", 0),
        verification_breakdown=VerificationBreakdown(
            aadhaar_verified=vb.get("aadhaar_verified", 0),
            phone_verified=vb.get("phone_verified", 0),
            unverified=vb.get("unverified", 0),
        ),
        activity_metrics=ActivityMetrics(
            voices_last_30d=am.get("voices_last_30d", 0),
            issues_last_30d=am.get("issues_last_30d", 0),
            polls_participated_last_30d=am.get("polls_participated_last_30d", 0),
        ),
        generated_at=datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# Issue trends
# ---------------------------------------------------------------------------


async def get_issue_trends(boundary_id: str) -> IssueTrendsData:
    rows = await repo_trends(boundary_id)
    trends = [
        IssueTrendPoint(
            date=r["date"],
            category=r["category"],
            count=r["count"],
            resolution_rate=round(r.get("resolution_rate", 0), 4),
        )
        for r in rows
    ]
    return IssueTrendsData(
        boundary_id=boundary_id,
        trends=trends,
        generated_at=datetime.now(timezone.utc),
    )
