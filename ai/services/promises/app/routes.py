"""API routes for the Promises service."""

from __future__ import annotations

from fastapi import APIRouter

from app.models import (
    ExtractionResult,
    Promise,
    PromiseExtractionRequest,
    PromiseListResponse,
    PromiseStatusUpdate,
    PromiseVerification,
)
from app import service

router = APIRouter(prefix="/promises", tags=["promises"])


@router.get("/leader/{leader_id}", response_model=PromiseListResponse)
async def get_by_leader(leader_id: str) -> PromiseListResponse:
    """Get all promises for a leader."""
    return await service.get_by_leader(leader_id)


@router.get("/boundary/{boundary_id}", response_model=PromiseListResponse)
async def get_by_boundary(boundary_id: str) -> PromiseListResponse:
    """Get all promises for a boundary/constituency."""
    return await service.get_by_boundary(boundary_id)


@router.get("/{promise_id}", response_model=Promise)
async def get_promise(promise_id: str) -> Promise:
    """Get a single promise by ID."""
    return await service.get_promise(promise_id)


@router.post("/extract", response_model=ExtractionResult)
async def extract(req: PromiseExtractionRequest) -> ExtractionResult:
    """Extract promises from text using LLM (Llama 3.1 via Ollama)."""
    return await service.extract_promises(req)


@router.put("/{promise_id}/status", response_model=Promise)
async def update_status(promise_id: str, update: PromiseStatusUpdate) -> Promise:
    """Update the status of a promise."""
    return await service.update_status(promise_id, update)


@router.put("/{promise_id}/verify", response_model=Promise)
async def verify(promise_id: str, body: PromiseVerification) -> Promise:
    """Verify or un-verify a promise."""
    return await service.verify(promise_id, body)
