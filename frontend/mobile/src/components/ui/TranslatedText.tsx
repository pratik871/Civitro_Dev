import React, { useState } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, TextStyle, ViewStyle } from 'react-native';
import { useTranslateText } from '../../hooks/useTranslate';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

interface TranslatedTextProps {
  text: string;
  sourceLanguage?: string;
  style?: TextStyle;
  numberOfLines?: number;
  containerStyle?: ViewStyle;
}

export const TranslatedText: React.FC<TranslatedTextProps> = ({
  text,
  sourceLanguage,
  style,
  numberOfLines,
  containerStyle,
}) => {
  const { t } = useTranslation();
  const { translatedText, isTranslating, isTranslated, originalText } =
    useTranslateText(text, sourceLanguage);
  const [showOriginal, setShowOriginal] = useState(false);

  // Not translated — render plain text
  if (!isTranslated && !isTranslating) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  return (
    <View style={containerStyle}>
      {/* Translated text */}
      <Text
        style={[style, isTranslating && styles.translating]}
        numberOfLines={numberOfLines}
      >
        {translatedText}
      </Text>

      {/* Indicator + toggle */}
      {isTranslated && (
        <TouchableOpacity
          onPress={() => setShowOriginal(prev => !prev)}
          activeOpacity={0.6}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.indicator}>
            {t('common.translated')}
            {'  ·  '}
            {showOriginal ? t('common.hideOriginal') : t('common.showOriginal')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Original text (collapsible) */}
      {isTranslated && showOriginal && (
        <View style={styles.originalBox}>
          <Text style={styles.originalLabel}>{t('common.original')}</Text>
          <Text style={[style, styles.originalText]}>{originalText}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  translating: {
    opacity: 0.6,
  },
  indicator: {
    fontSize: 11,
    color: colors.info,
    marginTop: 4,
    fontStyle: 'italic',
  },
  originalBox: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.textMuted,
  },
  originalLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  originalText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
