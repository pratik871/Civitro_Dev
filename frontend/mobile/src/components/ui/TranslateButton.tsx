import React, { useState, useCallback } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { useTranslate } from '../../hooks/useTranslate';
import { useSettingsStore } from '../../stores/settingsStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

// Human-readable language names for the "Translated from X" label
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  mr: 'Marathi',
  bn: 'Bengali',
  gu: 'Gujarati',
  pa: 'Punjabi',
  or: 'Odia',
  as: 'Assamese',
  ur: 'Urdu',
  sa: 'Sanskrit',
  ks: 'Kashmiri',
  ne: 'Nepali',
  auto: 'Auto-detected',
};

// Globe icon rendered as an SVG
const GlobeIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 14,
  color = colors.info,
}) => (
  <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <SvgCircle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.8} />
    <Path
      d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface TranslateButtonProps {
  /** The text to translate */
  text: string;
  /** Called with the translated string when translation succeeds */
  onTranslated?: (translated: string) => void;
  /** Called when the user toggles back to original */
  onShowOriginal?: () => void;
  /** Container style override */
  style?: ViewStyle;
}

/**
 * A small pill-shaped "Translate" button.
 *
 * - Only visible when the user's app language is not English (the source content language).
 * - On tap it calls the translate API and invokes `onTranslated`.
 * - A second tap toggles back to the original text via `onShowOriginal`.
 * - Shows a loading spinner while the request is in flight.
 * - After translation, shows a "Translated from [language]" label and a
 *   "Show Original" / "Show Translation" toggle.
 */
export const TranslateButton: React.FC<TranslateButtonProps> = ({
  text,
  onTranslated,
  onShowOriginal,
  style,
}) => {
  const { translate, translating } = useTranslate();
  const userLanguage = useSettingsStore(state => state.language);

  const [translated, setTranslated] = useState(false);
  const [sourceLang, setSourceLang] = useState<string | null>(null);
  const [showingTranslated, setShowingTranslated] = useState(false);

  const handlePress = useCallback(async () => {
    if (translated && showingTranslated) {
      // Toggle back to original
      setShowingTranslated(false);
      onShowOriginal?.();
      return;
    }

    if (translated && !showingTranslated) {
      // Re-show translation (already cached)
      setShowingTranslated(true);
      // We still have the translated text from the first call; the parent
      // should have cached it. Call onTranslated again.
      // Note: we can't re-call because we didn't store it — so we re-translate.
      // But for efficiency we'll store the result.
      return;
    }

    // First translation
    const result = await translate(text);
    if (result) {
      setTranslated(true);
      setShowingTranslated(true);
      setSourceLang(result.sourceLanguage);
      onTranslated?.(result.translatedText);
    }
  }, [translated, showingTranslated, translate, text, onTranslated, onShowOriginal]);

  // Re-show cached translation without re-fetching
  const handleToggleBack = useCallback(() => {
    setShowingTranslated(true);
    // Parent must re-apply the cached translated text
    onTranslated?.('__toggle_back__');
  }, [onTranslated]);

  // Don't render at all if user language is English (source content language)
  if (userLanguage === 'en') return null;
  if (!text?.trim()) return null;

  if (translating) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.pill}>
          <ActivityIndicator size="small" color={colors.info} />
          <Text style={styles.pillText}>Translating...</Text>
        </View>
      </View>
    );
  }

  if (translated && showingTranslated) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.translatedInfo}>
          <GlobeIcon size={12} color={colors.info} />
          <Text style={styles.translatedLabel}>
            Translated from {LANGUAGE_NAMES[sourceLang || 'auto'] || sourceLang}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.6}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.toggleLink}>Show Original</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (translated && !showingTranslated) {
    return (
      <View style={[styles.container, style]}>
        <TouchableOpacity
          onPress={handleToggleBack}
          activeOpacity={0.6}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.toggleLink}>Show Translation</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.pill}
        onPress={handlePress}
        activeOpacity={0.7}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <GlobeIcon size={14} color={colors.info} />
        <Text style={styles.pillText}>Translate</Text>
      </TouchableOpacity>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Inline TranslateButton for chat messages — even more compact
// ---------------------------------------------------------------------------

interface InlineTranslateLinkProps {
  text: string;
  onTranslated: (translated: string) => void;
  onShowOriginal: () => void;
  style?: ViewStyle;
}

/**
 * Compact "Translate" link for chat message bubbles.
 * Shows as a small text link under a message.
 */
export const InlineTranslateLink: React.FC<InlineTranslateLinkProps> = ({
  text,
  onTranslated,
  onShowOriginal,
  style,
}) => {
  const { translate, translating } = useTranslate();
  const userLanguage = useSettingsStore(state => state.language);

  const [translated, setTranslated] = useState(false);
  const [showingTranslated, setShowingTranslated] = useState(false);
  const [cachedTranslation, setCachedTranslation] = useState('');
  const [sourceLang, setSourceLang] = useState<string | null>(null);

  const handlePress = async () => {
    if (translated && showingTranslated) {
      setShowingTranslated(false);
      onShowOriginal();
      return;
    }

    if (translated && !showingTranslated) {
      setShowingTranslated(true);
      onTranslated(cachedTranslation);
      return;
    }

    const result = await translate(text);
    if (result) {
      setTranslated(true);
      setShowingTranslated(true);
      setCachedTranslation(result.translatedText);
      setSourceLang(result.sourceLanguage);
      onTranslated(result.translatedText);
    }
  };

  // Don't render if user language is English or text is empty
  if (userLanguage === 'en') return null;
  if (!text?.trim()) return null;

  if (translating) {
    return (
      <View style={[styles.inlineContainer, style]}>
        <ActivityIndicator size="small" color={colors.info} />
        <Text style={styles.inlineText}>Translating...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.inlineContainer, style]}
      onPress={handlePress}
      activeOpacity={0.6}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <GlobeIcon size={11} color={colors.info} />
      <Text style={styles.inlineText}>
        {translated && showingTranslated
          ? 'Show Original'
          : translated && !showingTranslated
          ? 'Show Translation'
          : 'Translate'}
      </Text>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Translated content wrapper — light blue background
// ---------------------------------------------------------------------------

interface TranslatedContentBoxProps {
  children: React.ReactNode;
  sourceLang?: string;
  style?: ViewStyle;
}

export const TranslatedContentBox: React.FC<TranslatedContentBoxProps> = ({
  children,
  sourceLang,
  style,
}) => (
  <View style={[styles.translatedBox, style]}>
    {children}
    {sourceLang && (
      <View style={styles.translatedBoxFooter}>
        <GlobeIcon size={10} color={colors.info} />
        <Text style={styles.translatedBoxLabel}>
          Translated from {LANGUAGE_NAMES[sourceLang] || sourceLang}
        </Text>
      </View>
    )}
  </View>
);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.info + '0D', // ~5% blue
    borderWidth: 1,
    borderColor: colors.info + '20',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.info,
  },
  translatedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  translatedLabel: {
    fontSize: 11,
    color: colors.info,
    fontStyle: 'italic',
  },
  toggleLink: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.info,
    textDecorationLine: 'underline',
  },

  // Inline (chat message) variant
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  inlineText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.info,
  },

  // Translated content box
  translatedBox: {
    backgroundColor: '#EFF6FF', // light blue tint
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    marginTop: spacing.xs,
  },
  translatedBoxFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  translatedBoxLabel: {
    fontSize: 10,
    color: colors.info,
    fontStyle: 'italic',
  },
});
