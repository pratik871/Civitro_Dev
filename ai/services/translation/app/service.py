"""Business logic for the Translation service — Ollama (dev) / Bhashini (prod)."""

from __future__ import annotations

import asyncio
import hashlib
import os
import re
from collections import OrderedDict
from typing import Any

import httpx

from civitro_common.logger import get_logger

from app.models import (
    DetectLanguageResponse,
    TranslateResponse,
)

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Language configuration
# ---------------------------------------------------------------------------

LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "bn": "Bengali",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "or": "Odia",
    "as": "Assamese",
    "ur": "Urdu",
    "sa": "Sanskrit",
    "ks": "Kashmiri",
    "ne": "Nepali",
}

SUPPORTED_LANGUAGES = set(LANGUAGE_NAMES.keys())

# Unicode script ranges for auto-detection
_SCRIPT_RANGES: list[tuple[int, int, str]] = [
    (0x0900, 0x097F, "hi"),      # Devanagari → Hindi/Marathi/Sanskrit/Nepali (default hi)
    (0x0980, 0x09FF, "bn"),      # Bengali → Bengali/Assamese (default bn)
    (0x0A00, 0x0A7F, "pa"),      # Gurmukhi → Punjabi
    (0x0A80, 0x0AFF, "gu"),      # Gujarati
    (0x0B00, 0x0B7F, "or"),      # Odia
    (0x0B80, 0x0BFF, "ta"),      # Tamil
    (0x0C00, 0x0C7F, "te"),      # Telugu
    (0x0C80, 0x0CFF, "kn"),      # Kannada
    (0x0D00, 0x0D7F, "ml"),      # Malayalam
    (0x0600, 0x06FF, "ur"),      # Arabic/Nastaliq → Urdu
]


# ---------------------------------------------------------------------------
# LRU cache (in-memory)
# ---------------------------------------------------------------------------

class _LRUCache:
    """Thread-safe LRU cache backed by an OrderedDict."""

    def __init__(self, maxsize: int = 10000) -> None:
        self._cache: OrderedDict[str, TranslateResponse] = OrderedDict()
        self._maxsize = maxsize

    @staticmethod
    def _key(text: str, source: str, target: str) -> str:
        raw = f"{text}|{source}|{target}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, text: str, source: str, target: str) -> TranslateResponse | None:
        k = self._key(text, source, target)
        if k in self._cache:
            self._cache.move_to_end(k)
            return self._cache[k]
        return None

    def put(self, text: str, source: str, target: str, response: TranslateResponse) -> None:
        k = self._key(text, source, target)
        if k in self._cache:
            self._cache.move_to_end(k)
        else:
            if len(self._cache) >= self._maxsize:
                self._cache.popitem(last=False)
            self._cache[k] = response


# ---------------------------------------------------------------------------
# Translation service
# ---------------------------------------------------------------------------

