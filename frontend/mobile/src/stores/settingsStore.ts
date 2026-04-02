import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  language: string; // BCP-47 code, default 'en'
  darkMode: boolean;
  autoTranslate: boolean; // When true, content is automatically translated on display
  privacySettings: {
    showProfilePublicly: boolean;
    allowAnonymousVoices: boolean;
    showCivicScore: boolean;
    locationSharing: boolean;
    dataAnalytics: boolean;
  };
  isLoaded: boolean;
  setLanguage: (code: string) => Promise<void>;
  setDarkMode: (enabled: boolean) => Promise<void>;
  setAutoTranslate: (enabled: boolean) => Promise<void>;
  updatePrivacy: (key: string, value: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const SETTINGS_KEY = '@civitro_settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'en',
  darkMode: false,
  autoTranslate: false,
  privacySettings: {
    showProfilePublicly: true,
    allowAnonymousVoices: false,
    showCivicScore: true,
    locationSharing: true,
    dataAnalytics: true,
  },
  isLoaded: false,

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({ ...parsed, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  setDarkMode: async (enabled: boolean) => {
    set({ darkMode: enabled });
    const state = get();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
      language: state.language,
      darkMode: enabled,
      autoTranslate: state.autoTranslate,
      privacySettings: state.privacySettings,
    }));
  },

  setLanguage: async (code: string) => {
    set({ language: code });
    const state = get();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
      language: state.language,
      autoTranslate: state.autoTranslate,
      privacySettings: state.privacySettings,
    }));
  },

  setAutoTranslate: async (enabled: boolean) => {
    set({ autoTranslate: enabled });
    const state = get();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
      language: state.language,
      darkMode: state.darkMode,
      autoTranslate: enabled,
      privacySettings: state.privacySettings,
    }));
  },

  updatePrivacy: async (key: string, value: boolean) => {
    const current = get().privacySettings;
    const updated = { ...current, [key]: value };
    set({ privacySettings: updated });
    const state = get();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
      language: state.language,
      autoTranslate: state.autoTranslate,
      privacySettings: updated,
    }));
  },
}));
