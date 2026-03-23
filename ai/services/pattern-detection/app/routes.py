"""API routes for the Pattern Detection service."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models import (
    AnalyzeRequest,
    DetectedPattern,
    EvidencePackage,
    PatternMatchResult,
    PatternReport,
    ProcessIssueRequest,
)
from app import service
from app.repository import get_pattern, get_patterns_by_ward

router = APIRouter(prefix="/api/v1", tags=["patterns"])


@router.post("/patterns/analyze", response_model=PatternReport)
async def analyze(req: AnalyzeRequest) -> PatternReport:
    """Trigger full pattern analysis for a ward (all 3 clustering algorithms)."""
    patterns = await service.analyze_ward(req.ward_id)
    return PatternReport(patterns=patterns)


@router.get("/patterns/ward/{ward_id}", response_model=PatternReport)
async def ward_patterns(ward_id: str) -> PatternReport:
    """List all patterns for a ward."""
    rows = await get_patterns_by_ward(ward_id)
    patterns = [service._row_to_pattern(r) for r in rows]
    return PatternReport(patterns=patterns)


@router.get("/patterns/{pattern_id}", response_model=DetectedPattern)
async def get_pattern_detail(pattern_id: str) -> DetectedPattern:
    """Get a single pattern with its evidence package."""
    row = await get_pattern(pattern_id)
    if not row:
        raise HTTPException(status_code=404, detail="Pattern not found")
    return service._row_to_pattern(row)


@router.get("/patterns/{pattern_id}/evidence-package", response_model=EvidencePackage)
async def get_evidence_package(pattern_id: str) -> EvidencePackage:
    """Generate or retrieve the evidence summary for a pattern."""
    row = await get_pattern(pattern_id)
    if not row:
        raise HTTPException(status_code=404, detail="Pattern not found")

    package = await service.generate_evidence_package(pattern_id)
    if not package:
        raise HTTPException(status_code=404, detail="Could not generate evidence package")
    return package


@router.post("/patterns/process-issue", response_model=PatternMatchResult)
async def process_issue(req: ProcessIssueRequest) -> PatternMatchResult:
    """Called when a new issue is reported — checks for pattern matches."""
    return await service.process_new_issue(
        issue_id=req.issue_id,
        ward_id=req.ward_id,
        category=req.category,
        latitude=req.latitude,
        longitude=req.longitude,
    )
