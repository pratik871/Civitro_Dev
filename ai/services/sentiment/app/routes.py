"""API routes for the Sentiment service."""

from __future__ import annotations

from fastapi import APIRouter

from app.models import (
    AlertsResponse,
    BatchSentimentRequest,
    BatchSentimentResult,
    SentimentRequest,
    SentimentResult,
    TrendResponse,
    WardMoodResponse,
)
from app import service

router = APIRouter(tags=["sentiment"])


@router.post("/sentiment/analyze", response_model=SentimentResult)
async def analyze(req: SentimentRequest) -> SentimentResult:
    """Analyze sentiment of a single text."""
    return await service.analyze_sentiment(req)


@router.post("/sentiment/batch", response_model=BatchSentimentResult)
async def batch(req: BatchSentimentRequest) -> BatchSentimentResult:
    """Analyze sentiment for a batch of texts."""
    results = await service.batch_analyze(req.items)
    return BatchSentimentResult(results=results)


@router.get("/sentiment/trends/{boundary_id}", response_model=TrendResponse)
async def trends(boundary_id: str) -> TrendResponse:
    """Get sentiment trends for a boundary."""
    return await service.get_trends(boundary_id)


@router.get("/sentiment/ward-mood/{ward_id}", response_model=WardMoodResponse)
async def ward_mood(ward_id: str) -> WardMoodResponse:
    """Get the citizen-facing Ward Mood gauge data for a ward."""
    return await service.get_ward_mood(ward_id)


@router.get("/sentiment/alerts", response_model=AlertsResponse)
async def alerts() -> AlertsResponse:
    """Get current sentiment alerts (>20% negative shift in 24h)."""
    result = await service.detect_alerts()
    return AlertsResponse(alerts=result)
