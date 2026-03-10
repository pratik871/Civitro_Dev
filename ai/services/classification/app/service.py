"""Business logic for the Classification service — ViT image model, NER text, ensemble."""

from __future__ import annotations

import base64
import io
import time
from typing import Any

import httpx
import numpy as np
import torch
import torchvision.transforms as T
from PIL import Image

from civitro_common.config import get_config
from civitro_common.logger import get_logger

from app.models import (
    Category,
    ClassificationRequest,
    ClassificationResult,
    Severity,
    CATEGORY_DEPARTMENTS,
)
from app.repository import find_duplicate_issue, store_classification_result

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Module-level state (loaded at startup)
# ---------------------------------------------------------------------------

_vit_model: torch.nn.Module | None = None
_vit_transform: T.Compose | None = None
_categories = list(Category)
_device: torch.device = torch.device("cpu")

# Pre-processing for ViT-B/16 (224x224, ImageNet normalisation)
_IMAGE_SIZE = 224
_IMAGENET_MEAN = (0.485, 0.456, 0.406)
_IMAGENET_STD = (0.229, 0.224, 0.225)

# Severity heuristics per category
_CATEGORY_SEVERITY: dict[Category, Severity] = {
    Category.POTHOLE: Severity.MEDIUM,
    Category.GARBAGE: Severity.LOW,
    Category.STREETLIGHT: Severity.MEDIUM,
    Category.WATER_LEAK: Severity.HIGH,
    Category.ROAD_DAMAGE: Severity.HIGH,
    Category.ILLEGAL_CONSTRUCTION: Severity.MEDIUM,
    Category.DRAINAGE: Severity.MEDIUM,
    Category.TRAFFIC: Severity.MEDIUM,
    Category.HEALTHCARE: Severity.HIGH,
    Category.EDUCATION: Severity.LOW,
    Category.SAFETY: Severity.CRITICAL,
    Category.OTHER: Severity.LOW,
}


# ---------------------------------------------------------------------------
# Startup / teardown
# ---------------------------------------------------------------------------


def load_model() -> None:
    """Load the ViT-B/16 classification model.

    In production the model weights are fine-tuned on the 12 civic categories.
    For the scaffold we load the standard torchvision ViT and add a custom
    classification head.
    """
    global _vit_model, _vit_transform, _device

    cfg = get_config().ai.vision
    _device = torch.device(cfg.device if torch.cuda.is_available() else "cpu")
    log.info("loading ViT model", model=cfg.model, device=str(_device))

    # Build ViT-B/16 backbone with a 12-class head
    from torchvision.models import vit_b_16, ViT_B_16_Weights

    weights = ViT_B_16_Weights.DEFAULT
    model = vit_b_16(weights=weights)
    model.heads = torch.nn.Sequential(
        torch.nn.Linear(model.heads[0].in_features, len(_categories)),
    )
    model = model.to(_device)
    model.eval()
    _vit_model = model

    _vit_transform = T.Compose([
        T.Resize((_IMAGE_SIZE, _IMAGE_SIZE)),
        T.ToTensor(),
        T.Normalize(mean=_IMAGENET_MEAN, std=_IMAGENET_STD),
    ])
    log.info("ViT model loaded")


def unload_model() -> None:
    global _vit_model
    _vit_model = None
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


# ---------------------------------------------------------------------------
# Confidence tier helpers
# ---------------------------------------------------------------------------


def _confidence_tier(confidence: float) -> str:
    cfg = get_config().ai.vision
    if confidence >= cfg.confidence_threshold:
        return "auto"
    if confidence >= cfg.uncertain_threshold:
        return "uncertain"
    return "manual"


def _infer_severity(category: Category, confidence: float) -> Severity:
    base = _CATEGORY_SEVERITY.get(category, Severity.LOW)
    # Bump severity if confidence is very high and base is not already critical
    if confidence > 0.95 and base != Severity.CRITICAL:
        return Severity(
            {"low": "medium", "medium": "high", "high": "critical"}[base.value]
        )
    return base


# ---------------------------------------------------------------------------
# Image classification
# ---------------------------------------------------------------------------


async def _load_image(req: ClassificationRequest) -> Image.Image:
    """Fetch or decode the image from the request."""
    if req.image_base64:
        data = base64.b64decode(req.image_base64)
        return Image.open(io.BytesIO(data)).convert("RGB")
    if req.image_url:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(req.image_url)
            resp.raise_for_status()
            return Image.open(io.BytesIO(resp.content)).convert("RGB")
    raise ValueError("Either image_url or image_base64 must be provided")


