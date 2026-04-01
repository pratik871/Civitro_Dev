"""API routes for the Fraud Detection service."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    DashboardStats,
    FraudSignal,
    ResolveRequest,
    SignalListResponse,
)
from app import service
from app.repository import (
    get_dashboard_stats,
    get_signal,
    list_signals,
    resolve_signal,
)

router = APIRouter(prefix="/api/v1", tags=["fraud"])


@router.post("/fraud/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze an entity for fraud signals."""
    return await service.analyze_entity(
        entity_type=req.entity_type.value,
        entity_id=req.entity_id,
        text=req.text,
        user_id=req.user_id,
    )


@router.get("/fraud/signals", response_model=SignalListResponse)
async def get_signals(
    resolved: Optional[bool] = Query(None),
    signal_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> SignalListResponse:
    """List fraud signals with optional filters."""
    rows, total = await list_signals(
        resolved=resolved,
        signal_type=signal_type,
        severity=severity,
        limit=limit,
        offset=offset,
    )

    signals = [service._row_to_signal(r) for r in rows]
    return SignalListResponse(signals=signals, total=total)


@router.put("/fraud/signals/{signal_id}/resolve", response_model=FraudSignal)
async def resolve(signal_id: str, req: ResolveRequest) -> FraudSignal:
    """Mark a fraud signal as resolved."""
    row = await resolve_signal(signal_id, req.resolved_by)
    if not row:
        raise HTTPException(status_code=404, detail="Signal not found")
    return service._row_to_signal(row)


@router.get("/fraud/dashboard", response_model=DashboardStats)
async def dashboard() -> DashboardStats:
    """Get summary statistics for the fraud detection dashboard."""
    stats = await get_dashboard_stats()

    recent_signals = [service._row_to_signal(r) for r in stats["recent_signals"]]

    return DashboardStats(
        total_signals=stats["total_signals"],
        unresolved_count=stats["unresolved_count"],
        by_type=stats["by_type"],
        by_severity=stats["by_severity"],
        recent_signals=recent_signals,
    )
