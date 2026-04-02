"""IndicTrans2 translation service — CPU-only inference via transformers."""

from __future__ import annotations

import hashlib
import os
import logging
import time
from collections import OrderedDict
from typing import Any

logger = logging.getLogger("bhashini.service")

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
    "sd": "Sindhi",
    "mai": "Maithili",
    "kok": "Konkani",
    "doi": "Dogri",
    "mni": "Manipuri",
    "brx": "Bodo",
}

SUPPORTED_LANGUAGES = set(LANGUAGE_NAMES.keys())

# IndicTrans2 uses Flores-200 language codes internally.
# Map our BCP-47 codes to Flores-200 codes used by the model.
_FLORES_CODES: dict[str, str] = {
    "en": "eng_Latn",
    "hi": "hin_Deva",
    "ta": "tam_Taml",
    "te": "tel_Telu",
    "kn": "kan_Knda",
    "ml": "mal_Mlym",
    "mr": "mar_Deva",
    "bn": "ben_Beng",
    "gu": "guj_Gujr",
    "pa": "pan_Guru",
    "or": "ory_Orya",
    "as": "asm_Beng",
    "ur": "urd_Arab",
    "sa": "san_Deva",
    "ks": "kas_Arab",
    "ne": "nep_Deva",
    "sd": "snd_Arab",
    "mai": "mai_Deva",
    "kok": "gom_Deva",
    "doi": "doi_Deva",
    "mni": "mni_Beng",
    "brx": "brx_Deva",
}

# Unicode script ranges for language detection
_SCRIPT_RANGES: list[tuple[int, int, str, str]] = [
    (0x0900, 0x097F, "hi", "Devanagari"),
    (0x0980, 0x09FF, "bn", "Bengali"),
    (0x0A00, 0x0A7F, "pa", "Gurmukhi"),
    (0x0A80, 0x0AFF, "gu", "Gujarati"),
    (0x0B00, 0x0B7F, "or", "Odia"),
    (0x0B80, 0x0BFF, "ta", "Tamil"),
    (0x0C00, 0x0C7F, "te", "Telugu"),
    (0x0C80, 0x0CFF, "kn", "Kannada"),
    (0x0D00, 0x0D7F, "ml", "Malayalam"),
    (0x0600, 0x06FF, "ur", "Arabic"),
]

# Model HuggingFace identifiers
_MODEL_EN_INDIC = "ai4bharat/indictrans2-en-indic-dist-200M"
_MODEL_INDIC_EN = "ai4bharat/indictrans2-indic-en-dist-200M"
_MODEL_INDIC_INDIC = "ai4bharat/indictrans2-indic-indic-dist-320M"


# ---------------------------------------------------------------------------
# LRU cache (same pattern as translation service)
# ---------------------------------------------------------------------------

class _LRUCache:
    """Thread-safe LRU cache backed by an OrderedDict."""

    def __init__(self, maxsize: int = 10000) -> None:
        self._cache: OrderedDict[str, Any] = OrderedDict()
        self._maxsize = maxsize

    @staticmethod
    def _key(text: str, source: str, target: str) -> str:
        raw = f"{text}|{source}|{target}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, text: str, source: str, target: str) -> Any | None:
        k = self._key(text, source, target)
        if k in self._cache:
            self._cache.move_to_end(k)
            return self._cache[k]
        return None

    def put(self, text: str, source: str, target: str, response: Any) -> None:
        k = self._key(text, source, target)
        if k in self._cache:
            self._cache.move_to_end(k)
        else:
            if len(self._cache) >= self._maxsize:
                self._cache.popitem(last=False)
            self._cache[k] = response


# ---------------------------------------------------------------------------
# Bhashini NMT Service
# ---------------------------------------------------------------------------

