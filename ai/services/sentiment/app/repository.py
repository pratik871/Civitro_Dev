"""Database access for the Sentiment service."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from civitro_common.database import get_postgres, get_mongo
from civitro_common.logger import get_logger

log = get_logger(__name__)


async def store_sentiment_result(
    text: str,
    language: str,
    result: dict[str, Any],
) -> str:
    """Persist a sentiment analysis result to MongoDB."""
    db = get_mongo()
    doc = {
        "text": text,
        "language": language,
        "result": result,
        "created_at": datetime.now(timezone.utc),
    }
    insert = await db.sentiment_results.insert_one(doc)
    return str(insert.inserted_id)


async def get_boundary_sentiments(
    boundary_id: str,
    hours: int = 24,
) -> list[dict[str, Any]]:
    """Fetch recent sentiment results for a given boundary."""
    db = get_mongo()
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    cursor = db.sentiment_results.find(
        {
            "boundary_id": boundary_id,
            "created_at": {"$gte": since},
        }
    ).sort("created_at", -1)
    return await cursor.to_list(length=10000)


async def get_trend_data(boundary_id: str) -> list[dict[str, Any]]:
    """Aggregate sentiment trends for a boundary from TimescaleDB / Postgres."""
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT topic, region, positive_pct, negative_pct, neutral_pct,
               intensity, report_count, change_pct
        FROM sentiment_trends
        WHERE boundary_id = $1
        ORDER BY computed_at DESC
        LIMIT 50
        """,
        boundary_id,
    )
    return [dict(r) for r in rows]


async def get_active_alerts() -> list[dict[str, Any]]:
    """Return all un-acknowledged sentiment alerts."""
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT id::text, boundary_id, topic, alert_type,
               negative_shift_pct, window_hours, triggered_at, acknowledged
        FROM sentiment_alerts
        WHERE acknowledged = false
        ORDER BY triggered_at DESC
        LIMIT 100
        """
    )
    return [dict(r) for r in rows]


async def upsert_hourly_aggregation(
    boundary_id: str,
    hour: datetime,
    positive: int,
    negative: int,
    neutral: int,
) -> None:
    """Upsert the hourly sentiment aggregation row."""
    pool = await get_postgres()
    await pool.execute(
        """
        INSERT INTO sentiment_hourly (boundary_id, hour, positive, negative, neutral)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (boundary_id, hour)
        DO UPDATE SET positive  = sentiment_hourly.positive  + EXCLUDED.positive,
                      negative  = sentiment_hourly.negative  + EXCLUDED.negative,
                      neutral   = sentiment_hourly.neutral   + EXCLUDED.neutral
        """,
        boundary_id,
        hour,
        positive,
        negative,
        neutral,
    )
