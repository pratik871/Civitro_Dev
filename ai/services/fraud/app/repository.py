"""Database access for the Fraud Detection service."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from civitro_common.database import get_postgres
from civitro_common.logger import get_logger

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Fraud Signal CRUD
# ---------------------------------------------------------------------------


async def create_signal(
    entity_type: str,
    entity_id: str,
    signal_type: str,
    severity: str,
    confidence: float,
    details: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Insert a new fraud signal and return the created row."""
    pool = await get_postgres()
    signal_id = str(uuid4())
    now = datetime.now(timezone.utc)
    row = await pool.fetchrow(
        """
        INSERT INTO fraud_signals (
            id, entity_type, entity_id, signal_type, severity,
            confidence, details, resolved, created_at
        ) VALUES (
            $1::uuid, $2, $3::uuid, $4, $5,
            $6, $7::jsonb, FALSE, $8
        )
        RETURNING id::text, entity_type, entity_id::text, signal_type, severity,
                  confidence, details, resolved, resolved_by::text, resolved_at, created_at
        """,
        signal_id,
        entity_type,
        entity_id,
        signal_type,
        severity,
        confidence,
        details,
        now,
    )
    return dict(row)


async def get_signal(signal_id: str) -> dict[str, Any] | None:
    """Fetch a single fraud signal by ID."""
    pool = await get_postgres()
    row = await pool.fetchrow(
        """
        SELECT id::text, entity_type, entity_id::text, signal_type, severity,
               confidence, details, resolved, resolved_by::text, resolved_at, created_at
        FROM fraud_signals
        WHERE id = $1::uuid
        """,
        signal_id,
    )
    return dict(row) if row else None


