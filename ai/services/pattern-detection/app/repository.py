"""Database access for the Pattern Detection service."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from civitro_common.database import get_postgres
from civitro_common.logger import get_logger

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Pattern CRUD
# ---------------------------------------------------------------------------


async def create_pattern(
    ward_id: str,
    category: str,
    cluster_type: str,
    confidence: str,
    report_count: int,
    unique_locations: int = 0,
    centroid_lat: Optional[float] = None,
    centroid_lng: Optional[float] = None,
    radius_meters: Optional[int] = None,
    first_report_at: Optional[datetime] = None,
    last_report_at: Optional[datetime] = None,
) -> dict[str, Any]:
    """Insert a new detected pattern and return the created row."""
    pool = await get_postgres()
    pattern_id = str(uuid4())
    now = datetime.now(timezone.utc)
    row = await pool.fetchrow(
        """
        INSERT INTO detected_patterns (
            id, ward_id, category, cluster_type, confidence,
            report_count, unique_locations,
            centroid_lat, centroid_lng, radius_meters,
            first_report_at, last_report_at,
            days_unresolved, status, created_at, updated_at
        ) VALUES (
            $1::uuid, $2::uuid, $3, $4, $5,
            $6, $7,
            $8, $9, $10,
            $11, $12,
            0, 'active', $13, $13
        )
        RETURNING *
        """,
        pattern_id,
        ward_id,
        category,
        cluster_type,
        confidence,
        report_count,
        unique_locations,
        centroid_lat,
        centroid_lng,
        radius_meters,
        first_report_at,
        last_report_at,
        now,
    )
    return dict(row)


async def update_pattern(
    pattern_id: str,
    **fields: Any,
) -> dict[str, Any] | None:
    """Update specific fields on a detected pattern."""
    if not fields:
        return await get_pattern(pattern_id)

    pool = await get_postgres()
    fields["updated_at"] = datetime.now(timezone.utc)

    set_clauses: list[str] = []
    values: list[Any] = []
    for idx, (col, val) in enumerate(fields.items(), start=2):
        set_clauses.append(f"{col} = ${idx}")
        values.append(val)

    query = (
        f"UPDATE detected_patterns SET {', '.join(set_clauses)} "
        f"WHERE id = $1::uuid RETURNING *"
    )
    row = await pool.fetchrow(query, pattern_id, *values)
    return dict(row) if row else None


async def get_pattern(pattern_id: str) -> dict[str, Any] | None:
    """Fetch a single pattern by ID."""
    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT id::text, ward_id::text, category, cluster_type, confidence,
               report_count, unique_locations,
               centroid_lat, centroid_lng, radius_meters,
               first_report_at, last_report_at, days_unresolved,
               economic_impact, evidence_package_json,
               community_action_id::text, status, created_at, updated_at
        FROM detected_patterns
        WHERE id = $1::uuid
        """,
        pattern_id,
    )
    return dict(row) if row else None


async def list_active_patterns(ward_id: Optional[str] = None) -> list[dict[str, Any]]:
    """Return all active patterns, optionally filtered by ward."""
    pool = await get_postgres()
    if ward_id:
        rows = await pool.fetch(
            """
            SELECT id::text, ward_id::text, category, cluster_type, confidence,
                   report_count, unique_locations,
                   centroid_lat, centroid_lng, radius_meters,
                   first_report_at, last_report_at, days_unresolved,
                   economic_impact, evidence_package_json,
                   community_action_id::text, status, created_at, updated_at
            FROM detected_patterns
            WHERE ward_id = $1::uuid AND status = 'active'
            ORDER BY updated_at DESC
            """,
            ward_id,
        )
    else:
        rows = await pool.fetch(
            """
            SELECT id::text, ward_id::text, category, cluster_type, confidence,
                   report_count, unique_locations,
                   centroid_lat, centroid_lng, radius_meters,
                   first_report_at, last_report_at, days_unresolved,
                   economic_impact, evidence_package_json,
                   community_action_id::text, status, created_at, updated_at
            FROM detected_patterns
            WHERE status = 'active'
            ORDER BY updated_at DESC
            """
        )
    return [dict(r) for r in rows]


async def get_patterns_by_ward(ward_id: str) -> list[dict[str, Any]]:
    """Return active patterns for a ward, most recent first."""
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT id::text, ward_id::text, category, cluster_type, confidence,
               report_count, unique_locations,
               centroid_lat, centroid_lng, radius_meters,
               first_report_at, last_report_at, days_unresolved,
               economic_impact, evidence_package_json,
               community_action_id::text, status, created_at, updated_at
        FROM detected_patterns
        WHERE ward_id = $1::uuid AND status = 'active'
        ORDER BY updated_at DESC
        LIMIT 100
        """,
        ward_id,
    )
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Pattern <-> Report links
# ---------------------------------------------------------------------------


async def add_report_to_pattern(
    pattern_id: str,
    issue_id: str,
    similarity_score: float = 1.0,
) -> dict[str, Any]:
    """Link an issue report to a detected pattern."""
    pool = await get_postgres()
    link_id = str(uuid4())
    now = datetime.now(timezone.utc)
    row = await pool.fetchrow(
        """
        INSERT INTO pattern_reports (id, pattern_id, issue_id, similarity_score, created_at)
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)
        ON CONFLICT (pattern_id, issue_id) DO UPDATE
            SET similarity_score = EXCLUDED.similarity_score
        RETURNING id::text, pattern_id::text, issue_id::text, similarity_score, created_at
        """,
        link_id,
        pattern_id,
        issue_id,
        similarity_score,
        now,
    )
    return dict(row)


async def get_pattern_reports(pattern_id: str) -> list[dict[str, Any]]:
    """Return all issue links for a pattern."""
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT pr.id::text, pr.pattern_id::text, pr.issue_id::text,
               pr.similarity_score, pr.created_at
        FROM pattern_reports pr
        WHERE pr.pattern_id = $1::uuid
        ORDER BY pr.created_at DESC
        """,
        pattern_id,
    )
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Clustering queries
# ---------------------------------------------------------------------------


