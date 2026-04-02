import React, { useState, useCallback, useEffect } from 'react';
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
import { translateCached } from '../../lib/translationCache';
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
 * Auto-translating content button.
 *
 * When user's language is not English:
 * - Auto-translates on mount (shows translated by default)
 * - Shows "Translated" label with "Show Original" toggle
 * - Tapping "Show Original" reveals English text
 * - Tapping "Show Translated" goes back
 */
export const TranslateButton: React.FC<TranslateButtonProps> = ({
  text,
  onTranslated,
  onShowOriginal,
  style,
}) => {
  const userLanguage = useSettingsStore(state => state.language);
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [cachedTranslation, setCachedTranslation] = useState('');

  // Auto-translate on mount when language is not English
  useEffect(() => {
    if (userLanguage === 'en' || !text?.trim()) return;

    let cancelled = false;
    setLoading(true);

    translateCached(text, userLanguage, 'auto').then(result => {
      if (cancelled) return;
      setLoading(false);
      if (result && result !== text) {
        setTranslated(true);
        setCachedTranslation(result);
        onTranslated?.(result);
      }
    });

    return () => { cancelled = true; };
  }, [text, userLanguage]);

  // Don't render if user language is English
  if (userLanguage === 'en') return null;
  if (!text?.trim()) return null;

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.pill}>
          <ActivityIndicator size="small" color={colors.info} />
          <Text style={styles.pillText}>Translating...</Text>
        </View>
      </View>
    );
  }

  if (!translated) return null;

  if (!showingOriginal) {
    // Showing translated (default) — offer "Show Original"
    return (
      <View style={[styles.container, style]}>
        <View style={styles.translatedInfo}>
          <GlobeIcon size={12} color={colors.info} />
          <Text style={styles.translatedLabel}>Translated</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setShowingOriginal(true);
            onShowOriginal?.();
          }}
          activeOpacity={0.6}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.toggleLink}>Show Original</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Showing original — offer "Show Translated"
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={() => {
          setShowingOriginal(false);
          onTranslated?.(cachedTranslation);
        }}
        activeOpacity={0.6}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Text style={styles.toggleLink}>Show Translated</Text>
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
 * Compact inline translate link for chat messages.
 * Auto-translates on mount, shows "Show Original" toggle.
 */
export const InlineTranslateLink: React.FC<InlineTranslateLinkProps> = ({
  text,
  onTranslated,
  onShowOriginal,
  style,
}) => {
  const userLanguage = useSettingsStore(state => state.language);
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [cachedTranslation, setCachedTranslation] = useState('');

  // Auto-translate on mount
  useEffect(() => {
    if (userLanguage === 'en' || !text?.trim()) return;
    let cancelled = false;
    setLoading(true);
    translateCached(text, userLanguage, 'auto').then(result => {
      if (cancelled) return;
      setLoading(false);
      if (result && result !== text) {
        setTranslated(true);
        setCachedTranslation(result);
        onTranslated(result);
      }
    });
    return () => { cancelled = true; };
  }, [text, userLanguage]);

  if (userLanguage === 'en') return null;
  if (!text?.trim()) return null;

  if (loading) {
    return (
      <View style={[styles.inlineContainer, style]}>
        <ActivityIndicator size="small" color={colors.info} />
      </View>
    );
  }

  if (!translated) return null;

  return (
    <TouchableOpacity
      style={[styles.inlineContainer, style]}
      onPress={() => {
        if (showingOriginal) {
          setShowingOriginal(false);
          onTranslated(cachedTranslation);
        } else {
          setShowingOriginal(true);
          onShowOriginal();
        }
      }}
      activeOpacity={0.6}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <GlobeIcon size={11} color={colors.info} />
      <Text style={styles.inlineText}>
        {showingOriginal ? 'Show Translated' : 'Show Original'}
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
