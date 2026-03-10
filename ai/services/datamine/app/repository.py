"""Database access for the Datamine service."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from civitro_common.database import get_postgres, get_mongo
from civitro_common.logger import get_logger

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------


async def create_report(
    report_type: str,
    boundary_id: str | None,
    parameters: dict[str, Any],
) -> str:
    pool = await get_postgres()
    report_id = str(uuid4())
    await pool.execute(
        """
        INSERT INTO analytics_reports (id, type, boundary_id, parameters,
                                       status, created_at)
        VALUES ($1, $2, $3, $4::jsonb, 'queued', $5)
        """,
        report_id,
        report_type,
        boundary_id,
        json.dumps(parameters),
        datetime.now(timezone.utc),
    )
    return report_id


async def get_report(report_id: str) -> dict[str, Any] | None:
    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT id::text, type, boundary_id, parameters, status,
               result_url, created_at, completed_at, error_message
        FROM analytics_reports
        WHERE id = $1
        """,
        report_id,
    )
    if not row:
        return None
    result = dict(row)
    if isinstance(result.get("parameters"), str):
        result["parameters"] = json.loads(result["parameters"])
    return result


async def update_report_status(
    report_id: str,
    status: str,
    result_url: str | None = None,
    error_message: str | None = None,
) -> None:
    pool = await get_postgres()
    await pool.execute(
        """
        UPDATE analytics_reports
        SET status = $2, result_url = $3, error_message = $4,
            completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN NOW() ELSE NULL END
        WHERE id = $1
        """,
        report_id,
        status,
        result_url,
        error_message,
    )


# ---------------------------------------------------------------------------
# Heatmap
# ---------------------------------------------------------------------------


async def get_heatmap_points(
    boundary_id: str,
    limit: int = 5000,
) -> list[dict[str, Any]]:
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT ST_Y(location::geometry) AS lat,
               ST_X(location::geometry) AS lng,
               category,
               1.0 / (1 + EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400) AS intensity
        FROM issues
        WHERE boundary_id = $1
          AND location IS NOT NULL
        ORDER BY created_at DESC
        LIMIT $2
        """,
        boundary_id,
        limit,
    )
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Demographics
# ---------------------------------------------------------------------------


async def get_demographics(boundary_id: str) -> dict[str, Any]:
    pool = await get_postgres()

    total = await pool.fetchval(
        "SELECT COUNT(*)::int FROM users WHERE boundary_id = $1",
        boundary_id,
    )

    verification = await pool.fetchrow(
        """
        SELECT
            COUNT(*) FILTER (WHERE aadhaar_verified)::int AS aadhaar_verified,
            COUNT(*) FILTER (WHERE phone_verified AND NOT aadhaar_verified)::int AS phone_verified,
            COUNT(*) FILTER (WHERE NOT phone_verified AND NOT aadhaar_verified)::int AS unverified
        FROM users
        WHERE boundary_id = $1
        """,
        boundary_id,
    )

    activity = await pool.fetchrow(
        """
        SELECT
            (SELECT COUNT(*)::int FROM voices WHERE boundary_id = $1
                AND created_at > NOW() - INTERVAL '30 days') AS voices_last_30d,
            (SELECT COUNT(*)::int FROM issues WHERE boundary_id = $1
                AND created_at > NOW() - INTERVAL '30 days') AS issues_last_30d,
            (SELECT COUNT(DISTINCT user_id)::int FROM poll_votes pv
                JOIN polls p ON p.id = pv.poll_id
                WHERE p.boundary_id = $1
                AND pv.created_at > NOW() - INTERVAL '30 days') AS polls_participated_last_30d
        """,
        boundary_id,
    )

    return {
        "total_users": total or 0,
        "verification_breakdown": dict(verification) if verification else {},
        "activity_metrics": dict(activity) if activity else {},
    }


# ---------------------------------------------------------------------------
# Issue trends
# ---------------------------------------------------------------------------


async def get_issue_trends(
    boundary_id: str,
    days: int = 30,
) -> list[dict[str, Any]]:
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT date_trunc('day', created_at)::date::text AS date,
               category,
               COUNT(*)::int AS count,
               COUNT(*) FILTER (WHERE status = 'resolved')::float /
                   GREATEST(COUNT(*), 1) AS resolution_rate
        FROM issues
        WHERE boundary_id = $1
          AND created_at > NOW() - ($2 || ' days')::interval
        GROUP BY 1, 2
        ORDER BY 1, 2
        """,
        boundary_id,
        str(days),
    )
    return [dict(r) for r in rows]
