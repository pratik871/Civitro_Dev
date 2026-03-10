"""Database access for the Advertising service."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from civitro_common.database import get_postgres, get_redis
from civitro_common.logger import get_logger

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Campaigns
# ---------------------------------------------------------------------------


async def create_campaign(data: dict[str, Any]) -> str:
    pool = await get_postgres()
    campaign_id = str(uuid4())
    await pool.execute(
        """
        INSERT INTO campaigns (id, advertiser_id, name, type, status,
                               budget, spent, targeting, creatives,
                               start_date, end_date, created_at)
        VALUES ($1, $2, $3, $4, 'draft', $5, 0, $6::jsonb, $7::jsonb,
                $8, $9, $10)
        """,
        campaign_id,
        data["advertiser_id"],
        data["name"],
        data["type"],
        data["budget"],
        json.dumps(data.get("targeting", {})),
        json.dumps(data.get("creatives", [])),
        data.get("start_date"),
        data.get("end_date"),
        datetime.now(timezone.utc),
    )
    return campaign_id


async def get_campaign(campaign_id: str) -> dict[str, Any] | None:
    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT id::text, advertiser_id, name, type, status,
               budget, spent, targeting, creatives,
               start_date, end_date, created_at
        FROM campaigns
        WHERE id = $1
        """,
        campaign_id,
    )
    if not row:
        return None
    result = dict(row)
    for field in ("targeting", "creatives"):
        if isinstance(result.get(field), str):
            result[field] = json.loads(result[field])
    return result


async def update_campaign(campaign_id: str, updates: dict[str, Any]) -> bool:
    pool = await get_postgres()
    set_clauses: list[str] = []
    params: list[Any] = [campaign_id]
    idx = 2

    for key, value in updates.items():
        if key in ("targeting", "creatives"):
            set_clauses.append(f"{key} = ${idx}::jsonb")
            params.append(json.dumps(value))
        else:
            set_clauses.append(f"{key} = ${idx}")
            params.append(value)
        idx += 1

    if not set_clauses:
        return True

    query = f"UPDATE campaigns SET {', '.join(set_clauses)} WHERE id = $1"
    tag = await pool.execute(query, *params)
    return tag != "UPDATE 0"


async def set_campaign_status(campaign_id: str, status: str) -> bool:
    pool = await get_postgres()
    tag = await pool.execute(
        "UPDATE campaigns SET status = $2 WHERE id = $1",
        campaign_id,
        status,
    )
    return tag != "UPDATE 0"


# ---------------------------------------------------------------------------
# Impressions
# ---------------------------------------------------------------------------


async def record_impression(
    campaign_id: str,
    user_id: str,
    clicked: bool = False,
) -> str:
    pool = await get_postgres()
    impression_id = str(uuid4())
    await pool.execute(
        """
        INSERT INTO ad_impressions (id, campaign_id, user_id, timestamp, clicked)
        VALUES ($1, $2, $3, $4, $5)
        """,
        impression_id,
        campaign_id,
        user_id,
        datetime.now(timezone.utc),
        clicked,
    )

    # Increment spent (simple CPC/CPM model — here we do a tiny CPM charge)
    await pool.execute(
        """
        UPDATE campaigns SET spent = spent + 0.001 WHERE id = $1
        """,
        campaign_id,
    )
    return impression_id


async def get_campaign_stats(campaign_id: str) -> dict[str, Any]:
    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT
            COUNT(*)::int AS impressions,
            COUNT(*) FILTER (WHERE clicked)::int AS clicks,
            CASE WHEN COUNT(*) > 0
                 THEN COUNT(*) FILTER (WHERE clicked)::float / COUNT(*)
                 ELSE 0 END AS ctr,
            COUNT(DISTINCT user_id)::int AS reach
        FROM ad_impressions
        WHERE campaign_id = $1
        """,
        campaign_id,
    )
    stats = dict(row) if row else {"impressions": 0, "clicks": 0, "ctr": 0.0, "reach": 0}

    # Get spent from campaign
    spent_row = await pool.fetchval(
        "SELECT spent FROM campaigns WHERE id = $1", campaign_id
    )
    stats["spent"] = float(spent_row or 0)
    stats["campaign_id"] = campaign_id
    return stats


# ---------------------------------------------------------------------------
# Ad serving
# ---------------------------------------------------------------------------


async def find_eligible_campaigns(
    boundary_id: str,
    user_id: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Find active campaigns targeting the given boundary that have budget remaining."""
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT id::text, advertiser_id, name, type, budget, spent,
               targeting, creatives, start_date, end_date, created_at
        FROM campaigns
        WHERE status = 'active'
          AND spent < budget
          AND (start_date IS NULL OR start_date <= NOW())
          AND (end_date IS NULL OR end_date >= NOW())
          AND (
            targeting::jsonb -> 'boundaries' IS NULL
            OR targeting::jsonb -> 'boundaries' = '[]'::jsonb
            OR targeting::jsonb -> 'boundaries' @> $1::jsonb
          )
        ORDER BY (budget - spent) DESC
        LIMIT $2
        """,
        json.dumps([boundary_id]),
        limit,
    )

    results = []
    for row in rows:
        r = dict(row)
        for field in ("targeting", "creatives"):
            if isinstance(r.get(field), str):
                r[field] = json.loads(r[field])
        results.append(r)
    return results


async def check_user_frequency(
    campaign_id: str,
    user_id: str,
    *,
    max_per_day: int = 3,
) -> bool:
    """Return True if the user can still be served this campaign today."""
    redis = await get_redis()
    key = f"ad:freq:{campaign_id}:{user_id}"
    count = await redis.get(key)
    if count and int(count) >= max_per_day:
        return False
    return True


async def increment_user_frequency(campaign_id: str, user_id: str) -> None:
    redis = await get_redis()
    key = f"ad:freq:{campaign_id}:{user_id}"
    pipe = redis.pipeline()
    pipe.incr(key)
    pipe.expire(key, 86400)
    await pipe.execute()