async def list_signals(
    resolved: Optional[bool] = None,
    signal_type: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    """List fraud signals with optional filters. Returns (rows, total_count)."""
    pool = await get_postgres()

    conditions: list[str] = []
    values: list[Any] = []
    param_idx = 1

    if resolved is not None:
        conditions.append(f"resolved = ${param_idx}")
        values.append(resolved)
        param_idx += 1

    if signal_type:
        conditions.append(f"signal_type = ${param_idx}")
        values.append(signal_type)
        param_idx += 1

    if severity:
        conditions.append(f"severity = ${param_idx}")
        values.append(severity)
        param_idx += 1

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    # Total count
    count_query = f"SELECT COUNT(*) FROM fraud_signals {where_clause}"
    total = await pool.fetchval(count_query, *values)

    # Fetch rows
    data_query = f"""
        SELECT id::text, entity_type, entity_id::text, signal_type, severity,
               confidence, details, resolved, resolved_by::text, resolved_at, created_at
        FROM fraud_signals
        {where_clause}
        ORDER BY created_at DESC
        LIMIT ${param_idx} OFFSET ${param_idx + 1}
    """
    rows = await pool.fetch(data_query, *values, limit, offset)

    return [dict(r) for r in rows], total


async def resolve_signal(signal_id: str, resolved_by: str) -> dict[str, Any] | None:
    """Mark a fraud signal as resolved."""
    pool = await get_postgres()
    now = datetime.now(timezone.utc)
    row = await pool.fetchrow(
        """
        UPDATE fraud_signals
        SET resolved = TRUE, resolved_by = $2::uuid, resolved_at = $3
        WHERE id = $1::uuid
        RETURNING id::text, entity_type, entity_id::text, signal_type, severity,
                  confidence, details, resolved, resolved_by::text, resolved_at, created_at
        """,
        signal_id,
        resolved_by,
        now,
    )
    return dict(row) if row else None


async def get_dashboard_stats() -> dict[str, Any]:
    """Get summary statistics for the fraud dashboard."""
    pool = await get_postgres()

    total = await pool.fetchval("SELECT COUNT(*) FROM fraud_signals")
    unresolved = await pool.fetchval("SELECT COUNT(*) FROM fraud_signals WHERE NOT resolved")

    # By type
    type_rows = await pool.fetch(
        "SELECT signal_type, COUNT(*) AS cnt FROM fraud_signals GROUP BY signal_type"
    )
    by_type = {r["signal_type"]: r["cnt"] for r in type_rows}

    # By severity
    sev_rows = await pool.fetch(
        "SELECT severity, COUNT(*) AS cnt FROM fraud_signals GROUP BY severity"
    )
    by_severity = {r["severity"]: r["cnt"] for r in sev_rows}

    # Recent signals
    recent_rows = await pool.fetch(
        """
        SELECT id::text, entity_type, entity_id::text, signal_type, severity,
               confidence, details, resolved, resolved_by::text, resolved_at, created_at
        FROM fraud_signals
        ORDER BY created_at DESC
        LIMIT 10
        """
    )

    return {
        "total_signals": total or 0,
        "unresolved_count": unresolved or 0,
        "by_type": by_type,
        "by_severity": by_severity,
        "recent_signals": [dict(r) for r in recent_rows],
    }


# ---------------------------------------------------------------------------
# Queries used by fraud detection algorithms
# ---------------------------------------------------------------------------


async def get_recent_content(
    entity_type: str,
    window_hours: int = 24,
    limit: int = 200,
) -> list[dict[str, Any]]:
    """Fetch recent content (issues or voices) for duplicate checking."""
    pool = await get_postgres()

    if entity_type == "issue":
        rows = await pool.fetch(
            """
            SELECT id::text, description AS text, user_id::text, created_at
            FROM issues
            WHERE created_at >= NOW() - ($1 || ' hours')::interval
                AND description IS NOT NULL AND description != ''
            ORDER BY created_at DESC
            LIMIT $2
            """,
            str(window_hours),
            limit,
        )
    elif entity_type == "voice":
        rows = await pool.fetch(
            """
            SELECT id::text, content AS text, user_id::text, created_at
            FROM voices
            WHERE created_at >= NOW() - ($1 || ' hours')::interval
                AND content IS NOT NULL AND content != ''
            ORDER BY created_at DESC
            LIMIT $2
            """,
            str(window_hours),
            limit,
        )
    else:
        return []

    return [dict(r) for r in rows]


async def get_user_activity_count(
    user_id: str,
    window_minutes: int = 60,
) -> dict[str, int]:
    """Count a user's recent activity across different entity types."""
    pool = await get_postgres()
    interval = f"{window_minutes} minutes"

    issues = await pool.fetchval(
        """
        SELECT COUNT(*) FROM issues
        WHERE user_id = $1::uuid
          AND created_at >= NOW() - $2::interval
        """,
        user_id,
        interval,
    )

    voices = await pool.fetchval(
        """
        SELECT COUNT(*) FROM voices
        WHERE user_id = $1::uuid
          AND created_at >= NOW() - $2::interval
        """,
        user_id,
        interval,
    )

    return {
        "issues": issues or 0,
        "voices": voices or 0,
        "total": (issues or 0) + (voices or 0),
    }


async def get_entity_upvote_pattern(
    entity_id: str,
    entity_type: str,
    window_minutes: int = 30,
) -> dict[str, Any]:
    """Analyze upvote patterns for an entity to detect brigading."""
    pool = await get_postgres()

    if entity_type == "issue":
        table = "issue_upvotes"
        fk_col = "issue_id"
    elif entity_type == "voice":
        table = "voice_upvotes"
        fk_col = "voice_id"
    else:
        return {"total_recent": 0, "unique_users": 0, "avg_gap_seconds": 0}

    interval = f"{window_minutes} minutes"

    total = await pool.fetchval(
        f"""
        SELECT COUNT(*) FROM {table}
        WHERE {fk_col} = $1::uuid
          AND created_at >= NOW() - $2::interval
        """,
        entity_id,
        interval,
    )

    unique_users = await pool.fetchval(
        f"""
        SELECT COUNT(DISTINCT user_id) FROM {table}
        WHERE {fk_col} = $1::uuid
          AND created_at >= NOW() - $2::interval
        """,
        entity_id,
        interval,
    )

    # Average gap between consecutive upvotes
    gap_row = await pool.fetchrow(
        f"""
        WITH ordered AS (
            SELECT created_at,
                   LAG(created_at) OVER (ORDER BY created_at) AS prev_at
            FROM {table}
            WHERE {fk_col} = $1::uuid
              AND created_at >= NOW() - $2::interval
        )
        SELECT AVG(EXTRACT(EPOCH FROM (created_at - prev_at))) AS avg_gap
        FROM ordered
        WHERE prev_at IS NOT NULL
        """,
        entity_id,
        interval,
    )

    return {
        "total_recent": total or 0,
        "unique_users": unique_users or 0,
        "avg_gap_seconds": float(gap_row["avg_gap"]) if gap_row and gap_row["avg_gap"] else 0,
    }
