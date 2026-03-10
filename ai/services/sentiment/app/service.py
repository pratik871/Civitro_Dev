"""Business logic for the Sentiment service — Multilingual BERT, trends, alerts."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

import numpy as np
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from civitro_common.config import get_config
from civitro_common.events import consume, get_topic
from civitro_common.logger import get_logger

from app.models import (
    Emotion,
    Sentiment,
    SentimentAlert,
    SentimentDistribution,
    SentimentRequest,
    SentimentResult,
    TrendAnalysis,
    TrendResponse,
)
from app.repository import (
    get_active_alerts,
    get_trend_data,
    store_sentiment_result,
)

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Model state
# ---------------------------------------------------------------------------

_tokenizer: AutoTokenizer | None = None
_model: AutoModelForSequenceClassification | None = None
_device: torch.device = torch.device("cpu")

# Label mapping for the multilingual sentiment model
_LABEL_MAP: dict[int, Sentiment] = {
    0: Sentiment.NEGATIVE,
    1: Sentiment.NEUTRAL,
    2: Sentiment.POSITIVE,
}

# Keyword-based emotion detection (lightweight; production uses a dedicated model)
_EMOTION_KEYWORDS: dict[Emotion, list[str]] = {
    Emotion.ANGER: ["angry", "furious", "outraged", "disgusted", "unacceptable"],
    Emotion.FRUSTRATION: ["frustrated", "annoyed", "fed up", "tired of", "again"],
    Emotion.HOPE: ["hope", "optimistic", "looking forward", "expecting", "better"],
    Emotion.SATISFACTION: ["happy", "satisfied", "pleased", "thank", "great"],
    Emotion.FEAR: ["scared", "afraid", "worried", "dangerous", "unsafe", "threat"],
}


# ---------------------------------------------------------------------------
# Startup / teardown
# ---------------------------------------------------------------------------


def load_model() -> None:
    """Load the multilingual BERT sentiment model."""
    global _tokenizer, _model, _device

    cfg = get_config().ai.sentiment
    _device = torch.device(cfg.device if torch.cuda.is_available() else "cpu")
    model_name = "nlptown/bert-base-multilingual-uncased-sentiment"

    log.info("loading sentiment model", model=model_name, device=str(_device))
    _tokenizer = AutoTokenizer.from_pretrained(model_name)
    _model = AutoModelForSequenceClassification.from_pretrained(model_name)
    _model = _model.to(_device)  # type: ignore[union-attr]
    _model.eval()  # type: ignore[union-attr]
    log.info("sentiment model loaded")


def unload_model() -> None:
    global _model, _tokenizer
    _model = None
    _tokenizer = None
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


# ---------------------------------------------------------------------------
# Core analysis
# ---------------------------------------------------------------------------


def _detect_emotions(text: str) -> list[Emotion]:
    """Simple keyword-based emotion detection."""
    lower = text.lower()
    found: list[Emotion] = []
    for emotion, keywords in _EMOTION_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            found.append(emotion)
    return found


def _compute_urgency(sentiment: Sentiment, emotions: list[Emotion], confidence: float) -> float:
    """Heuristic urgency score: negative + anger/fear = high urgency."""
    base = 0.3
    if sentiment == Sentiment.NEGATIVE:
        base = 0.6
    elif sentiment == Sentiment.POSITIVE:
        base = 0.1

    if Emotion.ANGER in emotions:
        base += 0.2
    if Emotion.FEAR in emotions:
        base += 0.15
    if Emotion.FRUSTRATION in emotions:
        base += 0.1

    return min(round(base * confidence + 0.05, 4), 1.0)


async def analyze_sentiment(req: SentimentRequest) -> SentimentResult:
    """Analyze sentiment of a single text."""
    assert _tokenizer is not None and _model is not None

    inputs = _tokenizer(
        req.text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True,
    ).to(_device)

    with torch.no_grad():
        logits = _model(**inputs).logits

    probs = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()

    # The nlptown model has 5 stars; collapse to 3 classes
    neg_prob = float(np.sum(probs[:2]))
    neu_prob = float(probs[2])
    pos_prob = float(np.sum(probs[3:]))

    class_probs = {
        Sentiment.NEGATIVE: neg_prob,
        Sentiment.NEUTRAL: neu_prob,
        Sentiment.POSITIVE: pos_prob,
    }
    sentiment = max(class_probs, key=class_probs.get)  # type: ignore[arg-type]
    confidence = class_probs[sentiment]

    emotions = _detect_emotions(req.text)
    urgency = _compute_urgency(sentiment, emotions, confidence)

    result = SentimentResult(
        sentiment=sentiment,
        confidence=round(confidence, 4),
        emotions=emotions,
        urgency_score=urgency,
    )

    await store_sentiment_result(req.text, req.language, result.model_dump())
    return result


async def batch_analyze(items: list[SentimentRequest]) -> list[SentimentResult]:
    """Analyze a batch of texts concurrently."""
    tasks = [analyze_sentiment(item) for item in items]
    return await asyncio.gather(*tasks)


# ---------------------------------------------------------------------------
# Trends
# ---------------------------------------------------------------------------


async def get_trends(boundary_id: str) -> TrendResponse:
    """Return trend analyses for a given boundary."""
    rows = await get_trend_data(boundary_id)

    trends: list[TrendAnalysis] = []
    for r in rows:
        trends.append(
            TrendAnalysis(
                topic=r["topic"],
                region=r["region"],
                sentiment_distribution=SentimentDistribution(
                    positive=r["positive_pct"],
                    negative=r["negative_pct"],
                    neutral=r["neutral_pct"],
                ),
                intensity=r["intensity"],
                report_count=r["report_count"],
                change_pct=r["change_pct"],
            )
        )

    return TrendResponse(
        boundary_id=boundary_id,
        trends=trends,
        computed_at=datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# Alerts (>20% negative shift in 24h)
# ---------------------------------------------------------------------------


async def detect_alerts() -> list[SentimentAlert]:
    """Return current un-acknowledged sentiment alerts."""
    rows = await get_active_alerts()
    return [
        SentimentAlert(
            id=r["id"],
            boundary_id=r["boundary_id"],
            topic=r["topic"],
            alert_type=r["alert_type"],
            negative_shift_pct=r["negative_shift_pct"],
            window_hours=r["window_hours"],
            triggered_at=r["triggered_at"],
            acknowledged=r["acknowledged"],
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Kafka consumer (background task)
# ---------------------------------------------------------------------------


async def _handle_event(topic: str, payload: dict[str, Any]) -> None:
    """Process an incoming voice/issue event for real-time sentiment analysis."""
    text = payload.get("text") or payload.get("content") or payload.get("description")
    if not text:
        return

    language = payload.get("language", "en")
    req = SentimentRequest(text=text, language=language)
    result = await analyze_sentiment(req)
    log.info(
        "real-time sentiment analysed",
        topic=topic,
        sentiment=result.sentiment.value,
        urgency=result.urgency_score,
    )


async def start_consumer() -> None:
    """Launch the Kafka consumer for voices and issues topics."""
    topics = [get_topic("voice"), get_topic("issue")]
    await consume(
        topics=topics,
        group_id="sentiment",
        handler=_handle_event,
    )
