import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Line,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { WardMoodData, WardMoodTopic } from '../../hooks/useWardMood';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** SVG viewport width for the arc gauge. */
const ARC_W = 260;
/** SVG viewport height (semicircle + room for needle overshoot). */
const ARC_H = 150;
/** Centre of the arc. */
const CX = ARC_W / 2;
const CY = 130;
/** Outer radius of the arc. */
const R = 110;
/** Stroke width of the arc band. */
const ARC_STROKE = 18;
/** Angular extent: the arc sweeps from 180 deg (left) to 0 deg (right). */
const START_ANGLE = Math.PI; // left
const END_ANGLE = 0; // right

/** Sparkline dimensions. */
const SPARK_W = 120;
const SPARK_H = 36;

// Gauge zone colours (red -> amber -> green).
const GAUGE_RED = '#DC2626';
const GAUGE_AMBER = '#F59E0B';
const GAUGE_GREEN = '#059669';

// Mood label -> contextual description template.
const MOOD_CONTEXT: Record<string, string> = {
  angry: 'High frustration across multiple issues',
  frustrated: '{topic} issues dominating this week',
  concerned: 'Mixed sentiment — some areas improving',
  hopeful: 'Positive momentum building in the ward',
  happy: 'Citizens feeling heard and satisfied',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a score in [0,1] to an angle on the semicircle (PI..0). */
function scoreToAngle(score: number): number {
  const clamped = Math.max(0, Math.min(1, score));
  return START_ANGLE - clamped * (START_ANGLE - END_ANGLE);
}

/** Polar -> cartesian for the gauge centre. */
function polarToXY(angle: number, r: number): { x: number; y: number } {
  return { x: CX + r * Math.cos(angle), y: CY - r * Math.sin(angle) };
}

/** Build an SVG arc path from startAngle to endAngle at radius r. */
function arcPath(startA: number, endA: number, r: number): string {
  const start = polarToXY(startA, r);
  const end = polarToXY(endA, r);
  const largeArc = startA - endA > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/** Build a polyline-style SVG path from sparkline values. */
function sparklinePath(
  values: number[],
  width: number,
  height: number,
): string {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.01;
  const stepX = width / (values.length - 1);
  const pad = 4; // vertical padding

  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Capitalise first letter. */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface GaugeProps {
  score: number;
  mood: string;
}

const ArcGauge: React.FC<GaugeProps> = ({ score, mood }) => {
  const needleAngle = scoreToAngle(score);
  const needleTip = polarToXY(needleAngle, R - ARC_STROKE / 2 - 6);
  const needleBase1 = polarToXY(needleAngle + 0.06, 10);
  const needleBase2 = polarToXY(needleAngle - 0.06, 10);

  // Tick marks at 0, 0.25, 0.5, 0.75, 1
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <Svg width={ARC_W} height={ARC_H} viewBox={`0 0 ${ARC_W} ${ARC_H}`}>
      <Defs>
        <LinearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={GAUGE_RED} />
          <Stop offset="35%" stopColor={GAUGE_RED} />
          <Stop offset="50%" stopColor={GAUGE_AMBER} />
          <Stop offset="75%" stopColor={GAUGE_GREEN} />
          <Stop offset="100%" stopColor={GAUGE_GREEN} />
        </LinearGradient>
      </Defs>

      {/* Background track (faint) */}
      <Path
        d={arcPath(START_ANGLE, END_ANGLE, R)}
        fill="none"
        stroke={colors.borderLight}
        strokeWidth={ARC_STROKE}
        strokeLinecap="round"
      />

      {/* Coloured arc */}
      <Path
        d={arcPath(START_ANGLE, END_ANGLE, R)}
        fill="none"
        stroke="url(#gaugeGrad)"
        strokeWidth={ARC_STROKE}
        strokeLinecap="round"
      />

      {/* Tick marks */}
      {ticks.map(t => {
        const a = scoreToAngle(t);
        const outer = polarToXY(a, R + 4);
        const inner = polarToXY(a, R - ARC_STROKE - 4);
        return (
          <Line
            key={t}
            x1={outer.x}
            y1={outer.y}
            x2={inner.x}
            y2={inner.y}
            stroke={colors.border}
            strokeWidth={1.5}
          />
        );
      })}

      {/* Tick labels */}
      <SvgText x={CX - R - 8} y={CY + 14} fontSize={10} fill={colors.textMuted} textAnchor="middle">
        Angry
      </SvgText>
      <SvgText x={CX} y={CY - R - 10} fontSize={10} fill={colors.textMuted} textAnchor="middle">
        Neutral
      </SvgText>
      <SvgText x={CX + R + 8} y={CY + 14} fontSize={10} fill={colors.textMuted} textAnchor="middle">
        Happy
      </SvgText>

      {/* Needle */}
      <G>
        {/* Needle shadow */}
        <Path
          d={`M ${needleBase1.x} ${needleBase1.y} L ${needleTip.x} ${needleTip.y} L ${needleBase2.x} ${needleBase2.y} Z`}
          fill={colors.navy}
          opacity={0.15}
        />
        {/* Needle body */}
        <Path
          d={`M ${needleBase1.x} ${needleBase1.y} L ${needleTip.x} ${needleTip.y} L ${needleBase2.x} ${needleBase2.y} Z`}
          fill={colors.navy}
        />
        {/* Centre cap */}
        <Circle cx={CX} cy={CY} r={6} fill={colors.navy} />
        <Circle cx={CX} cy={CY} r={3} fill={colors.white} />
      </G>
    </Svg>
  );
};

// ---------------------------------------------------------------------------

interface TopicBarProps {
  topic: WardMoodTopic;
  maxPercentage: number;
}

const TopicBar: React.FC<TopicBarProps> = ({ topic, maxPercentage }) => {
  const barColor =
    topic.sentiment < -0.3
      ? GAUGE_RED
      : topic.sentiment < 0.1
      ? GAUGE_AMBER
      : GAUGE_GREEN;

  const barWidth = `${Math.round((topic.percentage / maxPercentage) * 100)}%`;

  return (
    <View style={styles.topicRow}>
      <View style={styles.topicLabelCol}>
        <Text style={styles.topicName} numberOfLines={1}>
          {topic.name}
        </Text>
      </View>
      <View style={styles.topicBarCol}>
        <View style={styles.topicBarTrack}>
          <View
            style={[styles.topicBarFill, { width: barWidth, backgroundColor: barColor }]}
          />
        </View>
      </View>
      <Text style={styles.topicPct}>{topic.percentage}%</Text>
    </View>
  );
};

// ---------------------------------------------------------------------------

interface SparklineProps {
  values: number[];
  changePercent: number;
  direction: string;
}

const Sparkline: React.FC<SparklineProps> = ({ values, changePercent, direction }) => {
  const pathD = useMemo(() => sparklinePath(values, SPARK_W, SPARK_H), [values]);
  const lineColor =
    direction === 'improving' ? GAUGE_GREEN : direction === 'declining' ? GAUGE_RED : GAUGE_AMBER;

  const badgeBg =
    direction === 'improving'
      ? colors.success + '18'
      : direction === 'declining'
      ? colors.error + '18'
      : colors.warning + '18';
  const badgeText =
    direction === 'improving' ? colors.success : direction === 'declining' ? colors.error : colors.warning;

  const arrow = direction === 'improving' ? '\u2191' : direction === 'declining' ? '\u2193' : '\u2192';

  return (
    <View style={styles.sparkContainer}>
      <View>
        <Text style={styles.sparkLabel}>7-day trend</Text>
        <Svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}>
          <Path d={pathD} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={[styles.changeBadge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.changeText, { color: badgeText }]}>
          {arrow} {Math.abs(changePercent)}%
        </Text>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface WardMoodProps {
  data: WardMoodData;
}

export const WardMood: React.FC<WardMoodProps> = ({ data }) => {
  const maxPct = Math.max(...data.topics.map(t => t.percentage), 1);

  // Build context string, inserting the top topic name where applicable.
  const topTopic = data.topics.reduce((a, b) => (b.percentage > a.percentage ? b : a), data.topics[0]);
  const contextTemplate = MOOD_CONTEXT[data.mood] ?? MOOD_CONTEXT.concerned;
  const context = contextTemplate.replace('{topic}', topTopic.name);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ward Mood</Text>
        <View style={styles.scorePill}>
          <Text style={styles.scoreText}>{data.score.toFixed(2)}</Text>
        </View>
      </View>

      {/* Arc Gauge */}
      <View style={styles.gaugeWrap}>
        <ArcGauge score={data.score} mood={data.mood} />
      </View>

      {/* Mood label + context */}
      <Text style={styles.moodLabel}>{capitalize(data.mood)}</Text>
      <Text style={styles.moodContext}>{context}</Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Topic breakdown */}
      <Text style={styles.sectionLabel}>Top Concerns</Text>
      {data.topics.map(topic => (
        <TopicBar key={topic.name} topic={topic} maxPercentage={maxPct} />
      ))}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Sparkline */}
      <Sparkline
        values={data.trend.sparkline}
        changePercent={data.trend.change_percent}
        direction={data.trend.direction}
      />
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scorePill: {
    backgroundColor: colors.navy + '0F',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },

  // Gauge
  gaugeWrap: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  // Mood labels
  moodLabel: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  moodContext: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },

  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  // Topic bars
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  topicLabelCol: {
    width: 100,
  },
  topicName: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  topicBarCol: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  topicBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  topicBarFill: {
    height: 8,
    borderRadius: 4,
  },
  topicPct: {
    width: 36,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Sparkline
  sparkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sparkLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  changeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
