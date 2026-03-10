"""Database access for the Classification service."""

from __future__ import annotations

from typing import Any

from civitro_common.database import get_postgres, get_mongo
from civitro_common.logger import get_logger

log = get_logger(__name__)


async def find_duplicate_issue(
    category: str,
    lat: float | None,
    lng: float | None,
    *,
    radius_meters: float = 200.0,
) -> str | None:
    """Check for an existing open issue of the same category within *radius_meters*.

    Returns the issue ID if a duplicate is found, else None.
    """
    if lat is None or lng is None:
        return None

    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT id::text
        FROM issues
        WHERE category = $1
          AND status NOT IN ('resolved', 'closed')
          AND ST_DWithin(
                location::geography,
                ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
                $4
              )
        ORDER BY created_at DESC
        LIMIT 1
        """,
        category,
        lat,
        lng,
        radius_meters,
    )
    if row:
        log.info("duplicate issue found", issue_id=row["id"], category=category)
        return row["id"]
    return None


async def store_classification_result(
    request_payload: dict[str, Any],
    result_payload: dict[str, Any],
) -> str:
    """Persist a classification result to MongoDB for auditing / retraining."""
    db = get_mongo()
    doc = {
        "request": request_payload,
        "result": result_payload,
    }
    insert = await db.classifications.insert_one(doc)
    return str(insert.inserted_id)