async def find_category_cluster(
    ward_id: str,
    category: str,
    window_days: int = 7,
) -> list[dict[str, Any]]:
    """Find issues of the same category in a ward within the time window."""
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT id::text, ward_id::text, category,
               latitude, longitude, created_at, status
        FROM issues
        WHERE ward_id = $1::uuid
          AND category = $2
          AND created_at >= NOW() - ($3 || ' days')::interval
        ORDER BY created_at DESC
        """,
        ward_id,
        category,
        str(window_days),
    )
    return [dict(r) for r in rows]


async def find_geographic_cluster(
    latitude: float,
    longitude: float,
    radius_meters: int = 500,
    window_days: int = 14,
) -> list[dict[str, Any]]:
    """Find issues within a radius using PostGIS ST_DWithin."""
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT id::text, ward_id::text, category,
               latitude, longitude, created_at, status
        FROM issues
        WHERE ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
        )
        AND created_at >= NOW() - ($4 || ' days')::interval
        ORDER BY created_at DESC
        """,
        longitude,
        latitude,
        radius_meters,
        str(window_days),
    )
    return [dict(r) for r in rows]


async def get_category_rate_baseline(
    ward_id: str,
    category: str,
    baseline_days: int = 30,
) -> float:
    """Return the average daily report rate for a category in a ward over the baseline period."""
    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT COUNT(*)::float / GREATEST($3, 1) AS avg_daily_rate
        FROM issues
        WHERE ward_id = $1::uuid
          AND category = $2
          AND created_at >= NOW() - ($3 || ' days')::interval
        """,
        ward_id,
        category,
        str(baseline_days),
    )
    return float(row["avg_daily_rate"]) if row else 0.0


async def get_recent_category_rate(
    ward_id: str,
    category: str,
    window_days: int = 1,
) -> float:
    """Return the daily report rate for the recent window (default: last 24h)."""
    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT COUNT(*)::float / GREATEST($3, 1) AS daily_rate
        FROM issues
        WHERE ward_id = $1::uuid
          AND category = $2
          AND created_at >= NOW() - ($3 || ' days')::interval
        """,
        ward_id,
        category,
        str(window_days),
    )
    return float(row["daily_rate"]) if row else 0.0


async def get_ward_categories(ward_id: str, window_days: int = 30) -> list[str]:
    """Return distinct categories with recent reports in a ward."""
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT DISTINCT category
        FROM issues
        WHERE ward_id = $1::uuid
          AND created_at >= NOW() - ($2 || ' days')::interval
        """,
        ward_id,
        str(window_days),
    )
    return [r["category"] for r in rows]


async def get_ward_issues_with_coords(
    ward_id: str,
    window_days: int = 14,
) -> list[dict[str, Any]]:
    """Return recent issues in a ward that have GPS coordinates."""
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT id::text, ward_id::text, category,
               latitude, longitude, created_at, status
        FROM issues
        WHERE ward_id = $1::uuid
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND created_at >= NOW() - ($2 || ' days')::interval
        ORDER BY created_at DESC
        """,
        ward_id,
        str(window_days),
    )
    return [dict(r) for r in rows]


async def find_existing_active_pattern(
    ward_id: str,
    category: str,
    cluster_type: str,
) -> dict[str, Any] | None:
    """Check if an active pattern already exists for this ward + category + type."""
    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT id::text, ward_id::text, category, cluster_type, confidence,
               report_count, unique_locations,
               centroid_lat, centroid_lng, radius_meters,
               first_report_at, last_report_at, days_unresolved,
               economic_impact, evidence_package_json,
               community_action_id::text, status, created_at, updated_at
        FROM detected_patterns
        WHERE ward_id = $1::uuid
          AND category = $2
          AND cluster_type = $3
          AND status = 'active'
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        ward_id,
        category,
        cluster_type,
    )
    return dict(row) if row else None


async def get_ward_name(ward_id: str) -> str:
    """Fetch the human-readable ward name from the boundaries table."""
    pool = await get_postgres()
    row = await pool.fetchrow(
        "SELECT name FROM boundaries WHERE id = $1::uuid",
        ward_id,
    )
    return row["name"] if row else f"Ward {ward_id[:8]}"


async def get_pattern_issue_details(pattern_id: str) -> list[dict[str, Any]]:
    """Fetch full issue details for all reports linked to a pattern."""
    pool = await get_postgres()
    rows = await pool.fetch(
        """
        SELECT i.id::text, i.category, i.latitude, i.longitude,
               i.created_at, i.status, i.description,
               i.photo_urls, pr.similarity_score
        FROM pattern_reports pr
        JOIN issues i ON i.id = pr.issue_id
        WHERE pr.pattern_id = $1::uuid
        ORDER BY i.created_at ASC
        """,
        pattern_id,
    )
    return [dict(r) for r in rows]
