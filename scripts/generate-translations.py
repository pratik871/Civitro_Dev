#!/usr/bin/env python3
"""
Generate i18n translation files for all Indian languages using Bhashini NMT.

Reads en.json as the source, sends all strings to the Bhashini translation API,
and generates locale JSON files for each target language.

Usage:
  python scripts/generate-translations.py [--api-url https://api.civitro.com]

Requires: pip install httpx
"""

import argparse
import json
import sys
import time
from pathlib import Path

try:
    import httpx
except ImportError:
    print("Install httpx: pip install httpx")
    sys.exit(1)

LOCALES_DIR = Path(__file__).parent.parent / "frontend" / "mobile" / "src" / "i18n" / "locales"

# Languages to generate (all Bhashini-supported Indian languages)
TARGET_LANGUAGES = [
    "hi",  # Hindi
    "mr",  # Marathi
    "ta",  # Tamil
    "te",  # Telugu
    "kn",  # Kannada
    "ml",  # Malayalam
    "bn",  # Bengali
    "gu",  # Gujarati
    "pa",  # Punjabi
    "or",  # Odia
    "as",  # Assamese
    "ur",  # Urdu
    "sa",  # Sanskrit
    "ks",  # Kashmiri
    "ne",  # Nepali
]

# Keys that should NOT be translated (brand names, technical values)
SKIP_KEYS = {
    "builtWithValue",  # "React Native + Go + Python"
}

# Values that should NOT be translated
SKIP_VALUES = {
    "Civitro",
    "DEMOCRACY",
    "YOU SHAPE",
    "React Native + Go + Python",
    "+91",
    "MLA",
    "MP",
    "CM",
    "PM",
    "DC",
    "BJP",
    "INC",
    "BMC",
    "IAS",
    "RTI",
    "SLA",
}


from typing import Dict, List, Optional

def flatten_json(obj: dict, prefix: str = "") -> Dict[str, str]:
    """Flatten nested JSON to dot-notation keys."""
    result = {}
    for key, value in obj.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            result.update(flatten_json(value, full_key))
        elif isinstance(value, str):
            result[full_key] = value
    return result


def unflatten_json(flat: Dict[str, str]) -> dict:
    """Unflatten dot-notation keys back to nested JSON."""
    result = {}
    for key, value in flat.items():
        parts = key.split(".")
        current = result
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        current[parts[-1]] = value
    return result


def should_translate(key: str, value: str) -> bool:
    """Check if a value should be translated."""
    if key.split(".")[-1] in SKIP_KEYS:
        return False
    if value in SKIP_VALUES:
        return False
    # Skip interpolation-only values like "{{count}}"
    stripped = value.replace("{{", "").replace("}}", "").strip()
    if not stripped or stripped.isdigit():
        return False
    # Skip very short values (likely codes)
    if len(value) <= 2:
        return False
    return True


def batch_translate(
    texts: List[str],
    target_lang: str,
    api_url: str,
    batch_size: int = 10,
) -> List[str]:
    """Translate texts in batches using the Bhashini API."""
    results = []
    client = httpx.Client(timeout=300.0)

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        try:
            resp = client.post(
                f"{api_url}/api/v1/translate/batch",
                json={
                    "texts": batch,
                    "source_language": "en",
                    "target_language": target_lang,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            translations = data.get("translations", [])
            for j, t in enumerate(translations):
                results.append(t.get("translated_text", batch[j]))
            # Fill any missing
            while len(results) < i + len(batch):
                results.append(batch[len(results) - i])
        except Exception as e:
            print(f"    Batch {i//batch_size + 1} failed: {e}")
            # Use original text as fallback
            results.extend(batch)

        # Rate limit
        if i + batch_size < len(texts):
            time.sleep(1)

    client.close()
    return results


def generate_locale(
    en_flat: Dict[str, str],
    target_lang: str,
    api_url: str,
    existing: Optional[Dict[str, str]] = None,
) -> Dict[str, str]:
    """Generate translations for a single language."""
    # Collect texts that need translation
    to_translate_keys = []
    to_translate_texts = []

    for key, value in en_flat.items():
        # Skip if already translated in existing locale
        if existing and key in existing and existing[key] != value:
            continue
        if should_translate(key, value):
            to_translate_keys.append(key)
            to_translate_texts.append(value)

    if not to_translate_texts:
        print(f"  [{target_lang}] Nothing new to translate")
        return existing or {}

    print(f"  [{target_lang}] Translating {len(to_translate_texts)} strings...")
    translated = batch_translate(to_translate_texts, target_lang, api_url)

    # Build result — start with existing translations
    result = dict(existing) if existing else {}

    # Add new translations
    for key, original, trans in zip(to_translate_keys, to_translate_texts, translated):
        # Preserve interpolation variables {{var}}
        import re
        vars_in_original = re.findall(r"\{\{[\w]+\}\}", original)
        for var in vars_in_original:
            if var not in trans:
                trans += f" {var}"
        result[key] = trans

    # Copy over untranslatable values as-is
    for key, value in en_flat.items():
        if key not in result:
            result[key] = value

    return result


def main():
    parser = argparse.ArgumentParser(description="Generate i18n translations using Bhashini NMT")
    parser.add_argument("--api-url", default="https://api.civitro.com", help="API base URL")
    parser.add_argument("--langs", nargs="*", help="Specific languages to generate (default: all)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be translated without calling API")
    args = parser.parse_args()

    # Read English source
    en_file = LOCALES_DIR / "en.json"
    if not en_file.exists():
        print(f"Error: {en_file} not found")
        sys.exit(1)

    with open(en_file, "r", encoding="utf-8") as f:
        en_data = json.load(f)

    en_flat = flatten_json(en_data)
    print(f"Source: {len(en_flat)} strings from en.json")

    languages = args.langs or TARGET_LANGUAGES

    for lang in languages:
        print(f"\n--- {lang} ---")

        # Load existing locale if present
        locale_file = LOCALES_DIR / f"{lang}.json"
        existing_flat = {}
        if locale_file.exists():
            with open(locale_file, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
            existing_flat = flatten_json(existing_data)
            print(f"  Existing: {len(existing_flat)} strings")

        if args.dry_run:
            new_count = sum(
                1 for k, v in en_flat.items()
                if k not in existing_flat and should_translate(k, v)
            )
            print(f"  Would translate: {new_count} new strings")
            continue

        # Generate translations
        translated_flat = generate_locale(en_flat, lang, args.api_url, existing_flat)

        # Write output
        output = unflatten_json(translated_flat)
        with open(locale_file, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
            f.write("\n")

        print(f"  Written: {locale_file} ({len(translated_flat)} strings)")

    print("\nDone!")


if __name__ == "__main__":
    main()
