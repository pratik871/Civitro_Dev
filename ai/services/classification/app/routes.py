"""API routes for the Classification service."""

from __future__ import annotations

from fastapi import APIRouter

from app.models import (
    Category,
    CategoriesResponse,
    CategoryInfo,
    ClassificationRequest,
    ClassificationResult,
    CATEGORY_DEPARTMENTS,
)
from app import service

router = APIRouter(prefix="/classify", tags=["classification"])


@router.post("/image", response_model=ClassificationResult)
async def classify_image(req: ClassificationRequest) -> ClassificationResult:
    """Classify a civic issue from an image using the ViT model."""
    return await service.classify_image(req)


@router.post("/text", response_model=ClassificationResult)
async def classify_text(req: ClassificationRequest) -> ClassificationResult:
    """Classify a civic issue from free-form text using NER."""
    return await service.classify_text(req)


@router.post("/combined", response_model=ClassificationResult)
async def classify_combined(req: ClassificationRequest) -> ClassificationResult:
    """Classify using an ensemble of image + text models."""
    return await service.classify_combined(req)


@router.get("/categories", response_model=CategoriesResponse)
async def list_categories() -> CategoriesResponse:
    """Return all supported classification categories."""
    cats = [
        CategoryInfo(
            name=cat.value,
            label=cat.value.replace("_", " ").title(),
            department=CATEGORY_DEPARTMENTS[cat],
        )
        for cat in Category
    ]
    return CategoriesResponse(categories=cats)
