"""API routes for the CHI service."""

from __future__ import annotations

from fastapi import APIRouter

from app.models import (
    CHIDimension,
    CHIHistory,
    CHIRankingResponse,
    CHIScore,
    ComputeResponse,
)
from app import service

router = APIRouter(prefix="/api/v1/chi", tags=["chi"])


@router.get("/{boundary_id}", response_model=CHIScore)
async def get_chi(boundary_id: str) -> CHIScore:
    """Get the latest CHI score for a boundary."""
    return await service.get_chi(boundary_id)


@router.get("/{boundary_id}/history", response_model=CHIHistory)
async def get_history(boundary_id: str) -> CHIHistory:
    """Get historical CHI scores for a boundary."""
    return await service.get_history(boundary_id)


@router.get("/rankings/{level}", response_model=CHIRankingResponse)
async def get_rankings(level: str) -> CHIRankingResponse:
    """Get CHI rankings for a given administrative level."""
    return await service.get_rankings(level)


@router.get("/{boundary_id}/dimensions", response_model=list[CHIDimension])
async def get_dimensions(boundary_id: str) -> list[CHIDimension]:
    """Get dimension breakdown for a boundary's CHI score."""
    return await service.get_dimensions(boundary_id)


@router.post("/compute/{boundary_id}", response_model=ComputeResponse)
async def compute(boundary_id: str) -> ComputeResponse:
    """Trigger a manual CHI computation for a boundary."""
    return await service.compute_chi(boundary_id)
