import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import mr from './locales/mr.json';
import bn from './locales/bn.json';
import gu from './locales/gu.json';
import pa from './locales/pa.json';
import or_ from './locales/or.json';
import as_ from './locales/as.json';
import ur from './locales/ur.json';
import sa from './locales/sa.json';
import ks from './locales/ks.json';
import ne from './locales/ne.json';

const LANGUAGE_KEY = '@civitro_settings';

// Load saved language preference
const getStoredLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.language || 'en';
    }
  } catch {}
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      te: { translation: te },
      kn: { translation: kn },
      ml: { translation: ml },
      mr: { translation: mr },
      bn: { translation: bn },
      gu: { translation: gu },
      pa: { translation: pa },
      or: { translation: or_ },
      as: { translation: as_ },
      ur: { translation: ur },
      sa: { translation: sa },
      ks: { translation: ks },
      ne: { translation: ne },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Async init: set the stored language after i18n is ready
getStoredLanguage().then(lang => {
  if (lang !== 'en') {
    i18n.changeLanguage(lang);
  }
});

export default i18n;
