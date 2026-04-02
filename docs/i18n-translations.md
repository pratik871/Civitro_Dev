# Civitro — Internationalization (i18n) Guide

## Overview
Civitro supports 16 Indian languages using a hybrid approach:
- **Static UI labels** — pre-translated via i18n JSON files (instant, offline)
- **Dynamic content** — auto-translated at runtime via Bhashini NMT (issues, voices, comments, messages)

## Supported Languages

| Code | Language | Script |
|------|----------|--------|
| en | English | Latin |
| hi | Hindi | Devanagari |
| mr | Marathi | Devanagari |
| ta | Tamil | Tamil |
| te | Telugu | Telugu |
| kn | Kannada | Kannada |
| ml | Malayalam | Malayalam |
| bn | Bengali | Bengali |
| gu | Gujarati | Gujarati |
| pa | Punjabi | Gurmukhi |
| or | Odia | Odia |
| as | Assamese | Bengali |
| ur | Urdu | Arabic |
| sa | Sanskrit | Devanagari |
| ks | Kashmiri | Arabic |
| ne | Nepali | Devanagari |

## Architecture

### Static Labels (i18n)
- **Library:** react-i18next
- **Locale files:** `frontend/mobile/src/i18n/locales/{lang}.json`
- **Pattern:** `t('section.key', 'English fallback')`
- **Total keys:** 827+ per language
- **Sections:** common, tabs, auth, home, issues, leaders, actions, voices, messages, notifications, polls, promises, search, trending, map, chi, profile, settings, budget, datamine, organizations, leaderProfile, leaderDashboard, reps, dashboard

### Dynamic Content Translation
- **Service:** Bhashini NMT container (IndicTrans2, port 8025)
- **Proxy:** Translation service (port 8021) routes to Bhashini
- **Client cache:** AsyncStorage-backed with batch API support (`translationCache.ts`)
- **Backend integration:** All Go services use `pkg/translate` client for auto-translation

### Name Transliteration
- **Dictionary-based** (instant, no API call): `lib/transliterate.ts`
- Covers 60+ common Indian first/last names
- Separate governance title translation dictionary (25+ terms per language)

## How Translation Works

### On App Launch
1. App reads saved language from AsyncStorage
2. i18n initializes with that language (no English flash)
3. Static labels render instantly from JSON files

### For Dynamic Content (Issues, Voices, etc.)
1. Content stored in English on backend (`text_en` column)
2. On read: if `?lang=xx` param or `Accept-Language` header differs, backend translates on-the-fly
3. Mobile: `TranslateButton` component lets users tap to translate
4. Translations cached locally in AsyncStorage (persist across app restarts)

### For Notifications
- Backend detects user's `preferred_language`
- Translates notification title + body before sending push

### For Messages
- Backend detects sender's language
- If recipient has different preferred language, stores `translated_text` alongside original

## Adding New Strings

### 1. Add to the screen/component
```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
// ...
<Text>{t('section.newKey', 'English fallback text')}</Text>
```

### 2. Add English key to en.json
```json
{
  "section": {
    "newKey": "English fallback text"
  }
}
```

### 3. Generate translations for all languages
```bash
# Install dependency (first time only)
pip install httpx

# Generate all 15 languages (translates only NEW strings)
python3 scripts/generate-translations.py

# Generate specific languages
python3 scripts/generate-translations.py --langs hi mr ta

# Dry run (see what would be translated)
python3 scripts/generate-translations.py --dry-run
```

### 4. Alternatively, extract English fallbacks from code automatically
If you added `t('key', 'fallback')` calls without updating en.json, run:
```bash
python3 -c "
import json, re, glob

with open('frontend/mobile/src/i18n/locales/en.json') as f:
    en = json.load(f)

pattern = re.compile(r\"\"\"t\(\s*['\"]([\\w.]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*(?:,\s*\{[^}]*\})?\s*\)\"\"\")

for filepath in glob.glob('frontend/mobile/src/**/*.tsx', recursive=True):
    with open(filepath) as f:
        for match in pattern.finditer(f.read()):
            parts = match.group(1).split('.')
            d = en
            for p in parts[:-1]:
                d = d.setdefault(p, {})
            d.setdefault(parts[-1], match.group(2))

with open('frontend/mobile/src/i18n/locales/en.json', 'w') as f:
    json.dump(en, f, indent=2, ensure_ascii=False)
    f.write('\n')
"
```
Then run `python3 scripts/generate-translations.py` to translate the new keys.

