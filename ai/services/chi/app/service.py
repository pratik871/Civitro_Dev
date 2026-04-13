"""Business logic for the CHI service — Constituency Health Index computation."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np

from civitro_common.errors import NotFoundError
from civitro_common.events import publish, get_topic
from civitro_common.logger import get_logger

from app.models import (
    CHIDimension,
    CHIHistory,
    CHIRankingEntry,
    CHIRankingResponse,
    CHIScore,
    CHITimePoint,
    ComputeResponse,
    DimensionLabel,
    RankingLevel,
    Trend,
)
from app.repository import (
    get_avg_response_hours,
    get_chi_history as repo_history,
    get_dimensions as repo_dimensions,
    get_latest_chi,
    get_rankings as repo_rankings,
    get_resolution_rate,
    get_signal_counts,
    save_chi_score,
)

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Dimension weights (must sum to 1.0)
# ---------------------------------------------------------------------------

DIMENSION_WEIGHTS: dict[DimensionLabel, float] = {
    DimensionLabel.INFRASTRUCTURE: 0.20,
    DimensionLabel.SANITATION: 0.15,
    DimensionLabel.HEALTHCARE: 0.15,
    DimensionLabel.EDUCATION: 0.12,
    DimensionLabel.PUBLIC_SAFETY: 0.12,
    DimensionLabel.WATER_SUPPLY: 0.10,
    DimensionLabel.TRANSPORT: 0.08,
    DimensionLabel.AIR_QUALITY: 0.08,
}

# Mapping from issue categories to CHI dimensions
_CATEGORY_TO_DIMENSION: dict[str, DimensionLabel] = {
    "pothole": DimensionLabel.INFRASTRUCTURE,
    "road_damage": DimensionLabel.INFRASTRUCTURE,
    "illegal_construction": DimensionLabel.INFRASTRUCTURE,
    "garbage": DimensionLabel.SANITATION,
    "drainage": DimensionLabel.SANITATION,
    "healthcare": DimensionLabel.HEALTHCARE,
    "education": DimensionLabel.EDUCATION,
    "safety": DimensionLabel.PUBLIC_SAFETY,
    "water_leak": DimensionLabel.WATER_SUPPLY,
    "streetlight": DimensionLabel.INFRASTRUCTURE,
    "traffic": DimensionLabel.TRANSPORT,
}


# ---------------------------------------------------------------------------
# Computation
# ---------------------------------------------------------------------------


def _normalise_report_score(count: int, *, baseline: int = 50) -> float:
    """Convert report count to a 0-100 score.

    Fewer reports → higher score (less problems).
    """
    if count <= 0:
        return 100.0
    score = max(0.0, 100.0 * (1 - count / baseline))
    return round(score, 2)


def _resolution_bonus(rate: float) -> float:
    """Bonus points (0-20) for high resolution rates."""
    return round(rate * 20, 2)


def _response_penalty(avg_hours: float, *, target_hours: float = 24.0) -> float:
    """Penalty (0-15) for slow response times."""
    if avg_hours <= target_hours:
        return 0.0
    excess = min(avg_hours - target_hours, 168)  # cap at 1 week
    return round(15 * (excess / 168), 2)


def _determine_trend(current: float, previous: float | None) -> Trend:
    if previous is None:
        return Trend.STABLE
    diff = current - previous
    if diff > 3:
        return Trend.IMPROVING
    if diff < -3:
        return Trend.DECLINING
    return Trend.STABLE


async def compute_chi(boundary_id: str) -> ComputeResponse:
    """Perform a full CHI computation for a boundary.

    Gathers citizen reports + resolution rates + response times, normalises,
    applies weighted dimension scores, and produces an overall index.
    """
    log.info("computing CHI", boundary_id=boundary_id)

    signal_counts = await get_signal_counts(boundary_id)
    resolution_rate = await get_resolution_rate(boundary_id)
    avg_response = await get_avg_response_hours(boundary_id)

    # Get previous scores for trend detection
    history = await repo_history(boundary_id, limit=2)
    prev_dims: dict[str, float] = {}
    if len(history) >= 2:
        prev_row = history[1]
        # Attempt to get previous dimension scores
        prev_latest = await repo_dimensions(boundary_id)
        for d in prev_latest:
            if isinstance(d, dict):
                prev_dims[d.get("label", "")] = d.get("score", 0)

    # Compute per-dimension scores
    dimensions: list[CHIDimension] = []
    for label, weight in DIMENSION_WEIGHTS.items():
        # Aggregate signal counts for this dimension
        dim_count = sum(
            signal_counts.get(cat, 0)
            for cat, dim in _CATEGORY_TO_DIMENSION.items()
            if dim == label
        )

        raw_score = _normalise_report_score(dim_count)
        raw_score += _resolution_bonus(resolution_rate)
        raw_score -= _response_penalty(avg_response)
        score = round(max(0, min(100, raw_score)), 2)

        trend = _determine_trend(score, prev_dims.get(label.value))

        dimensions.append(
            CHIDimension(
                label=label,
                score=score,
                weight=weight,
                signals_count=dim_count,
                trend=trend,
            )
        )

    # Weighted overall score
    overall = round(
        float(
            np.average(
                [d.score for d in dimensions],
                weights=[d.weight for d in dimensions],
            )
        ),
        2,
    )

    # Persist
    await save_chi_score(
        boundary_id=boundary_id,
        overall_score=overall,
        rank=0,  # Rank is re-computed in ranking queries
        rank_total=0,
        dimensions=[d.model_dump() for d in dimensions],
    )

    # Publish event (non-fatal if Kafka unavailable)
    try:
        await publish(
            get_topic("chi"),
            {
                "event": "chi.computed",
                "boundary_id": boundary_id,
                "overall_score": overall,
            },
            key=boundary_id,
        )

        # Alert if >10pt drop in 30 days
        if history:
            oldest_score = history[-1].get("score", overall)
            if overall < oldest_score - 10:
                log.warning(
                    "CHI alert: significant drop",
                    boundary_id=boundary_id,
                    drop=round(oldest_score - overall, 2),
                )
                await publish(
                    get_topic("chi"),
                    {
                        "event": "chi.alert",
                        "boundary_id": boundary_id,
                        "drop_points": round(oldest_score - overall, 2),
                    },
                    key=boundary_id,
                )
    except Exception:
        log.warning("failed to publish CHI event (Kafka unavailable)", boundary_id=boundary_id)

    log.info("CHI computed", boundary_id=boundary_id, overall=overall)
    return ComputeResponse(
        boundary_id=boundary_id,
        overall_score=overall,
        dimensions=dimensions,
        computed_at=datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# Query methods
# ---------------------------------------------------------------------------


async def get_chi(boundary_id: str) -> CHIScore:
    row = await get_latest_chi(boundary_id)
    if not row:
        raise NotFoundError("CHI score", boundary_id)

    import json as _json
    dims_raw = row["dimensions"]
    if isinstance(dims_raw, str):
        dims_raw = _json.loads(dims_raw)
    dims = [CHIDimension(**d) for d in dims_raw]

    return CHIScore(
        boundary_id=str(row["boundary_id"]),
        overall_score=row["overall_score"],
        rank=row["rank"],
        rank_total=row["rank_total"],
        dimensions=dims,
        computed_at=row["computed_at"],
    )


async def get_history(boundary_id: str) -> CHIHistory:
    rows = await repo_history(boundary_id)
    points = [
        CHITimePoint(score=r["score"], computed_at=r["computed_at"])
        for r in rows
    ]
    return CHIHistory(boundary_id=boundary_id, scores=points)


async def get_rankings(level: str) -> CHIRankingResponse:
    ranking_level = RankingLevel(level)
    rows = await repo_rankings(level)
    entries = [
        CHIRankingEntry(
            boundary_id=r["boundary_id"],
            boundary_name=r["boundary_name"],
            overall_score=r["overall_score"],
            rank=r["rank"],
            change=r.get("change", 0),
        )
        for r in rows
    ]
    return CHIRankingResponse(
        level=ranking_level,
        entries=entries,
        total=len(entries),
        computed_at=datetime.now(timezone.utc),
    )


async def get_dimensions(boundary_id: str) -> list[CHIDimension]:
    dims_raw = await repo_dimensions(boundary_id)
    if not dims_raw:
        raise NotFoundError("CHI dimensions", boundary_id)
    return [CHIDimension(**d) for d in dims_raw]
