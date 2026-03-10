"""Database access for the CHI service."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from civitro_common.database import get_postgres
from civitro_common.logger import get_logger

log = get_logger(__name__)


async def get_latest_chi(boundary_id: str) -> dict[str, Any] | None:
    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT boundary_id, overall_score, rank, rank_total, dimensions,
               computed_at
        FROM chi_scores
        WHERE boundary_id = $1
        ORDER BY computed_at DESC
        LIMIT 1
        """,
        boundary_id,
    )
    return dict(row) if row else None


async def get_chi_history(
    boundary_id: str,
    limit: int = 90,
) -> list[dict[str, Any]]:
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT overall_score AS score, computed_at
        FROM chi_scores
        WHERE boundary_id = $1
        ORDER BY computed_at DESC
        LIMIT $2
        """,
        boundary_id,
        limit,
    )
    return [dict(r) for r in rows]


async def get_rankings(level: str, limit: int = 100) -> list[dict[str, Any]]:
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT DISTINCT ON (cs.boundary_id)
               cs.boundary_id, b.name AS boundary_name,
               cs.overall_score, cs.rank,
               COALESCE(cs.rank - prev.rank, 0) AS change
        FROM chi_scores cs
        JOIN boundaries b ON b.id = cs.boundary_id
        LEFT JOIN LATERAL (
            SELECT rank FROM chi_scores
            WHERE boundary_id = cs.boundary_id
              AND computed_at < cs.computed_at
            ORDER BY computed_at DESC LIMIT 1
        ) prev ON true
        WHERE b.level = $1
        ORDER BY cs.boundary_id, cs.computed_at DESC
        """,
        level,
    )
    # Re-sort by score descending
    result = sorted([dict(r) for r in rows], key=lambda x: x["overall_score"], reverse=True)
    # Assign ranks
    for idx, entry in enumerate(result):
        entry["rank"] = idx + 1
    return result[:limit]


async def get_dimensions(boundary_id: str) -> list[dict[str, Any]]:
    """Return the dimension breakdown from the latest CHI score."""
    row = await get_latest_chi(boundary_id)
    if not row or not row.get("dimensions"):
        return []
    # dimensions is stored as JSONB
    import json
    dims = row["dimensions"]
    if isinstance(dims, str):
        dims = json.loads(dims)
    return dims


async def save_chi_score(
    boundary_id: str,
    overall_score: float,
    rank: int,
    rank_total: int,
    dimensions: list[dict[str, Any]],
) -> None:
    pool = await get_postgres()
    import json
    await pool.execute(
        """
        INSERT INTO chi_scores (boundary_id, overall_score, rank, rank_total,
                                dimensions, computed_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        """,
        boundary_id,
        overall_score,
        rank,
        rank_total,
        json.dumps(dimensions),
        datetime.now(timezone.utc),
    )


async def get_signal_counts(boundary_id: str) -> dict[str, int]:
    """Count citizen reports per dimension category for a boundary."""
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT category, COUNT(*)::int AS cnt
        FROM issues
        WHERE boundary_id = $1
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY category
        """,
        boundary_id,
    )
    return {r["category"]: r["cnt"] for r in rows}


async def get_resolution_rate(boundary_id: str) -> float:
    """Return the issue resolution rate for a boundary (last 30 days)."""
    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT
            COUNT(*) FILTER (WHERE status = 'resolved')::float /
            GREATEST(COUNT(*), 1) AS rate
        FROM issues
        WHERE boundary_id = $1
          AND created_at > NOW() - INTERVAL '30 days'
        """,
        boundary_id,
    )
    return float(row["rate"]) if row else 0.0


async def get_avg_response_hours(boundary_id: str) -> float:
    """Average hours to first response for issues in the last 30 days."""
    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT COALESCE(
            AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600),
            0
        )::float AS avg_hours
        FROM issues
        WHERE boundary_id = $1
          AND created_at > NOW() - INTERVAL '30 days'
          AND first_response_at IS NOT NULL
        """,
        boundary_id,
    )
    return float(row["avg_hours"]) if row else 0.0
