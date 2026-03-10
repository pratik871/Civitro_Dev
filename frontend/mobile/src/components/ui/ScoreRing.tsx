import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  style?: ViewStyle;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  maxScore = 100,
  size = 80,
  strokeWidth = 6,
  color = colors.primary,
  backgroundColor = colors.borderLight,
  label,
  style,
}) => {
  const percentage = Math.min((score / maxScore) * 100, 100);

  // Since we cannot use SVG in bare RN without a library, we simulate
  // a ring with bordered views
  const innerSize = size - strokeWidth * 2;

  // Determine color based on score percentage
  const getScoreColor = () => {
    if (color !== colors.primary) return color;
    if (percentage >= 75) return colors.success;
    if (percentage >= 50) return colors.warning;
    if (percentage >= 25) return colors.primary;
    return colors.error;
  };

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.outerRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          },
        ]}
      >
        <View
          style={[
            styles.progressOverlay,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: getScoreColor(),
              borderTopColor:
                percentage >= 25 ? getScoreColor() : colors.transparent,
              borderRightColor:
                percentage >= 50 ? getScoreColor() : colors.transparent,
              borderBottomColor:
                percentage >= 75 ? getScoreColor() : colors.transparent,
              borderLeftColor:
                percentage >= 100 ? getScoreColor() : colors.transparent,
              transform: [{ rotate: '-45deg' }],
            },
          ]}
        />
        <View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          <Text style={[styles.scoreText, { color: getScoreColor() }]}>
            {Math.round(score)}
          </Text>
          {label && <Text style={styles.labelText}>{label}</Text>}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  outerRing: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressOverlay: {
    position: 'absolute',
  },
  inner: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
  },
  labelText: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
});
