"""Database access for the Promises service."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from civitro_common.database import get_postgres
from civitro_common.logger import get_logger

log = get_logger(__name__)


async def get_promises_by_leader(leader_id: str) -> list[dict[str, Any]]:
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT id::text, leader_id, promise_text, category, location,
               timeline, status, progress_pct, source, source_url,
               detected_at, verified, verified_by
        FROM promises
        WHERE leader_id = $1
        ORDER BY detected_at DESC
        """,
        leader_id,
    )
    return [dict(r) for r in rows]


async def get_promise_by_id(promise_id: str) -> dict[str, Any] | None:
    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT id::text, leader_id, promise_text, category, location,
               timeline, status, progress_pct, source, source_url,
               detected_at, verified, verified_by
        FROM promises
        WHERE id = $1
        """,
        promise_id,
    )
    return dict(row) if row else None


async def get_promises_by_boundary(boundary_id: str) -> list[dict[str, Any]]:
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT p.id::text, p.leader_id, p.promise_text, p.category,
               p.location, p.timeline, p.status, p.progress_pct,
               p.source, p.source_url, p.detected_at,
               p.verified, p.verified_by
        FROM promises p
        JOIN leader_boundaries lb ON lb.leader_id = p.leader_id
        WHERE lb.boundary_id = $1
        ORDER BY p.detected_at DESC
        """,
        boundary_id,
    )
    return [dict(r) for r in rows]


async def insert_promise(
    leader_id: str,
    promise_text: str,
    category: str,
    source: str,
    source_url: str | None = None,
    timeline: str | None = None,
    location: str | None = None,
) -> str:
    pool = await get_postgres()
    pid = str(uuid4())
    await pool.execute(
        """
        INSERT INTO promises (id, leader_id, promise_text, category,
                              location, timeline, status, progress_pct,
                              source, source_url, detected_at, verified)
        VALUES ($1, $2, $3, $4, $5, $6, 'detected', 0, $7, $8, $9, false)
        """,
        pid,
        leader_id,
        promise_text,
        category,
        location,
        timeline,
        source,
        source_url,
        datetime.now(timezone.utc),
    )
    return pid


async def update_promise_status(
    promise_id: str,
    status: str,
    progress_pct: float | None = None,
) -> bool:
    pool = await get_postgres()
    if progress_pct is not None:
        tag = await pool.execute(
            """
            UPDATE promises
            SET status = $2, progress_pct = $3, updated_at = NOW()
            WHERE id = $1
            """,
            promise_id,
            status,
            progress_pct,
        )
    else:
        tag = await pool.execute(
            """
            UPDATE promises
            SET status = $2, updated_at = NOW()
            WHERE id = $1
            """,
            promise_id,
            status,
        )
    return tag != "UPDATE 0"


async def verify_promise(
    promise_id: str,
    verified: bool,
    verified_by: str,
) -> bool:
    pool = await get_postgres()
    tag = await pool.execute(
        """
        UPDATE promises
        SET verified = $2, verified_by = $3, updated_at = NOW()
        WHERE id = $1
        """,
        promise_id,
        verified,
        verified_by,
    )
    return tag != "UPDATE 0"


async def find_similar_promises(
    promise_text: str,
    leader_id: str | None = None,
    *,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Find existing promises with similar text (basic trigram / LIKE approach).

    Production would use pg_trgm or a vector similarity search.
    """
    pool = await get_postgres()
    query = """
        SELECT id::text, leader_id, promise_text, category, status
        FROM promises
        WHERE promise_text % $1
    """
    params: list[Any] = [promise_text]
    if leader_id:
        query += " AND leader_id = $2"
        params.append(leader_id)
    query += f" ORDER BY similarity(promise_text, $1) DESC LIMIT {limit}"

    try:
        rows = await pool.fetch(query, *params)
        return [dict(r) for r in rows]
    except Exception:
        # pg_trgm extension might not be installed; graceful fallback
        log.warning("trigram similarity query failed, skipping dedup")
        return []
