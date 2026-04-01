"""Business logic for the Fraud Detection service — content dedup, velocity, brigading."""

from __future__ import annotations

import re
from collections import Counter
from typing import Any

from civitro_common.logger import get_logger

from app.models import (
    AnalyzeResponse,
    EntityType,
    FraudSignal,
    Severity,
    SignalType,
)
from app.repository import (
    create_signal,
    get_entity_upvote_pattern,
    get_recent_content,
    get_user_activity_count,
)

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------------------

DUPLICATE_SIMILARITY_THRESHOLD = 0.85
VELOCITY_ISSUES_PER_HOUR = 10
VELOCITY_TOTAL_PER_HOUR = 15
BRIGADING_MIN_UPVOTES = 10
BRIGADING_AVG_GAP_SECONDS = 5.0  # suspiciously fast if avg gap < 5s


# ---------------------------------------------------------------------------
# Text similarity (simple bag-of-words cosine similarity)
# ---------------------------------------------------------------------------


def _tokenize(text: str) -> list[str]:
    """Lowercase and split text into word tokens."""
    return re.findall(r"\w+", text.lower())


def _cosine_similarity(text_a: str, text_b: str) -> float:
    """Compute cosine similarity between two texts using word frequency vectors."""
    tokens_a = _tokenize(text_a)
    tokens_b = _tokenize(text_b)

    if not tokens_a or not tokens_b:
        return 0.0

    counter_a = Counter(tokens_a)
    counter_b = Counter(tokens_b)

    all_words = set(counter_a.keys()) | set(counter_b.keys())

    dot_product = sum(counter_a.get(w, 0) * counter_b.get(w, 0) for w in all_words)
    magnitude_a = sum(v ** 2 for v in counter_a.values()) ** 0.5
    magnitude_b = sum(v ** 2 for v in counter_b.values()) ** 0.5

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    return dot_product / (magnitude_a * magnitude_b)


# ---------------------------------------------------------------------------
# Detection algorithms
# ---------------------------------------------------------------------------


async def check_duplicate_content(
    text: str,
    entity_type: str,
    entity_id: str,
) -> FraudSignal | None:
    """Check if text is suspiciously similar to recently submitted content."""
    if not text or len(text.strip()) < 20:
        return None

    recent = await get_recent_content(entity_type, window_hours=24, limit=200)

    best_match: dict[str, Any] | None = None
    best_similarity = 0.0

    for item in recent:
        # Skip self
        if item["id"] == entity_id:
            continue

        similarity = _cosine_similarity(text, item.get("text", ""))
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = item

    if best_similarity >= DUPLICATE_SIMILARITY_THRESHOLD and best_match:
        severity = Severity.HIGH if best_similarity >= 0.95 else Severity.MEDIUM

        row = await create_signal(
            entity_type=entity_type,
            entity_id=entity_id,
            signal_type=SignalType.DUPLICATE_CONTENT.value,
            severity=severity.value,
            confidence=round(best_similarity, 3),
            details={
                "matched_entity_id": best_match["id"],
                "similarity": round(best_similarity, 3),
                "matched_user_id": best_match.get("user_id"),
            },
        )

        log.info(
            "duplicate content detected",
            entity_type=entity_type,
            entity_id=entity_id,
            similarity=round(best_similarity, 3),
            matched_id=best_match["id"],
        )

        return _row_to_signal(row)

    return None


async def check_velocity(
    user_id: str,
    entity_id: str,
    entity_type: str,
) -> FraudSignal | None:
    """Check if a user is creating content at a suspiciously high rate."""
    if not user_id:
        return None

    counts = await get_user_activity_count(user_id, window_minutes=60)

    is_suspicious = False
    severity = Severity.LOW
    confidence = 0.0

    if counts["issues"] >= VELOCITY_ISSUES_PER_HOUR:
        is_suspicious = True
        ratio = counts["issues"] / VELOCITY_ISSUES_PER_HOUR
        confidence = min(ratio / 3.0, 1.0)
        severity = Severity.HIGH if ratio >= 3.0 else Severity.MEDIUM
    elif counts["total"] >= VELOCITY_TOTAL_PER_HOUR:
        is_suspicious = True
        ratio = counts["total"] / VELOCITY_TOTAL_PER_HOUR
        confidence = min(ratio / 3.0, 1.0)
        severity = Severity.MEDIUM if ratio >= 2.0 else Severity.LOW

    if is_suspicious:
        row = await create_signal(
            entity_type=entity_type,
            entity_id=entity_id,
            signal_type=SignalType.VELOCITY_SPIKE.value,
            severity=severity.value,
            confidence=round(confidence, 3),
            details={
                "user_id": user_id,
                "issues_last_hour": counts["issues"],
                "voices_last_hour": counts["voices"],
                "total_last_hour": counts["total"],
            },
        )

        log.info(
            "velocity spike detected",
            user_id=user_id,
            total_last_hour=counts["total"],
        )

        return _row_to_signal(row)

    return None


