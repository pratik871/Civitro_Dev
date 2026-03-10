export interface LanguageConfig {
  /** BCP-47 language code. */
  code: string;
  /** English name. */
  name: string;
  /** Name in the language's own script. */
  nativeName: string;
  /** Script system used. */
  script: string;
}

/** 15 supported Indian languages (plus English). */
export const LANGUAGES: readonly LanguageConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English', script: 'Latin' },
  { code: 'hi', name: 'Hindi', nativeName: '\u0939\u093F\u0928\u094D\u0926\u0940', script: 'Devanagari' },
  { code: 'ta', name: 'Tamil', nativeName: '\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD', script: 'Tamil' },
  { code: 'te', name: 'Telugu', nativeName: '\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41', script: 'Telugu' },
  { code: 'kn', name: 'Kannada', nativeName: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1', script: 'Kannada' },
  { code: 'ml', name: 'Malayalam', nativeName: '\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02', script: 'Malayalam' },
  { code: 'mr', name: 'Marathi', nativeName: '\u092E\u0930\u093E\u0920\u0940', script: 'Devanagari' },
  { code: 'bn', name: 'Bengali', nativeName: '\u09AC\u09BE\u0982\u09B2\u09BE', script: 'Bengali' },
  { code: 'gu', name: 'Gujarati', nativeName: '\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0', script: 'Gujarati' },
  { code: 'pa', name: 'Punjabi', nativeName: '\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40', script: 'Gurmukhi' },
  { code: 'or', name: 'Odia', nativeName: '\u0B13\u0B21\u0B3C\u0B3F\u0B06', script: 'Odia' },
  { code: 'as', name: 'Assamese', nativeName: '\u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE', script: 'Bengali' },
  { code: 'ur', name: 'Urdu', nativeName: '\u0627\u0631\u062F\u0648', script: 'Nastaliq' },
  { code: 'sa', name: 'Sanskrit', nativeName: '\u0938\u0902\u0938\u094D\u0915\u0943\u0924\u092E\u094D', script: 'Devanagari' },
  { code: 'ks', name: 'Kashmiri', nativeName: '\u0915\u0949\u0936\u0941\u0930', script: 'Devanagari' },
] as const;

/** Lookup map from language code to config. */
export const LANGUAGE_MAP: Record<string, LanguageConfig> =
  LANGUAGES.reduce(
    (acc, lang) => {
      acc[lang.code] = lang;
      return acc;
    },
    {} as Record<string, LanguageConfig>,
  );

/** Default language code. */
export const DEFAULT_LANGUAGE = 'en';
