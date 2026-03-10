"""API routes for the Advertising service."""

from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.models import (
    Campaign,
    CampaignStats,
    CreateCampaignRequest,
    ServedAd,
    UpdateCampaignRequest,
)
from app import service

router = APIRouter(tags=["advertising"])


@router.post("/campaigns", response_model=Campaign, status_code=201)
async def create_campaign(req: CreateCampaignRequest) -> Campaign:
    """Create a new advertising campaign."""
    return await service.create_campaign(req)


@router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str) -> Campaign:
    """Get a campaign by ID."""
    return await service.get_campaign(campaign_id)


@router.put("/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(
    campaign_id: str, req: UpdateCampaignRequest
) -> Campaign:
    """Update campaign details."""
    return await service.update_campaign(campaign_id, req)


@router.get("/campaigns/{campaign_id}/stats", response_model=CampaignStats)
async def get_stats(campaign_id: str) -> CampaignStats:
    """Get campaign performance statistics."""
    return await service.get_stats(campaign_id)


@router.post("/campaigns/{campaign_id}/activate", response_model=Campaign)
async def activate_campaign(campaign_id: str) -> Campaign:
    """Activate a campaign (must be in draft or paused status)."""
    return await service.activate_campaign(campaign_id)


@router.post("/campaigns/{campaign_id}/pause", response_model=Campaign)
async def pause_campaign(campaign_id: str) -> Campaign:
    """Pause an active campaign."""
    return await service.pause_campaign(campaign_id)


@router.get("/ads/serve", response_model=None)
async def serve_ad(
    user_id: str = Query(...),
    boundary_id: str = Query(...),
) -> ServedAd | JSONResponse:
    """Serve an ad to a user in a specific boundary.

    Political ads are automatically labeled per transparency requirements.
    """
    result = await service.serve_ad(user_id, boundary_id)
    if result is None:
        return JSONResponse(status_code=204, content=None)
    return result
