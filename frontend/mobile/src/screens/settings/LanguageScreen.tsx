import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';
import api from '../../lib/api';

// ---------------------------------------------------------------------------
// Bhashini language data with capabilities
// ---------------------------------------------------------------------------

interface LanguageEntry {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  capabilities: readonly string[];
}

const BHASHINI_LANGUAGES: readonly LanguageEntry[] = [
  { code: 'en', name: 'English',   nativeName: 'English',      script: 'Latin',      capabilities: ['ASR', 'NMT', 'TTS'] },
  { code: 'hi', name: 'Hindi',     nativeName: '\u0939\u093F\u0928\u094D\u0926\u0940',        script: 'Devanagari', capabilities: ['ASR', 'NMT', 'TTS', 'OCR'] },
  { code: 'ta', name: 'Tamil',     nativeName: '\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD',       script: 'Tamil',      capabilities: ['ASR', 'NMT', 'TTS', 'OCR'] },
  { code: 'te', name: 'Telugu',    nativeName: '\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41',      script: 'Telugu',     capabilities: ['ASR', 'NMT', 'TTS'] },
  { code: 'kn', name: 'Kannada',   nativeName: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1',       script: 'Kannada',    capabilities: ['ASR', 'NMT', 'TTS'] },
  { code: 'ml', name: 'Malayalam', nativeName: '\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02',    script: 'Malayalam',  capabilities: ['ASR', 'NMT', 'TTS'] },
  { code: 'mr', name: 'Marathi',   nativeName: '\u092E\u0930\u093E\u0920\u0940',       script: 'Devanagari', capabilities: ['ASR', 'NMT', 'TTS', 'OCR'] },
  { code: 'bn', name: 'Bengali',   nativeName: '\u09AC\u09BE\u0982\u09B2\u09BE',       script: 'Bengali',    capabilities: ['ASR', 'NMT', 'TTS', 'OCR'] },
  { code: 'gu', name: 'Gujarati',  nativeName: '\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0',   script: 'Gujarati',   capabilities: ['ASR', 'NMT', 'TTS'] },
  { code: 'pa', name: 'Punjabi',   nativeName: '\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40',     script: 'Gurmukhi',   capabilities: ['ASR', 'NMT', 'TTS'] },
  { code: 'or', name: 'Odia',      nativeName: '\u0B13\u0B21\u0B3C\u0B3F\u0B06',      script: 'Odia',       capabilities: ['ASR', 'NMT'] },
  { code: 'as', name: 'Assamese',  nativeName: '\u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE',    script: 'Bengali',    capabilities: ['NMT'] },
  { code: 'ur', name: 'Urdu',      nativeName: '\u0627\u0631\u062F\u0648',         script: 'Nastaliq',   capabilities: ['ASR', 'NMT', 'TTS'] },
  { code: 'sa', name: 'Sanskrit',  nativeName: '\u0938\u0902\u0938\u094D\u0915\u0943\u0924\u092E\u094D',  script: 'Devanagari', capabilities: ['NMT'] },
  { code: 'ks', name: 'Kashmiri',  nativeName: '\u06A9\u0627\u0634\u064F\u0631',       script: 'Devanagari', capabilities: ['NMT'] },
  { code: 'ne', name: 'Nepali',    nativeName: '\u0928\u0947\u092A\u093E\u0932\u0940',      script: 'Devanagari', capabilities: ['NMT'] },
] as const;

// ---------------------------------------------------------------------------
// Capability badge colours
// ---------------------------------------------------------------------------

const CAPABILITY_COLORS: Record<string, { bg: string; text: string }> = {
  ASR: { bg: '#EFF6FF', text: '#2563EB' },
  NMT: { bg: '#F0FDF4', text: '#059669' },
  TTS: { bg: '#FFF7ED', text: '#D97706' },
  OCR: { bg: '#FDF2F8', text: '#DB2777' },
};

const CAPABILITY_LABELS: Record<string, string> = {
  ASR: 'Speech',
  NMT: 'Translate',
  TTS: 'Voice',
  OCR: 'Scan',
};

// ---------------------------------------------------------------------------
// Screen dimensions for 2-column grid
// ---------------------------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = spacing.md;
const HORIZONTAL_PADDING = spacing.lg;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LanguageScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore(state => state.language);
  const setLanguage = useSettingsStore(state => state.setLanguage);

  const currentLang = useMemo(
    () => BHASHINI_LANGUAGES.find(l => l.code === language) ?? BHASHINI_LANGUAGES[0],
    [language],
  );

  const handleSelectLanguage = async (code: string) => {
    await setLanguage(code);
    // Switch the app's UI language
    i18n.changeLanguage(code);
    // Persist to backend (fire-and-forget)
    api.put('/api/v1/auth/language', { language: code }).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backArrow}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.language')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current language banner */}
        <View style={styles.currentBanner}>
          <View style={styles.currentBannerLeft}>
            <Text style={styles.currentLabel}>{t('settings.currentLanguage')}</Text>
            <Text style={styles.currentNative}>{currentLang.nativeName}</Text>
            <Text style={styles.currentEnglish}>
              {currentLang.name} &middot; {currentLang.script}
            </Text>
          </View>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>{'\u2713'}</Text>
          </View>
        </View>

        {/* Section title */}
        <Text style={styles.sectionTitle}>{t('settings.allLanguages')}</Text>
        <Text style={styles.sectionSubtitle}>
          {t('settings.chooseLanguage')}
        </Text>

        {/* 2-column grid */}
        <View style={styles.grid}>
          {BHASHINI_LANGUAGES.map(lang => {
            const isSelected = lang.code === language;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageCard,
                  isSelected && styles.languageCardSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedCheck}>{'\u2713'}</Text>
                  </View>
                )}

                {/* Native name — prominent */}
                <Text
                  style={[
                    styles.nativeName,
                    isSelected && styles.nativeNameSelected,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {lang.nativeName}
                </Text>

                {/* English name */}
                <Text style={styles.englishName}>{lang.name}</Text>

                {/* Script */}
                <Text style={styles.scriptName}>{lang.script}</Text>

                {/* Capability badges */}
                <View style={styles.capabilityRow}>
                  {lang.capabilities.map(cap => {
                    const capColor = CAPABILITY_COLORS[cap] ?? {
                      bg: colors.borderLight,
                      text: colors.textMuted,
                    };
                    return (
                      <View
                        key={cap}
                        style={[styles.capBadge, { backgroundColor: capColor.bg }]}
                      >
                        <Text style={[styles.capBadgeText, { color: capColor.text }]}>
                          {CAPABILITY_LABELS[cap] ?? cap}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bhashini badge */}
        <View style={styles.bhashiniContainer}>
          <View style={styles.bhashiniDivider} />
          <View style={styles.bhashiniBadge}>
            <Text style={styles.bhashiniPowered}>{t('settings.poweredBy')}</Text>
            <Text style={styles.bhashiniName}>Bhashini</Text>
            <Text style={styles.bhashiniDesc}>
              {t('settings.bhashiniDesc')}
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  backArrow: {
    fontSize: 26,
    color: colors.textPrimary,
    marginTop: -2,
    lineHeight: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 36,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: spacing.lg,
  },

  // Current language banner
  currentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '0D', // 5% opacity saffron
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  currentBannerLeft: {
    flex: 1,
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  currentNative: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  currentEnglish: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },

  // Section
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Language card
  languageCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: CARD_GAP,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    position: 'relative',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  languageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08', // subtle saffron tint
    shadowOpacity: 0.08,
    elevation: 2,
  },

  // Selected badge (top-right checkmark)
  selectedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheck: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Language text
  nativeName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginRight: spacing.xl, // leave room for checkmark
  },
  nativeNameSelected: {
    color: colors.primary,
  },
  englishName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  scriptName: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },

  // Capabilities
  capabilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.xs,
  },
  capBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  capBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Bhashini badge
  bhashiniContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  bhashiniDivider: {
    width: 60,
    height: 1,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  bhashiniBadge: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    width: '100%',
  },
  bhashiniPowered: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  bhashiniName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.info,
    marginBottom: spacing.xs,
  },
  bhashiniDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },

  bottomSpacer: {
    height: 40,
  },
});
