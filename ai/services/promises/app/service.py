"""Business logic for the Promises service — LLM extraction via Ollama, tracking."""

from __future__ import annotations

import json
from typing import Any

import httpx

from civitro_common.config import get_config
from civitro_common.errors import NotFoundError
from civitro_common.events import publish, get_topic
from civitro_common.logger import get_logger

from app.models import (
    ExtractedPromise,
    ExtractionResult,
    Promise,
    PromiseExtractionRequest,
    PromiseListResponse,
    PromiseStatusUpdate,
    PromiseVerification,
)
from app.repository import (
    find_similar_promises,
    get_promise_by_id,
    get_promises_by_boundary,
    get_promises_by_leader,
    insert_promise,
    update_promise_status,
    verify_promise as repo_verify,
)

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# LLM extraction prompt
# ---------------------------------------------------------------------------

_EXTRACTION_PROMPT = """\
You are an expert at analyzing political and civic speeches.
Extract ALL concrete promises from the following text.
For each promise, return a JSON object with these fields:
- "promise": the promise statement (max 200 chars)
- "category": one of [infrastructure, healthcare, education, water_supply, sanitation, transport, public_safety, employment, agriculture, housing, other]
- "timeline": estimated deadline if mentioned (e.g. "6 months", "by 2025"), or null
- "location": specific area/constituency if mentioned, or null

Return ONLY a JSON array of promise objects. If no promises are found, return [].

TEXT:
{text}
"""


async def _call_ollama(prompt: str) -> str:
    """Call the Ollama LLM and return the response text."""
    cfg = get_config().ai.llm
    url = f"{cfg.endpoint}/api/generate"

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            url,
            json={
                "model": cfg.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": cfg.temperature,
                    "num_predict": cfg.max_tokens,
                },
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("response", "")


# ---------------------------------------------------------------------------
# Public service methods
# ---------------------------------------------------------------------------


async def get_by_leader(leader_id: str) -> PromiseListResponse:
    rows = await get_promises_by_leader(leader_id)
    promises = [Promise(**r) for r in rows]
    return PromiseListResponse(promises=promises, total=len(promises))


async def get_promise(promise_id: str) -> Promise:
    row = await get_promise_by_id(promise_id)
    if not row:
        raise NotFoundError("Promise", promise_id)
    return Promise(**row)


async def get_by_boundary(boundary_id: str) -> PromiseListResponse:
    rows = await get_promises_by_boundary(boundary_id)
    promises = [Promise(**r) for r in rows]
    return PromiseListResponse(promises=promises, total=len(promises))


async def extract_promises(req: PromiseExtractionRequest) -> ExtractionResult:
    """Use LLM (Ollama / Llama 3.1) to extract promises from text."""
    prompt = _EXTRACTION_PROMPT.format(text=req.text)
    raw_response = await _call_ollama(prompt)

    # Parse the JSON array from the LLM response
    extracted: list[ExtractedPromise] = []
    try:
        # Try to find JSON array in the response
        start = raw_response.find("[")
        end = raw_response.rfind("]") + 1
        if start >= 0 and end > start:
            items = json.loads(raw_response[start:end])
            for item in items:
                extracted.append(
                    ExtractedPromise(
                        promise=item.get("promise", ""),
                        category=item.get("category", "other"),
                        timeline=item.get("timeline"),
                        location=item.get("location"),
                    )
                )
    except (json.JSONDecodeError, KeyError, TypeError):
        log.warning("failed to parse LLM response", response=raw_response[:200])

    # Deduplicate: check NLP similarity against existing promises
    if req.leader_id:
        for ep in extracted:
            similar = await find_similar_promises(ep.promise, req.leader_id)
            if not similar:
                pid = await insert_promise(
                    leader_id=req.leader_id,
                    promise_text=ep.promise,
                    category=ep.category,
                    source=req.source_type.value,
                    source_url=req.source_url,
                    timeline=ep.timeline,
                    location=ep.location,
                )
                await publish(
                    get_topic("promise"),
                    {"event": "promise.detected", "promise_id": pid, "leader_id": req.leader_id},
                    key=req.leader_id,
                )
            else:
                log.info(
                    "duplicate promise skipped",
                    promise=ep.promise[:80],
                    similar_id=similar[0]["id"],
                )

    return ExtractionResult(
        promises=extracted,
        source_type=req.source_type,
        raw_text_length=len(req.text),
    )


async def update_status(promise_id: str, update: PromiseStatusUpdate) -> Promise:
    ok = await update_promise_status(
        promise_id,
        update.status.value,
        update.progress_pct,
    )
    if not ok:
        raise NotFoundError("Promise", promise_id)

    await publish(
        get_topic("promise"),
        {
            "event": "promise.status_changed",
            "promise_id": promise_id,
            "status": update.status.value,
        },
        key=promise_id,
    )
    return await get_promise(promise_id)


async def verify(promise_id: str, verification: PromiseVerification) -> Promise:
    ok = await repo_verify(
        promise_id,
        verification.verified,
        verification.verified_by,
    )
    if not ok:
        raise NotFoundError("Promise", promise_id)

    await publish(
        get_topic("promise"),
        {
            "event": "promise.verified",
            "promise_id": promise_id,
            "verified": verification.verified,
        },
        key=promise_id,
    )
    return await get_promise(promise_id)


async def track_progress(promise_id: str) -> dict[str, Any]:
    """Return progress tracking info for a promise (stub for future implementation)."""
    promise = await get_promise(promise_id)
    return {
        "promise_id": promise.id,
        "status": promise.status.value,
        "progress_pct": promise.progress_pct,
        "verified": promise.verified,
    }
