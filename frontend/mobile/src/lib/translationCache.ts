/**
 * Persistent translation cache + batch translate utility.
 * - Caches translations in AsyncStorage so they survive app restarts
 * - Batches multiple texts into a single API call
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const CACHE_KEY = '@civitro_translations';
const CACHE_VERSION = 1;

// In-memory cache (loaded from AsyncStorage on first access)
let memCache: Record<string, string> = {};
let loaded = false;

function cacheKey(text: string, targetLang: string): string {
  return `${targetLang}:${text}`;
}

async function loadCache() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.v === CACHE_VERSION) {
        memCache = parsed.data ?? {};
      }
    }
  } catch {}
  loaded = true;
}

async function saveCache() {
  try {
    // Keep cache under 1000 entries
    const keys = Object.keys(memCache);
    if (keys.length > 1000) {
      const toRemove = keys.slice(0, keys.length - 800);
      toRemove.forEach(k => delete memCache[k]);
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ v: CACHE_VERSION, data: memCache }));
  } catch {}
}

/** Get a cached translation. Returns undefined if not cached. */
export function getCached(text: string, targetLang: string): string | undefined {
  return memCache[cacheKey(text, targetLang)];
}

/** Store a translation in cache. */
export function setCache(text: string, targetLang: string, translated: string) {
  memCache[cacheKey(text, targetLang)] = translated;
}

/**
 * Batch translate multiple texts in a single API call.
 * Returns a map of original text → translated text.
 * Uses cache for already-translated texts, only sends uncached ones to API.
 */
export async function batchTranslate(
  texts: string[],
  targetLang: string,
  sourceLang: string = 'en',
): Promise<Record<string, string>> {
  await loadCache();

  if (targetLang === 'en' || targetLang === sourceLang) {
    return Object.fromEntries(texts.map(t => [t, t]));
  }

  const result: Record<string, string> = {};
  const uncached: string[] = [];

  // Check cache first
  for (const text of texts) {
    const cached = getCached(text, targetLang);
    if (cached) {
      result[text] = cached;
    } else {
      uncached.push(text);
    }
  }

  // Batch translate uncached texts
  if (uncached.length > 0) {
    try {
      const res = await api.post<{
        translations: Array<{ translated_text: string }>;
      }>('/api/v1/translate/batch', {
        texts: uncached,
        source_language: sourceLang,
        target_language: targetLang,
      });

      if (res.translations) {
        uncached.forEach((text, i) => {
          const translated = res.translations[i]?.translated_text ?? text;
          result[text] = translated;
          setCache(text, targetLang, translated);
        });
        // Persist to disk (async, non-blocking)
        saveCache();
      }
    } catch {
      // On error, use original text
      uncached.forEach(text => { result[text] = text; });
    }
  }

  return result;
}

/**
 * Translate a single text with caching.
 * Uses the batch endpoint under the hood.
 */
export async function translateCached(
  text: string,
  targetLang: string,
  sourceLang: string = 'en',
): Promise<string> {
  await loadCache();

  if (targetLang === 'en' || targetLang === sourceLang || !text) return text;

  const cached = getCached(text, targetLang);
  if (cached) return cached;

  try {
    const res = await api.post<{ translated_text: string }>('/api/v1/translate', {
      text,
      source_language: sourceLang,
      target_language: targetLang,
    });
    const translated = res.translated_text ?? text;
    setCache(text, targetLang, translated);
    saveCache();
    return translated;
  } catch {
    return text;
  }
}

/** Initialize cache from AsyncStorage. Call once at app startup. */
export async function initTranslationCache() {
  await loadCache();
}
