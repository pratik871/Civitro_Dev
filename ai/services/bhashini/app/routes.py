"""API routes for the Bhashini NMT service."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models import (
    BatchTranslateRequest,
    BatchTranslateResponse,
    DetectLanguageRequest,
    DetectLanguageResponse,
    SupportedLanguagesResponse,
    TranslateRequest,
    TranslateResponse,
)
from app.service import BhashiniNMTService, LANGUAGE_NAMES

router = APIRouter(prefix="/bhashini", tags=["bhashini-nmt"])
service = BhashiniNMTService()


@router.post("/translate", response_model=TranslateResponse)
async def translate(req: TranslateRequest) -> TranslateResponse:
    """Translate a single text between languages using IndicTrans2."""
    if not service.is_loaded:
        raise HTTPException(status_code=503, detail="Models are still loading")
    try:
        result = await service.translate(req.text, req.source_language, req.target_language)
        return TranslateResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Translation error: {exc}"
        ) from exc


@router.post("/batch-translate", response_model=BatchTranslateResponse)
async def batch_translate(req: BatchTranslateRequest) -> BatchTranslateResponse:
    """Translate a batch of texts (up to 50)."""
    if not service.is_loaded:
        raise HTTPException(status_code=503, detail="Models are still loading")
    if len(req.texts) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 texts per batch")
    try:
        results = await service.batch_translate(
            req.texts, req.source_language, req.target_language,
        )
        translations = [TranslateResponse(**r) for r in results]
        return BatchTranslateResponse(translations=translations)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Batch translation error: {exc}"
        ) from exc


@router.post("/detect-language", response_model=DetectLanguageResponse)
async def detect_language(req: DetectLanguageRequest) -> DetectLanguageResponse:
    """Detect language from text using Unicode script analysis."""
    try:
        result = service.detect_language(req.text)
        return DetectLanguageResponse(**result)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Language detection error: {exc}"
        ) from exc


@router.get("/languages", response_model=SupportedLanguagesResponse)
async def supported_languages() -> SupportedLanguagesResponse:
    """List all supported languages."""
    return SupportedLanguagesResponse(languages=LANGUAGE_NAMES)