async def classify_image(req: ClassificationRequest) -> ClassificationResult:
    """Run the ViT model on the supplied image."""
    assert _vit_model is not None and _vit_transform is not None

    img = await _load_image(req)
    tensor = _vit_transform(img).unsqueeze(0).to(_device)  # type: ignore[union-attr]

    start = time.monotonic()
    with torch.no_grad():
        logits = _vit_model(tensor)
    elapsed_ms = (time.monotonic() - start) * 1000
    log.info("vit inference", latency_ms=round(elapsed_ms, 1))

    probs = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()
    top_idx = int(np.argmax(probs))
    category = _categories[top_idx]
    confidence = float(probs[top_idx])

    duplicate_id = await find_duplicate_issue(
        category.value, req.gps_lat, req.gps_lng
    )

    result = ClassificationResult(
        category=category,
        confidence=round(confidence, 4),
        severity=_infer_severity(category, confidence),
        suggested_department=CATEGORY_DEPARTMENTS[category],
        duplicate_issue_id=duplicate_id,
        confidence_tier=_confidence_tier(confidence),
    )

    await store_classification_result(
        req.model_dump(exclude_none=True),
        result.model_dump(),
    )
    return result


# ---------------------------------------------------------------------------
# Text classification (NER-based)
# ---------------------------------------------------------------------------

# Simple keyword-based fallback; production would use a fine-tuned NER model.
_TEXT_KEYWORDS: dict[Category, list[str]] = {
    Category.POTHOLE: ["pothole", "crater", "hole in road", "road pit"],
    Category.GARBAGE: ["garbage", "trash", "waste", "rubbish", "litter", "dump"],
    Category.STREETLIGHT: ["streetlight", "lamp", "light pole", "dark street"],
    Category.WATER_LEAK: ["water leak", "pipe burst", "flooding", "water supply"],
    Category.ROAD_DAMAGE: ["road damage", "crack", "broken road", "asphalt"],
    Category.ILLEGAL_CONSTRUCTION: ["illegal construction", "encroachment", "unauthorised"],
    Category.DRAINAGE: ["drain", "sewer", "clog", "drainage", "blocked drain"],
    Category.TRAFFIC: ["traffic", "signal", "congestion", "traffic jam"],
    Category.HEALTHCARE: ["hospital", "health", "clinic", "medical", "disease"],
    Category.EDUCATION: ["school", "education", "college", "teacher"],
    Category.SAFETY: ["crime", "theft", "safety", "danger", "accident", "assault"],
}


async def classify_text(req: ClassificationRequest) -> ClassificationResult:
    """Classify free-form text into one of the 12 categories."""
    text = (req.text or "").lower()
    if not text:
        raise ValueError("text is required for text classification")

    best_cat = Category.OTHER
    best_score = 0.0

    for cat, keywords in _TEXT_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in text)
        if hits > 0:
            score = min(hits / len(keywords) + 0.4, 0.99)
            if score > best_score:
                best_score = score
                best_cat = cat

    if best_score == 0.0:
        best_score = 0.3  # low confidence fallback

    duplicate_id = await find_duplicate_issue(
        best_cat.value, req.gps_lat, req.gps_lng
    )

    return ClassificationResult(
        category=best_cat,
        confidence=round(best_score, 4),
        severity=_infer_severity(best_cat, best_score),
        suggested_department=CATEGORY_DEPARTMENTS[best_cat],
        duplicate_issue_id=duplicate_id,
        confidence_tier=_confidence_tier(best_score),
    )


# ---------------------------------------------------------------------------
# Combined (ensemble)
# ---------------------------------------------------------------------------


async def classify_combined(req: ClassificationRequest) -> ClassificationResult:
    """Ensemble of image + text classifiers.  Takes the higher-confidence result."""
    results: list[ClassificationResult] = []

    has_image = req.image_url or req.image_base64
    has_text = req.text

    if has_image:
        results.append(await classify_image(req))
    if has_text:
        results.append(await classify_text(req))

    if not results:
        raise ValueError("At least image or text must be provided")

    # Pick highest confidence
    best = max(results, key=lambda r: r.confidence)
    return best