async def check_brigading(
    entity_id: str,
    entity_type: str,
) -> FraudSignal | None:
    """Check for coordinated upvote bursts on an entity."""
    pattern = await get_entity_upvote_pattern(entity_id, entity_type, window_minutes=30)

    total_recent = pattern["total_recent"]
    avg_gap = pattern["avg_gap_seconds"]

    if total_recent < BRIGADING_MIN_UPVOTES:
        return None

    is_suspicious = False
    severity = Severity.LOW
    confidence = 0.0

    # Suspiciously fast average gap between upvotes
    if avg_gap > 0 and avg_gap < BRIGADING_AVG_GAP_SECONDS:
        is_suspicious = True
        confidence = min(BRIGADING_AVG_GAP_SECONDS / max(avg_gap, 0.1), 1.0)
        severity = Severity.CRITICAL if confidence >= 0.9 else Severity.HIGH

    # High volume in short window
    elif total_recent >= BRIGADING_MIN_UPVOTES * 2:
        is_suspicious = True
        confidence = min(total_recent / (BRIGADING_MIN_UPVOTES * 5), 1.0)
        severity = Severity.HIGH if total_recent >= BRIGADING_MIN_UPVOTES * 3 else Severity.MEDIUM

    if is_suspicious:
        row = await create_signal(
            entity_type=entity_type,
            entity_id=entity_id,
            signal_type=SignalType.BRIGADING.value,
            severity=severity.value,
            confidence=round(confidence, 3),
            details={
                "total_upvotes_30min": total_recent,
                "unique_users": pattern["unique_users"],
                "avg_gap_seconds": round(avg_gap, 2),
            },
        )

        log.info(
            "brigading detected",
            entity_type=entity_type,
            entity_id=entity_id,
            total_upvotes=total_recent,
            avg_gap=round(avg_gap, 2),
        )

        return _row_to_signal(row)

    return None


# ---------------------------------------------------------------------------
# Full analysis (runs all checks for an entity)
# ---------------------------------------------------------------------------


async def analyze_entity(
    entity_type: str,
    entity_id: str,
    text: str | None = None,
    user_id: str | None = None,
) -> AnalyzeResponse:
    """Run all fraud detection checks on an entity."""
    signals: list[FraudSignal] = []

    # 1. Duplicate content check
    if text and entity_type in ("issue", "voice"):
        dup_signal = await check_duplicate_content(text, entity_type, entity_id)
        if dup_signal:
            signals.append(dup_signal)

    # 2. Velocity check
    if user_id:
        vel_signal = await check_velocity(user_id, entity_id, entity_type)
        if vel_signal:
            signals.append(vel_signal)

    # 3. Brigading check (for issues and voices that can be upvoted)
    if entity_type in ("issue", "voice"):
        brig_signal = await check_brigading(entity_id, entity_type)
        if brig_signal:
            signals.append(brig_signal)

    # Compute aggregate risk score
    risk_score = 0.0
    if signals:
        # Weighted average: severity maps to weight
        severity_weights = {
            Severity.LOW: 0.25,
            Severity.MEDIUM: 0.5,
            Severity.HIGH: 0.75,
            Severity.CRITICAL: 1.0,
        }
        weighted_sum = sum(
            s.confidence * severity_weights.get(s.severity, 0.5) for s in signals
        )
        risk_score = min(weighted_sum / len(signals), 1.0)

    log.info(
        "entity analysis complete",
        entity_type=entity_type,
        entity_id=entity_id,
        signals_found=len(signals),
        risk_score=round(risk_score, 3),
    )

    return AnalyzeResponse(
        entity_type=EntityType(entity_type),
        entity_id=entity_id,
        signals=signals,
        risk_score=round(risk_score, 3),
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _row_to_signal(row: dict[str, Any]) -> FraudSignal:
    """Convert a database row dict to a FraudSignal model."""
    return FraudSignal(
        id=str(row["id"]),
        entity_type=EntityType(row["entity_type"]),
        entity_id=str(row["entity_id"]),
        signal_type=SignalType(row["signal_type"]),
        severity=Severity(row["severity"]),
        confidence=float(row["confidence"]),
        details=row.get("details"),
        resolved=row.get("resolved", False),
        resolved_by=str(row["resolved_by"]) if row.get("resolved_by") else None,
        resolved_at=row.get("resolved_at"),
        created_at=row.get("created_at"),
    )
