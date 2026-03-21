import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle as SvgCircle,
} from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const STATUS_OPEN = '#EF4444';
const STATUS_PROGRESS = '#F59E0B';
const STATUS_RESOLVED = '#10B981';
const STATUS_VERIFIED = '#3B82F6';

const DONUT_SIZE = 110;
const DONUT_R = 42;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_R; // ~263.9

// Sparkline constants
const SPARK_W = 140;
const SPARK_H = 30;

// ---------------------------------------------------------------------------
interface WardDashboardChartProps {
  open: number;
  inProgress: number;
  resolved: number;
  verified: number;
  wardName?: string;
  wardArea?: string;
  rank?: number;
  totalWards?: number;
  resolutionTrend?: string;
  sparklineData?: number[];
  sparklineTrend?: string;
}

export const WardDashboardChart: React.FC<WardDashboardChartProps> = ({
  open,
  inProgress,
  resolved,
  verified,
  wardName = 'Ward 45',
  wardArea = 'Andheri East',
  rank = 12,
  totalWards = 236,
  resolutionTrend = 'up 12%',
  sparklineData = [22, 18, 20, 14, 16, 8, 4],
  sparklineTrend = '+34%',
}) => {
  const { t } = useTranslation();
  const total = open + inProgress + resolved + verified || 1;

  // Calculate donut segments (stroke-dasharray based)
  const segments = [
    { count: open, color: STATUS_OPEN, label: t('home.openIssues') },
    { count: inProgress, color: STATUS_PROGRESS, label: t('home.inProgressIssues') },
    { count: resolved, color: STATUS_RESOLVED, label: t('home.resolvedIssues') },
    { count: verified, color: STATUS_VERIFIED, label: t('home.verifiedIssues') },
  ];

  let accumulatedOffset = 0;
  const donutSegments = segments.map((seg) => {
    const fraction = seg.count / total;
    const dashLength = fraction * DONUT_CIRCUMFERENCE;
    const gap = DONUT_CIRCUMFERENCE - dashLength;
    const offset = -accumulatedOffset;
    accumulatedOffset += dashLength;
    return { ...seg, dashLength, gap, offset };
  });

  // Build sparkline path
  const sparkPath = (() => {
    if (sparklineData.length < 2) return '';
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const stepX = SPARK_W / (sparklineData.length - 1);
    return sparklineData
      .map((v, i) => {
        const x = i * stepX;
        const y = SPARK_H - 2 - ((v - min) / range) * (SPARK_H - 4);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  })();

  const sparkAreaPath = sparkPath
    ? `${sparkPath} V${SPARK_H} H0 Z`
    : '';

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>{t('home.wardDashboard')}</Text>
        <Text style={styles.wardLabel}>
          {wardName} · {wardArea}
        </Text>
      </View>

      <View style={styles.card}>
        {/* Donut + Stats row */}
        <View style={styles.donutRow}>
          {/* Donut */}
          <View style={styles.donutContainer}>
            <Svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}>
              {/* Background circle */}
              <Circle
                cx={DONUT_SIZE / 2}
                cy={DONUT_SIZE / 2}
                r={DONUT_R}
                fill="none"
                stroke={colors.borderLight}
                strokeWidth={10}
              />
              {/* Segments */}
              {donutSegments.map((seg, i) => (
                <Circle
                  key={i}
                  cx={DONUT_SIZE / 2}
                  cy={DONUT_SIZE / 2}
                  r={DONUT_R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={10}
                  strokeDasharray={`${seg.dashLength} ${seg.gap}`}
                  strokeDashoffset={seg.offset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}
                />
              ))}
            </Svg>
            {/* Center text */}
            <View style={styles.donutCenter}>
              <Text style={styles.totalNumber}>{open + inProgress + resolved + verified}</Text>
              <Text style={styles.totalLabel}>{t('home.total')}</Text>
            </View>
          </View>

          {/* Stat list */}
          <View style={styles.statList}>
            {segments.map((seg, i) => (
              <View key={i} style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: seg.color }]} />
                <Text style={styles.statCount}>{seg.count}</Text>
                <Text style={styles.statLabel}>{seg.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Ward meta */}
        <View style={styles.wardMeta}>
          <View style={styles.pulseRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.pulseText}>
              {t('home.resolutionRate')} <Text style={styles.pulseBold}>{resolutionTrend}</Text>
            </Text>
          </View>
          <Text style={styles.wardRank}>
            {t('home.rank')} <Text style={styles.pulseBold}>#{rank}</Text> / {totalWards}
          </Text>
        </View>

        {/* Sparkline */}
        <View style={styles.sparkRow}>
          <Text style={styles.sparkLabel}>{t('home.dayResolution')}</Text>
          <Svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}>
            <Defs>
              <LinearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={STATUS_RESOLVED} stopOpacity={0.2} />
                <Stop offset="100%" stopColor={STATUS_RESOLVED} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {sparkPath ? (
              <>
                <Path
                  d={sparkPath}
                  fill="none"
                  stroke={STATUS_RESOLVED}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path d={sparkAreaPath} fill="url(#sparkGrad)" />
              </>
            ) : null}
          </Svg>
          <Text style={[styles.sparkLabel, { color: STATUS_RESOLVED, fontWeight: '700' }]}>
            {sparklineTrend}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  wardLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donutContainer: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  totalNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
  },
  totalLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: -2,
  },
  statList: {
    flex: 1,
    marginLeft: spacing.lg,
    gap: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statCount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 4,
    minWidth: 18,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  wardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  pulseText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  pulseBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  wardRank: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  sparkLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