## Translation Script Details

**File:** `scripts/generate-translations.py`

### How it works:
1. Reads `en.json` as source (827+ English strings)
2. For each target language, loads existing `{lang}.json`
3. Identifies strings that need translation (new or untranslated)
4. Sends texts in batches of 10 to Bhashini NMT API (`/api/v1/translate/batch`)
5. Preserves interpolation variables (`{{count}}`, `{{name}}`, etc.)
6. Writes updated JSON file

### Strings that are NOT translated:
- Brand names: "Civitro", "DEMOCRACY", "YOU SHAPE"
- Technical values: "+91", party abbreviations (BJP, INC)
- Interpolation-only values: "{{count}}"
- Very short strings (2 chars or less)

### Performance:
- Uses Bhashini NMT running on EC2 (CPU inference)
- ~2-3 seconds per string, batched in groups of 10
- Full generation for all 15 languages: ~30-45 minutes
- Incremental updates (new strings only): much faster

## Bhashini NMT Container

**Docker image:** `infra-bhashini` (23GB with models baked in)
**Port:** 8025
**Models:** AI4Bharat IndicTrans2 (distilled, 200-320M params)
- `indictrans2-en-indic-dist-200M` (English → Indian languages)
- `indictrans2-indic-en-dist-200M` (Indian languages → English)
- `indictrans2-indic-indic-dist-320M` (between Indian languages)

**Key features:**
- Fully offline — no internet calls at runtime
- Models baked into Docker image at build time
- `HF_HUB_OFFLINE=1` ensures zero external access
- 4GB memory limit, 2 CPU threads

### API Endpoints:
```
POST /bhashini/translate        — single text
POST /bhashini/batch-translate  — batch (up to 50)
POST /bhashini/detect-language  — detect from text
GET  /bhashini/languages        — list supported languages
GET  /health                    — health check
```

## Translation Cache (Mobile)

**File:** `frontend/mobile/src/lib/translationCache.ts`

- **Storage:** AsyncStorage (persistent across app restarts)
- **Capacity:** 1000 entries (auto-prunes oldest)
- **Functions:**
  - `translateCached(text, targetLang)` — single text with cache
  - `batchTranslate(texts, targetLang)` — batch with cache (one API call for uncached)
  - `initTranslationCache()` — load cache from disk at startup

### First load behavior:
1. Check AsyncStorage cache for each text
2. Send only uncached texts to API in one batch
3. Store results in memory + disk
4. Subsequent loads: instant from cache

## File Structure
```
frontend/mobile/src/
  i18n/
    index.ts              — i18n initialization (waits for stored language)
    locales/
      en.json             — English (source of truth, 827+ keys)
      hi.json             — Hindi (manually + auto-generated)
      mr.json             — Marathi (auto-generated via Bhashini)
      ta.json             — Tamil
      te.json             — Telugu
      kn.json             — Kannada
      ml.json             — Malayalam
      bn.json             — Bengali
      gu.json             — Gujarati
      pa.json             — Punjabi
      or.json             — Odia
      as.json             — Assamese
      ur.json             — Urdu
      sa.json             — Sanskrit
      ks.json             — Kashmiri
      ne.json             — Nepali
  lib/
    transliterate.ts      — Dictionary-based name transliteration
    translationCache.ts   — AsyncStorage translation cache + batch API
  hooks/
    useTranslate.ts       — React hooks for translation
  components/ui/
    TranslateButton.tsx   — "Translate" button + InlineTranslateLink
    TranslatedText.tsx    — Auto-translating text component

backend/pkg/
  translate/
    translate.go          — Shared Go translation client

ai/services/
  bhashini/               — IndicTrans2 NMT container
  translation/            — Translation proxy service

scripts/
  generate-translations.py — Batch generate locale files
```
