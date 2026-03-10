"""Business logic for the Advertising service — campaign management, ad serving."""

from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Any

from civitro_common.errors import BadRequestError, NotFoundError
from civitro_common.events import publish, get_topic
from civitro_common.logger import get_logger

from app.models import (
    Campaign,
    CampaignStats,
    CampaignStatus,
    CampaignType,
    CreateCampaignRequest,
    Creative,
    ServedAd,
    Targeting,
    UpdateCampaignRequest,
)
from app.repository import (
    check_user_frequency,
    create_campaign as repo_create,
    find_eligible_campaigns,
    get_campaign as repo_get,
    get_campaign_stats as repo_stats,
    increment_user_frequency,
    record_impression,
    set_campaign_status,
    update_campaign as repo_update,
)

log = get_logger(__name__)

# Political ad retention period (7 years)
_POLITICAL_ARCHIVE_YEARS = 7


def _row_to_campaign(row: dict[str, Any]) -> Campaign:
    targeting = row.get("targeting", {})
    if isinstance(targeting, dict):
        targeting = Targeting(**targeting)
    creatives = row.get("creatives", [])
    if creatives and isinstance(creatives[0], dict):
        creatives = [Creative(**c) for c in creatives]

    return Campaign(
        id=row["id"],
        advertiser_id=row["advertiser_id"],
        name=row["name"],
        type=row["type"],
        status=row.get("status", "draft"),
        budget=row["budget"],
        spent=row.get("spent", 0),
        targeting=targeting,
        creatives=creatives,
        start_date=row.get("start_date"),
        end_date=row.get("end_date"),
        created_at=row["created_at"],
        is_political=row["type"] == CampaignType.POLITICAL.value,
    )


# ---------------------------------------------------------------------------
# Campaign CRUD
# ---------------------------------------------------------------------------


async def create_campaign(req: CreateCampaignRequest) -> Campaign:
    data = req.model_dump()
    data["targeting"] = req.targeting.model_dump()
    data["creatives"] = [c.model_dump() for c in req.creatives]
    data["type"] = req.type.value

    campaign_id = await repo_create(data)
    log.info("campaign created", campaign_id=campaign_id, type=req.type.value)

    await publish(
        get_topic("ad"),
        {"event": "campaign.created", "campaign_id": campaign_id, "type": req.type.value},
        key=campaign_id,
    )

    row = await repo_get(campaign_id)
    return _row_to_campaign(row)  # type: ignore[arg-type]


async def get_campaign(campaign_id: str) -> Campaign:
    row = await repo_get(campaign_id)
    if not row:
        raise NotFoundError("Campaign", campaign_id)
    return _row_to_campaign(row)


async def update_campaign(campaign_id: str, req: UpdateCampaignRequest) -> Campaign:
    existing = await repo_get(campaign_id)
    if not existing:
        raise NotFoundError("Campaign", campaign_id)

    updates: dict[str, Any] = {}
    if req.name is not None:
        updates["name"] = req.name
    if req.budget is not None:
        updates["budget"] = req.budget
    if req.targeting is not None:
        updates["targeting"] = req.targeting.model_dump()
    if req.creatives is not None:
        updates["creatives"] = [c.model_dump() for c in req.creatives]
    if req.start_date is not None:
        updates["start_date"] = req.start_date
    if req.end_date is not None:
        updates["end_date"] = req.end_date

    if updates:
        await repo_update(campaign_id, updates)

    return await get_campaign(campaign_id)


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


async def activate_campaign(campaign_id: str) -> Campaign:
    campaign = await get_campaign(campaign_id)
    if campaign.status not in (CampaignStatus.DRAFT, CampaignStatus.PAUSED):
        raise BadRequestError(f"Cannot activate campaign in status '{campaign.status.value}'")
    if not campaign.creatives:
        raise BadRequestError("Campaign must have at least one creative")

    await set_campaign_status(campaign_id, CampaignStatus.ACTIVE.value)
    log.info("campaign activated", campaign_id=campaign_id)

    await publish(
        get_topic("ad"),
        {"event": "campaign.activated", "campaign_id": campaign_id},
        key=campaign_id,
    )
    return await get_campaign(campaign_id)


async def pause_campaign(campaign_id: str) -> Campaign:
    campaign = await get_campaign(campaign_id)
    if campaign.status != CampaignStatus.ACTIVE:
        raise BadRequestError("Can only pause active campaigns")

    await set_campaign_status(campaign_id, CampaignStatus.PAUSED.value)
    log.info("campaign paused", campaign_id=campaign_id)

    await publish(
        get_topic("ad"),
        {"event": "campaign.paused", "campaign_id": campaign_id},
        key=campaign_id,
    )
    return await get_campaign(campaign_id)


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------


async def get_stats(campaign_id: str) -> CampaignStats:
    # Verify campaign exists
    await get_campaign(campaign_id)
    data = await repo_stats(campaign_id)
    return CampaignStats(**data)


# ---------------------------------------------------------------------------
# Ad serving
# ---------------------------------------------------------------------------


async def serve_ad(user_id: str, boundary_id: str) -> ServedAd | None:
    """Select and serve an ad to a user based on targeting.

    Uses a simple weighted random selection from eligible campaigns,
    respecting frequency caps.
    """
    eligible = await find_eligible_campaigns(boundary_id, user_id)
    if not eligible:
        return None

    # Filter by frequency cap
    servable: list[dict[str, Any]] = []
    for camp in eligible:
        can_serve = await check_user_frequency(camp["id"], user_id)
        if can_serve:
            servable.append(camp)

    if not servable:
        return None

    # Weighted random: campaigns with more remaining budget get more weight
    weights = [max(c["budget"] - c["spent"], 0.01) for c in servable]
    chosen = random.choices(servable, weights=weights, k=1)[0]

    # Pick a random creative
    creatives = chosen.get("creatives", [])
    if not creatives:
        return None

    creative_data = random.choice(creatives)
    if isinstance(creative_data, dict):
        creative = Creative(**creative_data)
    else:
        creative = creative_data

    # Record impression
    impression_id = await record_impression(chosen["id"], user_id)
    await increment_user_frequency(chosen["id"], user_id)

    is_political = chosen["type"] == CampaignType.POLITICAL.value

    log.info(
        "ad served",
        campaign_id=chosen["id"],
        user_id=user_id,
        boundary_id=boundary_id,
        is_political=is_political,
    )

    return ServedAd(
        campaign_id=chosen["id"],
        creative=creative,
        is_political=is_political,
        impression_id=impression_id,
    )