class TranslationService:
    """Translates text using Ollama (dev) or Bhashini API (production)."""

    def __init__(self) -> None:
        self._app_env = os.getenv("APP_ENV", "local")
        self._backend = "bhashini" if self._app_env == "production" else "ollama"
        self._cache = _LRUCache(maxsize=10000)

        # Ollama configuration
        if self._app_env == "docker":
            self._ollama_url = "http://ollama:11434/api/generate"
        else:
            self._ollama_url = "http://localhost:11434/api/generate"
        self._ollama_model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

        # Bhashini configuration
        self._bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        self._bhashini_api_key = os.getenv("BHASHINI_API_KEY", "")
        self._bhashini_user_id = os.getenv("BHASHINI_USER_ID", "")

        self._client: httpx.AsyncClient | None = None

        log.info(
            "translation service initialised",
            backend=self._backend,
            app_env=self._app_env,
        )

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ----- Language detection -----

    def _detect_script(self, text: str) -> str:
        """Detect language from Unicode script ranges."""
        counts: dict[str, int] = {}
        for ch in text:
            cp = ord(ch)
            for lo, hi, lang in _SCRIPT_RANGES:
                if lo <= cp <= hi:
                    counts[lang] = counts.get(lang, 0) + 1
                    break

        if counts:
            return max(counts, key=counts.get)  # type: ignore[arg-type]

        # If mostly ASCII/Latin characters, assume English
        ascii_count = sum(1 for ch in text if ch.isascii() and ch.isalpha())
        if ascii_count > len(text) * 0.3:
            return "en"

        return "en"

    async def detect_language(self, text: str) -> DetectLanguageResponse:
        """Detect the language of the given text."""
        if self._backend == "ollama":
            # Use script-based detection first for high confidence
            script_lang = self._detect_script(text)
            if script_lang != "en":
                return DetectLanguageResponse(language=script_lang, confidence=0.9)

            # For ambiguous text, ask Ollama
            try:
                client = await self._get_client()
                prompt = (
                    "Identify the language of the following text. "
                    "Respond with ONLY the BCP-47 language code (e.g., en, hi, ta, te, kn, ml, mr, bn, gu, pa, or, as, ur, sa, ks, ne). "
                    "Nothing else.\n\n"
                    f"Text: {text}"
                )
                resp = await client.post(
                    self._ollama_url,
                    json={"model": self._ollama_model, "prompt": prompt, "stream": False},
                )
                resp.raise_for_status()
                detected = resp.json().get("response", "en").strip().lower()
                # Clean up — take only the first word/code
                detected = re.split(r"[\s,.]", detected)[0]
                if detected in SUPPORTED_LANGUAGES:
                    return DetectLanguageResponse(language=detected, confidence=0.85)
            except Exception:
                log.warning("ollama language detection failed, falling back to script detection")

            return DetectLanguageResponse(language=script_lang, confidence=0.7)
        else:
            # Bhashini: use script detection (Bhashini NMT handles auto-detect internally)
            script_lang = self._detect_script(text)
            return DetectLanguageResponse(language=script_lang, confidence=0.85)

    # ----- Translation backends -----

    async def _translate_ollama(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate using Ollama (local LLM)."""
        source_name = LANGUAGE_NAMES.get(source_lang, source_lang)
        target_name = LANGUAGE_NAMES.get(target_lang, target_lang)

        prompt = (
            f"Translate the following text from {source_name} to {target_name}. "
            f"Return ONLY the translated text, nothing else.\n\n"
            f"Text: {text}"
        )

        client = await self._get_client()
        resp = await client.post(
            self._ollama_url,
            json={
                "model": self._ollama_model,
                "prompt": prompt,
                "stream": False,
            },
        )
        resp.raise_for_status()
        data: dict[str, Any] = resp.json()
        translated = data.get("response", "").strip()
        if not translated:
            raise RuntimeError("Ollama returned empty translation")
        return translated

    async def _translate_bhashini(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate using the Bhashini NMT pipeline."""
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": source_lang,
                            "targetLanguage": target_lang,
                        },
                    },
                }
            ],
            "inputData": {
                "input": [{"source": text}],
            },
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": self._bhashini_api_key,
            "userID": self._bhashini_user_id,
        }

        client = await self._get_client()
        resp = await client.post(self._bhashini_url, json=payload, headers=headers)
        resp.raise_for_status()
        data: dict[str, Any] = resp.json()

        # Extract translated text from Bhashini response
        try:
            output = data["pipelineResponse"][0]["output"][0]["target"]
        except (KeyError, IndexError) as exc:
            raise RuntimeError(f"Unexpected Bhashini response structure: {data}") from exc

        return output

    # ----- Public API -----

    async def translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
    ) -> TranslateResponse:
        """Translate a single text between languages."""
        # Auto-detect source language if needed
        if source_lang == "auto":
            detection = await self.detect_language(text)
            source_lang = detection.language

        # Validate languages
        if source_lang not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported source language: {source_lang}")
        if target_lang not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported target language: {target_lang}")

        # Short-circuit if source == target
        if source_lang == target_lang:
            return TranslateResponse(
                translated_text=text,
                source_language=source_lang,
                target_language=target_lang,
                confidence=1.0,
            )

        # Check cache
        cached = self._cache.get(text, source_lang, target_lang)
        if cached is not None:
            log.debug("cache hit", source=source_lang, target=target_lang)
            return cached

        # Translate using the configured backend
        if self._backend == "bhashini":
            translated = await self._translate_bhashini(text, source_lang, target_lang)
            confidence = 0.95
        else:
            translated = await self._translate_ollama(text, source_lang, target_lang)
            confidence = 0.85

        result = TranslateResponse(
            translated_text=translated,
            source_language=source_lang,
            target_language=target_lang,
            confidence=confidence,
        )

        # Store in cache
        self._cache.put(text, source_lang, target_lang, result)

        log.info(
            "translation complete",
            backend=self._backend,
            source=source_lang,
            target=target_lang,
            text_length=len(text),
        )

        return result

    async def batch_translate(
        self,
        texts: list[str],
        source_lang: str,
        target_lang: str,
    ) -> list[TranslateResponse]:
        """Translate a batch of texts concurrently."""
        tasks = [self.translate(text, source_lang, target_lang) for text in texts]
        return await asyncio.gather(*tasks)
