import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useSettingsStore } from '../stores/settingsStore';

interface TranslateResponse {
  translated_text: string;
  source_language: string;
  target_language: string;
  confidence: number;
}

interface BatchTranslateResponse {
  translations: TranslateResponse[];
}

/**
 * Quick client-side check: does this text appear to already be in the target language?
 * Avoids unnecessary API calls for the common case (English text + English app).
 */
function looksLikeLanguage(text: string, lang: string): boolean {
  if (!text || text.length < 3) return false;
  const sample = text.slice(0, 200);

  if (lang === 'en') {
    // Mostly ASCII letters → likely English
    const ascii = sample.split('').filter(c => /[a-zA-Z]/.test(c)).length;
    return ascii > sample.replace(/\s/g, '').length * 0.6;
  }
  // Devanagari script → hi, mr, sa, ne
  if (['hi', 'mr', 'sa', 'ne'].includes(lang)) {
    return /[\u0900-\u097F]/.test(sample);
  }
  if (lang === 'ta') return /[\u0B80-\u0BFF]/.test(sample);
  if (lang === 'te') return /[\u0C00-\u0C7F]/.test(sample);
  if (lang === 'kn') return /[\u0C80-\u0CFF]/.test(sample);
  if (lang === 'ml') return /[\u0D00-\u0D7F]/.test(sample);
  if (['bn', 'as'].includes(lang)) return /[\u0980-\u09FF]/.test(sample);
  if (lang === 'gu') return /[\u0A80-\u0AFF]/.test(sample);
  if (lang === 'pa') return /[\u0A00-\u0A7F]/.test(sample);
  if (lang === 'or') return /[\u0B00-\u0B7F]/.test(sample);
  if (lang === 'ur') return /[\u0600-\u06FF]/.test(sample);
  return false;
}

/**
 * Hook to translate a single text string.
 * Returns original text if app language matches source or if translation fails.
 */
export function useTranslateText(text: string | undefined, sourceLanguage?: string) {
  const appLanguage = useSettingsStore(state => state.language);
  const sourceLang = sourceLanguage || 'auto';

  // Skip translation if:
  // 1. Text is empty
  // 2. We explicitly know source equals target
  // 3. Text already looks like it's in the target language (client-side heuristic)
  const shouldTranslate = Boolean(
    text &&
    text.trim().length > 0 &&
    !(sourceLang !== 'auto' && sourceLang === appLanguage) &&
    !(sourceLang === 'auto' && looksLikeLanguage(text, appLanguage))
  );

  const query = useQuery<TranslateResponse>({
    queryKey: ['translate', text, sourceLang, appLanguage],
    queryFn: () =>
      api.post<TranslateResponse>('/api/v1/translate', {
        text,
        source_language: sourceLang,
        target_language: appLanguage,
      }),
    enabled: shouldTranslate,
    staleTime: Infinity, // translations don't change
    gcTime: 24 * 60 * 60 * 1000, // cache for 24 hours
    retry: 1,
  });

  return {
    translatedText: query.data?.translated_text || text || '',
    isTranslating: query.isLoading && shouldTranslate,
    isTranslated: Boolean(query.data && query.data.translated_text !== text),
    sourceLanguage: query.data?.source_language || sourceLang,
    originalText: text || '',
  };
}

/**
 * Hook to batch translate multiple texts.
 */
export function useBatchTranslate(texts: string[], sourceLanguage?: string) {
  const appLanguage = useSettingsStore(state => state.language);
  const sourceLang = sourceLanguage || 'auto';

  const shouldTranslate = texts.length > 0 && !(sourceLang !== 'auto' && sourceLang === appLanguage);

  const query = useQuery<BatchTranslateResponse>({
    queryKey: ['translate-batch', texts, sourceLang, appLanguage],
    queryFn: () =>
      api.post<BatchTranslateResponse>('/api/v1/translate/batch', {
        texts,
        source_language: sourceLang,
        target_language: appLanguage,
      }),
    enabled: shouldTranslate,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  return {
    translations: query.data?.translations?.map(t => t.translated_text) || texts,
    isTranslating: query.isLoading && shouldTranslate,
  };
}
