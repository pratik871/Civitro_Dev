import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { RatingBreakdown as RatingBreakdownType } from '../../types/leader';

interface RatingBreakdownProps {
  breakdown: RatingBreakdownType;
}

const RATING_LABELS: Record<keyof RatingBreakdownType, string> = {
  responsiveness: 'Responsiveness',
  transparency: 'Transparency',
  deliveryOnPromises: 'Delivery on Promises',
  accessibility: 'Accessibility',
  overallImpact: 'Overall Impact',
};

export const RatingBreakdown: React.FC<RatingBreakdownProps> = ({
  breakdown,
}) => {
  const entries = Object.entries(breakdown) as [keyof RatingBreakdownType, number][];

  return (
    <View style={styles.container}>
      {entries.map(([key, value]) => {
        const percentage = (value / 5) * 100;
        const barColor =
          value >= 4
            ? colors.success
            : value >= 3
            ? colors.warning
            : value >= 2
            ? colors.primary
            : colors.error;

        return (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{RATING_LABELS[key]}</Text>
            <View style={styles.barContainer}>
              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${percentage}%`, backgroundColor: barColor },
                  ]}
                />
              </View>
              <Text style={styles.valueText}>{value.toFixed(1)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    width: 28,
    textAlign: 'right',
  },
});