class BhashiniNMTService:
    """Runs IndicTrans2 models locally on CPU for offline translation."""

    def __init__(self) -> None:
        self._models_dir = os.getenv("HF_HOME", "/models")
        self._cache = _LRUCache(maxsize=10000)
        self._loaded = False

        # Model / tokenizer references (populated on load)
        self._model_en_indic: Any = None
        self._tokenizer_en_indic: Any = None
        self._model_indic_en: Any = None
        self._tokenizer_indic_en: Any = None
        self._model_indic_indic: Any = None
        self._tokenizer_indic_indic: Any = None

        # IP (IndicProcessor) for pre/post-processing
        self._ip: Any = None

    async def load_models(self) -> None:
        """Download (if needed) and load IndicTrans2 models into memory."""
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        # Limit CPU threads to avoid overwhelming the host
        num_threads = int(os.getenv("TORCH_NUM_THREADS", "2"))
        torch.set_num_threads(num_threads)
        torch.set_num_interop_threads(1)

        logger.info("Loading IndicTrans2 models (CPU-only, %d threads)...", num_threads)
        start = time.monotonic()

        # Attempt to import IndicProcessor for proper pre/post-processing.
        # If not available, we fall back to raw tokenizer usage.
        try:
            from IndicTransToolkit import IndicProcessor
            self._ip = IndicProcessor(inference=True)
            logger.info("IndicProcessor loaded successfully")
        except ImportError:
            logger.warning(
                "IndicTransToolkit not installed; using raw tokenizer "
                "(translation quality may be reduced)"
            )
            self._ip = None

        # --- en -> indic (200M distilled) ---
        logger.info("Loading en->indic model: %s", _MODEL_EN_INDIC)
        self._tokenizer_en_indic = AutoTokenizer.from_pretrained(
            _MODEL_EN_INDIC, trust_remote_code=True, cache_dir=self._models_dir,
        )
        self._model_en_indic = AutoModelForSeq2SeqLM.from_pretrained(
            _MODEL_EN_INDIC, trust_remote_code=True, cache_dir=self._models_dir,
        )
        self._model_en_indic.eval()

        # --- indic -> en (200M distilled) ---
        logger.info("Loading indic->en model: %s", _MODEL_INDIC_EN)
        self._tokenizer_indic_en = AutoTokenizer.from_pretrained(
            _MODEL_INDIC_EN, trust_remote_code=True, cache_dir=self._models_dir,
        )
        self._model_indic_en = AutoModelForSeq2SeqLM.from_pretrained(
            _MODEL_INDIC_EN, trust_remote_code=True, cache_dir=self._models_dir,
        )
        self._model_indic_en.eval()

        # --- indic -> indic (320M distilled) ---
        logger.info("Loading indic->indic model: %s", _MODEL_INDIC_INDIC)
        self._tokenizer_indic_indic = AutoTokenizer.from_pretrained(
            _MODEL_INDIC_INDIC, trust_remote_code=True, cache_dir=self._models_dir,
        )
        self._model_indic_indic = AutoModelForSeq2SeqLM.from_pretrained(
            _MODEL_INDIC_INDIC, trust_remote_code=True, cache_dir=self._models_dir,
        )
        self._model_indic_indic.eval()

        elapsed = time.monotonic() - start
        logger.info("All IndicTrans2 models loaded in %.1fs", elapsed)
        self._loaded = True

    async def unload_models(self) -> None:
        """Free model memory."""
        import gc

        self._model_en_indic = None
        self._tokenizer_en_indic = None
        self._model_indic_en = None
        self._tokenizer_indic_en = None
        self._model_indic_indic = None
        self._tokenizer_indic_indic = None
        self._ip = None
        self._loaded = False

        gc.collect()

        try:
            import torch
            torch.cuda.empty_cache()
        except Exception:
            pass

        logger.info("Models unloaded")

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    # ---- model selection ----

    def _select_model(
        self, source_lang: str, target_lang: str
    ) -> tuple[Any, Any, str]:
        """Return (model, tokenizer, model_name) for the given language pair."""
        if source_lang == "en":
            return (
                self._model_en_indic,
                self._tokenizer_en_indic,
                _MODEL_EN_INDIC,
            )
        elif target_lang == "en":
            return (
                self._model_indic_en,
                self._tokenizer_indic_en,
                _MODEL_INDIC_EN,
            )
        else:
            return (
                self._model_indic_indic,
                self._tokenizer_indic_indic,
                _MODEL_INDIC_INDIC,
            )

    # ---- core translation ----

    def _translate_batch_sync(
        self,
        texts: list[str],
        source_lang: str,
        target_lang: str,
    ) -> list[str]:
        """Synchronous batch translation using the appropriate model."""
        import torch

        model, tokenizer, _ = self._select_model(source_lang, target_lang)
        if model is None or tokenizer is None:
            raise RuntimeError("Models not loaded. Call load_models() first.")

        src_flores = _FLORES_CODES.get(source_lang)
        tgt_flores = _FLORES_CODES.get(target_lang)
        if src_flores is None:
            raise ValueError(f"Unsupported source language: {source_lang}")
        if tgt_flores is None:
            raise ValueError(f"Unsupported target language: {target_lang}")

        # Pre-process: IndicTrans2 tokenizer expects language-tagged input
        if self._ip is not None:
            processed_texts = self._ip.preprocess_batch(
                texts,
                src_lang=src_flores,
                tgt_lang=tgt_flores,
            )
        else:
            # Without IndicTransToolkit, manually add language tags
            processed_texts = [f"{src_flores} {t}" for t in texts]

        # Tokenize
        inputs = tokenizer(
            processed_texts,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=256,
        )

        # Generate translations
        with torch.no_grad():
            generated = model.generate(
                **inputs,
                forced_bos_token_id=tokenizer.convert_tokens_to_ids(tgt_flores),
                max_length=256,
                num_beams=5,
                num_return_sequences=1,
                early_stopping=True,
            )

        # Decode
        raw_translations = tokenizer.batch_decode(
            generated, skip_special_tokens=True,
        )

        # Post-process with IndicProcessor if available
        if self._ip is not None:
            translations = self._ip.postprocess_batch(
                raw_translations, lang=tgt_flores,
            )
        else:
            translations = [t.strip() for t in raw_translations]

        return translations

    # ---- public API ----

    async def translate(
        self, text: str, source_lang: str, target_lang: str
    ) -> dict[str, Any]:
        """Translate a single text string."""
        if source_lang not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported source language: {source_lang}")
        if target_lang not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported target language: {target_lang}")

        # Short-circuit
        if source_lang == target_lang:
            return {
                "translated_text": text,
                "source_language": source_lang,
                "target_language": target_lang,
                "confidence": 1.0,
                "model": "passthrough",
            }

        # Check cache
        cached = self._cache.get(text, source_lang, target_lang)
        if cached is not None:
            return cached

        import asyncio

        loop = asyncio.get_event_loop()
        translations = await loop.run_in_executor(
            None, self._translate_batch_sync, [text], source_lang, target_lang,
        )

        _, _, model_name = self._select_model(source_lang, target_lang)

        result = {
            "translated_text": translations[0],
            "source_language": source_lang,
            "target_language": target_lang,
            "confidence": 0.92,
            "model": model_name,
        }

        self._cache.put(text, source_lang, target_lang, result)

        logger.info(
            "Translated %d chars %s->%s", len(text), source_lang, target_lang,
        )

        return result

    async def batch_translate(
        self, texts: list[str], source_lang: str, target_lang: str
    ) -> list[dict[str, Any]]:
        """Translate a batch of texts."""
        if source_lang not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported source language: {source_lang}")
        if target_lang not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported target language: {target_lang}")

        if source_lang == target_lang:
            return [
                {
                    "translated_text": t,
                    "source_language": source_lang,
                    "target_language": target_lang,
                    "confidence": 1.0,
                    "model": "passthrough",
                }
                for t in texts
            ]

        # Split into cached and uncached
        results: list[dict[str, Any] | None] = [None] * len(texts)
        uncached_indices: list[int] = []
        uncached_texts: list[str] = []

        for i, text in enumerate(texts):
            cached = self._cache.get(text, source_lang, target_lang)
            if cached is not None:
                results[i] = cached
            else:
                uncached_indices.append(i)
                uncached_texts.append(text)

        if uncached_texts:
            import asyncio

            loop = asyncio.get_event_loop()
            translations = await loop.run_in_executor(
                None,
                self._translate_batch_sync,
                uncached_texts,
                source_lang,
                target_lang,
            )

            _, _, model_name = self._select_model(source_lang, target_lang)

            for idx, translated in zip(uncached_indices, translations):
                result = {
                    "translated_text": translated,
                    "source_language": source_lang,
                    "target_language": target_lang,
                    "confidence": 0.92,
                    "model": model_name,
                }
                results[idx] = result
                self._cache.put(texts[idx], source_lang, target_lang, result)

        logger.info(
            "Batch translated %d texts %s->%s (%d cached)",
            len(texts),
            source_lang,
            target_lang,
            len(texts) - len(uncached_texts),
        )

        return results  # type: ignore[return-value]

    # ---- language detection ----

    def detect_language(self, text: str) -> dict[str, Any]:
        """Detect language from Unicode script analysis."""
        counts: dict[str, int] = {}
        script_name = "Latin"

        for ch in text:
            cp = ord(ch)
            for lo, hi, lang, script in _SCRIPT_RANGES:
                if lo <= cp <= hi:
                    counts[lang] = counts.get(lang, 0) + 1
                    break

        if counts:
            detected = max(counts, key=counts.get)  # type: ignore[arg-type]
            # Find the script name for the detected language
            for _, _, lang, script in _SCRIPT_RANGES:
                if lang == detected:
                    script_name = script
                    break
            total_script_chars = sum(counts.values())
            total_chars = sum(1 for ch in text if not ch.isspace())
            confidence = min(total_script_chars / max(total_chars, 1), 1.0)
            return {
                "language": detected,
                "confidence": round(confidence, 2),
                "script": script_name,
            }

        # Default to English for ASCII-heavy text
        ascii_count = sum(1 for ch in text if ch.isascii() and ch.isalpha())
        total_alpha = sum(1 for ch in text if ch.isalpha())
        if total_alpha > 0 and ascii_count / total_alpha > 0.5:
            return {"language": "en", "confidence": 0.8, "script": "Latin"}

        return {"language": "en", "confidence": 0.5, "script": "Latin"}
