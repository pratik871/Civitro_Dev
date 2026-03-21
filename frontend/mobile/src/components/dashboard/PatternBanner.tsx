import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

const SAFFRON = '#FF6B35';
const SAFFRON_LIGHT = '#FFF3ED';

interface PatternStat {
  icon: 'location' | 'calendar' | 'damage';
  value: string;
  label: string;
  valueColor?: string;
}

interface PatternBannerProps {
  description: string;
  stats?: PatternStat[];
  onStartAction?: () => void;
  onViewEvidence?: () => void;
}

export const PatternBanner: React.FC<PatternBannerProps> = ({
  description = '12 water leak reports in your ward this month — 0 resolved',
  stats = [
    { icon: 'location', value: '8', label: 'locations' },
    { icon: 'calendar', value: '23', label: 'days unresolved' },
    { icon: 'damage', value: '\u20B918.2L', label: 'est. damage', valueColor: '#0F766E' },
  ],
  onStartAction,
  onViewEvidence,
}) => {
  const renderStatIcon = (icon: string) => {
    switch (icon) {
      case 'location':
        return (
          <Svg viewBox="0 0 12 12" width={12} height={12} fill="none">
            <Path
              d="M6 1C3.24 1 1 3.24 1 6c0 3.31 5 5 5 5s5-1.69 5-5c0-2.76-2.24-5-5-5z"
              stroke={colors.textMuted}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <Circle cx={6} cy={6} r={1.5} stroke={colors.textMuted} strokeWidth={1.5} />
          </Svg>
        );
      case 'calendar':
        return (
          <Svg viewBox="0 0 12 12" width={12} height={12} fill="none">
            <Rect x={1} y={1} width={10} height={10} rx={1} stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M1 5h10" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M4 1v3M8 1v3" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        );
      case 'damage':
        return (
          <Svg viewBox="0 0 12 12" width={12} height={12} fill="none">
            <Path d="M6 1v6l3 3" stroke="#0F766E" strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Svg viewBox="0 0 16 16" width={16} height={16} fill="none">
            <Path d="M8 1v4M8 11v4M1 8h4M11 8h4" stroke={SAFFRON} strokeWidth={2} strokeLinecap="round" />
            <Circle cx={8} cy={8} r={3} stroke={SAFFRON} strokeWidth={2} />
          </Svg>
        </View>
        <Text style={styles.label}>Pattern Detected</Text>
      </View>

      {/* Body */}
      <Text style={styles.description}>{description}</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        {stats.map((stat, i) => (
          <View key={i} style={styles.statItem}>
            {renderStatIcon(stat.icon)}
            <Text style={[styles.statValue, stat.valueColor ? { color: stat.valueColor } : null]}>
              {stat.value}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onStartAction} activeOpacity={0.7}>
          <Text style={styles.primaryBtnText}>Start Community Action</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onViewEvidence} activeOpacity={0.7}>
          <Text style={styles.secondaryBtnText}>View Evidence</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: SAFFRON + '40',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SAFFRON_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: SAFFRON,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: SAFFRON,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
