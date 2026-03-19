"""API routes for the Translation service."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models import (
    BatchTranslateRequest,
    BatchTranslateResponse,
    DetectLanguageRequest,
    DetectLanguageResponse,
    TranslateRequest,
    TranslateResponse,
)
from app.service import TranslationService

router = APIRouter(prefix="/api/v1/translate", tags=["translation"])
service = TranslationService()


@router.post("", response_model=TranslateResponse)
async def translate(req: TranslateRequest) -> TranslateResponse:
    """Translate a single text between languages."""
    if req.source_language != "auto" and req.source_language == req.target_language:
        return TranslateResponse(
            translated_text=req.text,
            source_language=req.source_language,
            target_language=req.target_language,
            confidence=1.0,
        )
    try:
        return await service.translate(req.text, req.source_language, req.target_language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Translation backend error: {exc}") from exc


@router.post("/batch", response_model=BatchTranslateResponse)
async def batch_translate(req: BatchTranslateRequest) -> BatchTranslateResponse:
    """Translate a batch of texts."""
    try:
        results = await service.batch_translate(req.texts, req.source_language, req.target_language)
        return BatchTranslateResponse(translations=results)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Translation backend error: {exc}") from exc


@router.post("/detect", response_model=DetectLanguageResponse)
async def detect_language(req: DetectLanguageRequest) -> DetectLanguageResponse:
    """Detect the language of a text."""
    try:
        return await service.detect_language(req.text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Language detection error: {exc}") from exc
