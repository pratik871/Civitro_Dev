"""Business logic for the Pattern Detection service — clustering & evidence generation."""

from __future__ import annotations

import asyncio
import math
from datetime import datetime, timezone
from typing import Any

import numpy as np

from civitro_common.config import get_config
from civitro_common.events import consume, emit, get_topic
from civitro_common.logger import get_logger

from app.models import (
    ClusterType,
    DetectedPattern,
    EvidencePackage,
    PatternConfidence,
    PatternMatchResult,
    PatternStatus,
)
from app.repository import (
    add_report_to_pattern,
    create_pattern,
    find_category_cluster,
    find_existing_active_pattern,
    find_geographic_cluster,
    get_category_rate_baseline,
    get_pattern,
    get_pattern_issue_details,
    get_pattern_reports,
    get_patterns_by_ward,
    get_recent_category_rate,
    get_ward_categories,
    get_ward_issues_with_coords,
    get_ward_name,
    list_active_patterns,
    update_pattern,
)

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Confidence thresholds
# ---------------------------------------------------------------------------

CATEGORY_EMERGING_THRESHOLD = 3
CATEGORY_CONFIRMED_THRESHOLD = 5
CATEGORY_CRITICAL_THRESHOLD = 10
CATEGORY_WINDOW_DAYS = 7

GEO_CLUSTER_MIN_REPORTS = 3
GEO_RADIUS_METERS = 500
GEO_WINDOW_DAYS = 14

TEMPORAL_SPIKE_MULTIPLIER = 3.0
TEMPORAL_BASELINE_DAYS = 30

SYSTEMIC_DAYS_THRESHOLD = 30


# ---------------------------------------------------------------------------
# Confidence helpers
# ---------------------------------------------------------------------------


def _compute_confidence(report_count: int, days_unresolved: int = 0) -> PatternConfidence:
    """Determine confidence level from report count and age."""
    if days_unresolved >= SYSTEMIC_DAYS_THRESHOLD and report_count >= CATEGORY_CONFIRMED_THRESHOLD:
        return PatternConfidence.SYSTEMIC
    if report_count >= CATEGORY_CRITICAL_THRESHOLD:
        return PatternConfidence.CRITICAL
    if report_count >= CATEGORY_CONFIRMED_THRESHOLD:
        return PatternConfidence.CONFIRMED
    return PatternConfidence.EMERGING


