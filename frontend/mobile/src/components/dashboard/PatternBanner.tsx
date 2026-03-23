import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        <Text style={styles.label}>{t('home.patternDetected')}</Text>
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
          <Text style={styles.primaryBtnText}>{t('home.startCommunityAction')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onViewEvidence} activeOpacity={0.7}>
          <Text style={styles.secondaryBtnText}>{t('home.viewEvidence')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: 16,
    borderWidth: 2,
    borderColor: SAFFRON,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: SAFFRON_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    backgroundColor: SAFFRON,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  description: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: SAFFRON,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: SAFFRON,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
