"""Pydantic models for the Translation service."""

from __future__ import annotations

from pydantic import BaseModel, Field


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    source_language: str = Field(default="auto", description="BCP-47 code or 'auto' for detection")
    target_language: str = Field(..., description="BCP-47 code like 'hi', 'en', 'ta'")


class TranslateResponse(BaseModel):
    translated_text: str
    source_language: str
    target_language: str
    confidence: float = 1.0


class BatchTranslateRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=50)
    source_language: str = Field(default="auto")
    target_language: str = Field(...)


class BatchTranslateResponse(BaseModel):
    translations: list[TranslateResponse]


class DetectLanguageRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


class DetectLanguageResponse(BaseModel):
    language: str
    confidence: float