def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine distance between two GPS points in meters."""
    R = 6_371_000  # Earth radius in meters
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# 1. Category Clustering
# ---------------------------------------------------------------------------


async def detect_category_clusters(ward_id: str) -> list[DetectedPattern]:
    """Detect category-based clusters: 5+ same category in same ward within 7 days."""
    categories = await get_ward_categories(ward_id, CATEGORY_WINDOW_DAYS)
    detected: list[DetectedPattern] = []

    for category in categories:
        issues = await find_category_cluster(ward_id, category, CATEGORY_WINDOW_DAYS)
        if len(issues) < CATEGORY_EMERGING_THRESHOLD:
            continue

        # Check if pattern already exists
        existing = await find_existing_active_pattern(ward_id, category, ClusterType.CATEGORY.value)

        # Compute unique locations
        coords = set()
        for iss in issues:
            if iss.get("latitude") and iss.get("longitude"):
                coords.add((round(iss["latitude"], 4), round(iss["longitude"], 4)))
        unique_locations = max(len(coords), 1)

        first_at = min(iss["created_at"] for iss in issues)
        last_at = max(iss["created_at"] for iss in issues)
        days_unresolved = (datetime.now(timezone.utc) - first_at).days

        confidence = _compute_confidence(len(issues), days_unresolved)

        if existing:
            row = await update_pattern(
                existing["id"],
                report_count=len(issues),
                unique_locations=unique_locations,
                confidence=confidence.value,
                last_report_at=last_at,
                days_unresolved=days_unresolved,
            )
        else:
            # Compute centroid
            lats = [iss["latitude"] for iss in issues if iss.get("latitude")]
            lngs = [iss["longitude"] for iss in issues if iss.get("longitude")]
            centroid_lat = float(np.mean(lats)) if lats else None
            centroid_lng = float(np.mean(lngs)) if lngs else None

            row = await create_pattern(
                ward_id=ward_id,
                category=category,
                cluster_type=ClusterType.CATEGORY.value,
                confidence=confidence.value,
                report_count=len(issues),
                unique_locations=unique_locations,
                centroid_lat=centroid_lat,
                centroid_lng=centroid_lng,
                first_report_at=first_at,
                last_report_at=last_at,
            )

        pattern = _row_to_pattern(row)
        detected.append(pattern)

        # Link issue IDs to pattern
        for iss in issues:
            await add_report_to_pattern(pattern.id, iss["id"], similarity_score=1.0)

        # Emit event based on confidence
        await _emit_pattern_event(pattern)

    return detected


# ---------------------------------------------------------------------------
# 2. Geographic Clustering (PostGIS)
# ---------------------------------------------------------------------------


async def detect_geographic_clusters(ward_id: str) -> list[DetectedPattern]:
    """Detect geographic clusters: 3+ reports within 500m within 14 days."""
    issues = await get_ward_issues_with_coords(ward_id, GEO_WINDOW_DAYS)
    if len(issues) < GEO_CLUSTER_MIN_REPORTS:
        return []

    detected: list[DetectedPattern] = []
    visited_ids: set[str] = set()

    for anchor in issues:
        if anchor["id"] in visited_ids:
            continue

        nearby = await find_geographic_cluster(
            anchor["latitude"],
            anchor["longitude"],
            GEO_RADIUS_METERS,
            GEO_WINDOW_DAYS,
        )

        if len(nearby) < GEO_CLUSTER_MIN_REPORTS:
            continue

        # Mark all as visited to avoid duplicate clusters
        cluster_ids = {n["id"] for n in nearby}
        visited_ids.update(cluster_ids)

        # Determine dominant category
        cat_counts: dict[str, int] = {}
        for n in nearby:
            cat_counts[n["category"]] = cat_counts.get(n["category"], 0) + 1
        dominant_category = max(cat_counts, key=cat_counts.get)  # type: ignore[arg-type]

        # Compute centroid and radius
        lats = [n["latitude"] for n in nearby]
        lngs = [n["longitude"] for n in nearby]
        centroid_lat = float(np.mean(lats))
        centroid_lng = float(np.mean(lngs))

        max_dist = max(
            _haversine_meters(centroid_lat, centroid_lng, n["latitude"], n["longitude"])
            for n in nearby
        )

        first_at = min(n["created_at"] for n in nearby)
        last_at = max(n["created_at"] for n in nearby)
        days_unresolved = (datetime.now(timezone.utc) - first_at).days
        confidence = _compute_confidence(len(nearby), days_unresolved)

        existing = await find_existing_active_pattern(
            ward_id, dominant_category, ClusterType.GEOGRAPHIC.value,
        )

        if existing:
            row = await update_pattern(
                existing["id"],
                report_count=len(nearby),
                unique_locations=len(nearby),
                centroid_lat=centroid_lat,
                centroid_lng=centroid_lng,
                radius_meters=int(max_dist),
                confidence=confidence.value,
                last_report_at=last_at,
                days_unresolved=days_unresolved,
            )
        else:
            row = await create_pattern(
                ward_id=ward_id,
                category=dominant_category,
                cluster_type=ClusterType.GEOGRAPHIC.value,
                confidence=confidence.value,
                report_count=len(nearby),
                unique_locations=len(nearby),
                centroid_lat=centroid_lat,
                centroid_lng=centroid_lng,
                radius_meters=int(max_dist),
                first_report_at=first_at,
                last_report_at=last_at,
            )

        pattern = _row_to_pattern(row)
        detected.append(pattern)

        for n in nearby:
            await add_report_to_pattern(pattern.id, n["id"], similarity_score=1.0)

        await _emit_pattern_event(pattern)

    return detected


# ---------------------------------------------------------------------------
# 3. Temporal Spike Detection
# ---------------------------------------------------------------------------


async def detect_temporal_spikes(ward_id: str) -> list[DetectedPattern]:
    """Detect temporal spikes: 3x normal rate (30-day rolling avg baseline)."""
    categories = await get_ward_categories(ward_id, TEMPORAL_BASELINE_DAYS)
    detected: list[DetectedPattern] = []

    for category in categories:
        baseline_rate = await get_category_rate_baseline(
            ward_id, category, TEMPORAL_BASELINE_DAYS,
        )
        if baseline_rate <= 0:
            continue

        recent_rate = await get_recent_category_rate(ward_id, category, window_days=1)

        if recent_rate < baseline_rate * TEMPORAL_SPIKE_MULTIPLIER:
            continue

        spike_magnitude = recent_rate / baseline_rate
        report_count = int(recent_rate)

        existing = await find_existing_active_pattern(
            ward_id, category, ClusterType.TEMPORAL.value,
        )

        confidence = PatternConfidence.CRITICAL if spike_magnitude >= 5.0 else PatternConfidence.CONFIRMED

        if existing:
            row = await update_pattern(
                existing["id"],
                report_count=report_count,
                confidence=confidence.value,
                last_report_at=datetime.now(timezone.utc),
            )
        else:
            row = await create_pattern(
                ward_id=ward_id,
                category=category,
                cluster_type=ClusterType.TEMPORAL.value,
                confidence=confidence.value,
                report_count=report_count,
                first_report_at=datetime.now(timezone.utc),
                last_report_at=datetime.now(timezone.utc),
            )

        pattern = _row_to_pattern(row)
        detected.append(pattern)

        log.info(
            "temporal spike detected",
            ward_id=ward_id,
            category=category,
            magnitude=round(spike_magnitude, 2),
            baseline_rate=round(baseline_rate, 2),
            recent_rate=round(recent_rate, 2),
        )

        await _emit_pattern_event(pattern)

    return detected


# ---------------------------------------------------------------------------
# Full analysis (runs all 3 active clustering algorithms)
# ---------------------------------------------------------------------------


async def analyze_ward(ward_id: str) -> list[DetectedPattern]:
    """Run all active clustering algorithms for a ward."""
    results = await asyncio.gather(
        detect_category_clusters(ward_id),
        detect_geographic_clusters(ward_id),
        detect_temporal_spikes(ward_id),
        return_exceptions=True,
    )

    all_patterns: list[DetectedPattern] = []
    for i, result in enumerate(results):
        algo_name = ["category", "geographic", "temporal"][i]
        if isinstance(result, Exception):
            log.error("clustering algorithm failed", algorithm=algo_name, error=str(result))
        else:
            all_patterns.extend(result)

    log.info("ward analysis complete", ward_id=ward_id, patterns_found=len(all_patterns))
    return all_patterns


# ---------------------------------------------------------------------------
# Process incoming issue (real-time check)
# ---------------------------------------------------------------------------


async def process_new_issue(
    issue_id: str,
    ward_id: str,
    category: str,
    latitude: float | None = None,
    longitude: float | None = None,
) -> PatternMatchResult:
    """Check whether a newly reported issue matches any existing active pattern."""
    # 1. Category match
    existing_cat = await find_existing_active_pattern(
        ward_id, category, ClusterType.CATEGORY.value,
    )
    if existing_cat:
        await add_report_to_pattern(existing_cat["id"], issue_id, similarity_score=1.0)
        new_count = existing_cat["report_count"] + 1
        new_confidence = _compute_confidence(new_count, existing_cat.get("days_unresolved", 0))
        await update_pattern(
            existing_cat["id"],
            report_count=new_count,
            confidence=new_confidence.value,
            last_report_at=datetime.now(timezone.utc),
        )

        pattern = _row_to_pattern(existing_cat)
        # Regenerate evidence if confidence >= confirmed
        if new_confidence.value in (
            PatternConfidence.CONFIRMED.value,
            PatternConfidence.CRITICAL.value,
            PatternConfidence.SYSTEMIC.value,
        ):
            await _regenerate_evidence(existing_cat["id"])

        return PatternMatchResult(
            matched=True,
            pattern_id=existing_cat["id"],
            cluster_type=ClusterType.CATEGORY,
            confidence=new_confidence,
            report_count=new_count,
        )

    # 2. Geographic match
    if latitude is not None and longitude is not None:
        nearby = await find_geographic_cluster(latitude, longitude, GEO_RADIUS_METERS, GEO_WINDOW_DAYS)
        if len(nearby) >= GEO_CLUSTER_MIN_REPORTS:
            dominant_cat = category
            existing_geo = await find_existing_active_pattern(
                ward_id, dominant_cat, ClusterType.GEOGRAPHIC.value,
            )
            if existing_geo:
                await add_report_to_pattern(existing_geo["id"], issue_id, similarity_score=1.0)
                new_count = existing_geo["report_count"] + 1
                new_confidence = _compute_confidence(new_count, existing_geo.get("days_unresolved", 0))
                await update_pattern(
                    existing_geo["id"],
                    report_count=new_count,
                    confidence=new_confidence.value,
                    last_report_at=datetime.now(timezone.utc),
                )
                return PatternMatchResult(
                    matched=True,
                    pattern_id=existing_geo["id"],
                    cluster_type=ClusterType.GEOGRAPHIC,
                    confidence=new_confidence,
                    report_count=new_count,
                )

    # 3. Check if this issue pushes category count over emerging threshold
    cat_issues = await find_category_cluster(ward_id, category, CATEGORY_WINDOW_DAYS)
    if len(cat_issues) >= CATEGORY_EMERGING_THRESHOLD:
        # Trigger a fresh analysis to create/update the pattern
        patterns = await detect_category_clusters(ward_id)
        if patterns:
            p = patterns[0]
            return PatternMatchResult(
                matched=True,
                pattern_id=p.id,
                cluster_type=p.cluster_type,
                confidence=p.confidence,
                report_count=p.report_count,
            )

    return PatternMatchResult(matched=False)


# ---------------------------------------------------------------------------
# Evidence Package Generation
# ---------------------------------------------------------------------------


async def generate_evidence_package(pattern_id: str) -> EvidencePackage | None:
    """Build a structured evidence package for a confirmed+ pattern."""
    pat = await get_pattern(pattern_id)
    if not pat:
        return None

    issue_details = await get_pattern_issue_details(pattern_id)
    ward_name = await get_ward_name(pat["ward_id"])

    # Compute fields
    unique_coords = set()
    timeline: list[dict[str, Any]] = []
    photos: list[str] = []
    resolved = 0

    for iss in issue_details:
        if iss.get("latitude") and iss.get("longitude"):
            unique_coords.add((round(iss["latitude"], 4), round(iss["longitude"], 4)))
        timeline.append({
            "issue_id": iss["id"],
            "date": iss["created_at"].isoformat() if iss.get("created_at") else None,
            "status": iss.get("status"),
            "category": iss.get("category"),
        })
        if iss.get("photo_urls"):
            photos.extend(iss["photo_urls"][:2])  # Max 2 photos per issue
        if iss.get("status") == "resolved":
            resolved += 1

    first_at = issue_details[0]["created_at"] if issue_details else pat.get("first_report_at")
    last_at = issue_details[-1]["created_at"] if issue_details else pat.get("last_report_at")

    days_unresolved = 0
    if first_at:
        days_unresolved = (datetime.now(timezone.utc) - first_at).days

    date_range = ""
    if first_at and last_at:
        date_range = f"{first_at.strftime('%Y-%m-%d')} -> {last_at.strftime('%Y-%m-%d')}"

    # Build GeoJSON heatmap
    heat_map_geojson: dict[str, Any] = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [iss["longitude"], iss["latitude"]],
                },
                "properties": {
                    "issue_id": iss["id"],
                    "category": iss.get("category"),
                    "status": iss.get("status"),
                },
            }
            for iss in issue_details
            if iss.get("latitude") and iss.get("longitude")
        ],
    }

    # AI summary
    ai_summary = (
        f"{len(issue_details)} {pat['category'].replace('_', ' ')} "
        f"{'failure' if len(issue_details) != 1 else 'failures'} reported across "
        f"{len(unique_coords)} location{'s' if len(unique_coords) != 1 else ''} "
        f"in {ward_name} over the past {days_unresolved} days. "
        f"{resolved} have been resolved."
    )

    package = EvidencePackage(
        pattern_id=pattern_id,
        category=pat["category"],
        ward=ward_name,
        report_count=len(issue_details),
        unique_locations=len(unique_coords),
        date_range=date_range,
        days_unresolved=days_unresolved,
        resolution_count=resolved,
        heat_map_geojson=heat_map_geojson,
        timeline_data=timeline,
        representative_photos=photos[:10],
        ai_summary=ai_summary,
    )

    # Persist the evidence package on the pattern row
    await update_pattern(pattern_id, evidence_package_json=package.model_dump())

    return package


async def _regenerate_evidence(pattern_id: str) -> None:
    """Silently regenerate evidence for a pattern (called on updates)."""
    try:
        await generate_evidence_package(pattern_id)
    except Exception:
        log.exception("failed to regenerate evidence", pattern_id=pattern_id)


# ---------------------------------------------------------------------------
# Event emission
# ---------------------------------------------------------------------------


async def _emit_pattern_event(pattern: DetectedPattern) -> None:
    """Emit a Kafka event based on pattern confidence level."""
    event_map = {
        PatternConfidence.EMERGING: "pattern.emerging",
        PatternConfidence.CONFIRMED: "pattern.confirmed",
        PatternConfidence.CRITICAL: "pattern.critical",
        PatternConfidence.SYSTEMIC: "pattern.systemic",
    }
    event_type = event_map.get(pattern.confidence, "pattern.emerging")
    try:
        await emit(
            topic=get_topic("pattern"),
            key=pattern.ward_id,
            payload={
                "event": event_type,
                "pattern_id": pattern.id,
                "ward_id": pattern.ward_id,
                "category": pattern.category,
                "cluster_type": pattern.cluster_type.value,
                "confidence": pattern.confidence.value,
                "report_count": pattern.report_count,
            },
        )
    except Exception:
        log.exception("failed to emit pattern event", pattern_id=pattern.id)


# ---------------------------------------------------------------------------
# Kafka consumer (background task)
# ---------------------------------------------------------------------------


async def _handle_event(topic: str, payload: dict[str, Any]) -> None:
    """Process an incoming issue.reported event for real-time pattern detection."""
    issue_id = payload.get("issue_id") or payload.get("id")
    ward_id = payload.get("ward_id")
    category = payload.get("category")

    if not (issue_id and ward_id and category):
        log.warning("incomplete event payload, skipping", topic=topic, payload=payload)
        return

    latitude = payload.get("latitude")
    longitude = payload.get("longitude")

    result = await process_new_issue(
        issue_id=issue_id,
        ward_id=ward_id,
        category=category,
        latitude=latitude,
        longitude=longitude,
    )

    if result.matched:
        log.info(
            "issue matched to pattern",
            issue_id=issue_id,
            pattern_id=result.pattern_id,
            cluster_type=result.cluster_type.value if result.cluster_type else None,
            confidence=result.confidence.value if result.confidence else None,
        )


async def start_consumer() -> None:
    """Launch the Kafka consumer for issue events."""
    topics = [get_topic("issue")]
    await consume(
        topics=topics,
        group_id="pattern-detection",
        handler=_handle_event,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _row_to_pattern(row: dict[str, Any]) -> DetectedPattern:
    """Convert a database row dict to a DetectedPattern model."""
    return DetectedPattern(
        id=str(row["id"]),
        ward_id=str(row["ward_id"]),
        category=row["category"],
        cluster_type=ClusterType(row["cluster_type"]),
        confidence=PatternConfidence(row["confidence"]),
        report_count=row["report_count"],
        unique_locations=row.get("unique_locations", 0),
        centroid_lat=row.get("centroid_lat"),
        centroid_lng=row.get("centroid_lng"),
        radius_meters=row.get("radius_meters"),
        first_report_at=row.get("first_report_at"),
        last_report_at=row.get("last_report_at"),
        days_unresolved=row.get("days_unresolved", 0),
        economic_impact=row.get("economic_impact"),
        evidence_package_json=row.get("evidence_package_json"),
        community_action_id=str(row["community_action_id"]) if row.get("community_action_id") else None,
        status=PatternStatus(row["status"]) if row.get("status") else PatternStatus.ACTIVE,
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )
