import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Line,
} from 'react-native-svg';
import { colors } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import type { WardMoodData } from '../../hooks/useWardMood';

const NAVY = '#0B1426';

// Topic bar colors by sentiment
function topicColor(sentiment: number): string {
  if (sentiment < -0.3) return '#EF4444';
  if (sentiment < 0.1) return '#F59E0B';
  return '#10B981';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const MOOD_CONTEXT: Record<string, string> = {
  angry: 'High frustration across multiple issues',
  frustrated: '{topic} issues dominating conversation this week',
  concerned: 'Mixed sentiment — some areas improving',
  hopeful: 'Positive momentum building in the ward',
  happy: 'Citizens feeling heard and satisfied',
};

// Sparkline path helper
function sparkPath(values: number[], w: number, h: number): string {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.01;
  const stepX = w / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - 2 - ((v - min) / range) * (h - 4);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface WardMoodProps {
  data: WardMoodData;
}

export const WardMood: React.FC<WardMoodProps> = ({ data }) => {
  const topTopic = data.topics.reduce((a, b) => (b.percentage > a.percentage ? b : a), data.topics[0]);
  const contextTemplate = MOOD_CONTEXT[data.mood] ?? MOOD_CONTEXT.concerned;
  const context = contextTemplate.replace('{topic}', topTopic.name);

  const sparkD = useMemo(
    () => sparkPath(data.trend.sparkline, 100, 20),
    [data.trend.sparkline],
  );
  const sparkFillD = sparkD + ' V20 H0 Z';

  const isDecline = data.trend.direction === 'declining';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Circle cx={8} cy={8} r={6} stroke={NAVY} strokeWidth={1.5} />
            <Path d="M5 9.5 Q6.5 7 8 9.5 Q9.5 12 11 9.5" stroke={NAVY} strokeWidth={1.5} strokeLinecap="round" fill="none" />
            <Circle cx={6} cy={6.5} r={0.8} fill={NAVY} />
            <Circle cx={10} cy={6.5} r={0.8} fill={NAVY} />
          </Svg>
          <Text style={styles.title}>Ward Mood</Text>
        </View>
        <View style={styles.liveTag}>
          <Text style={styles.liveTagText}>Live</Text>
        </View>
      </View>

      {/* Arc gauge + mood label (inline) */}
      <View style={styles.arcRow}>
        {/* Mini arc gauge */}
        <View style={styles.arcWrap}>
          <Svg width={72} height={44} viewBox="0 0 72 44">
            <Defs>
              <LinearGradient id="moodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#EF4444" />
                <Stop offset="35%" stopColor="#F59E0B" />
                <Stop offset="65%" stopColor="#84CC16" />
                <Stop offset="100%" stopColor="#10B981" />
              </LinearGradient>
            </Defs>
            {/* Background arc */}
            <Path
              d="M8 32 A28 28 0 0 1 64 32"
              fill="none"
              stroke={colors.border}
              strokeWidth={6}
              strokeLinecap="round"
            />
            {/* Colored arc */}
            <Path
              d="M8 32 A28 28 0 0 1 64 32"
              fill="none"
              stroke="url(#moodGrad)"
              strokeWidth={6}
              strokeLinecap="round"
            />
            {/* Needle — rotate based on score (0=left, 1=right) */}
            <Line
              x1={36}
              y1={32}
              x2={36 + 22 * Math.cos(Math.PI - data.score * Math.PI)}
              y2={32 - 22 * Math.sin(Math.PI - data.score * Math.PI)}
              stroke={NAVY}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Circle cx={36} cy={32} r={3} fill={NAVY} />
          </Svg>
        </View>

        <View style={styles.moodTextWrap}>
          <Text style={styles.moodLabel}>{capitalize(data.mood)}</Text>
          <Text style={styles.moodDetail}>{context}</Text>
        </View>
      </View>

      {/* Topic pills */}
      <View style={styles.topicPills}>
        {console.log('MOOD TOPICS:', data.topics.map(t => `${t.name}:${t.sentiment}`))}
      {data.topics.map(topic => {
          const color = topicColor(topic.sentiment);
          const isPositive = topic.sentiment > 0.1;
          return (
            <TouchableOpacity
              key={topic.name}
              style={[styles.topicPill, { borderWidth: 1, borderColor: color + '40', backgroundColor: isPositive ? color + '10' : colors.borderLight }]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 10 }}>{isPositive ? '✓' : '!'}</Text>
              <Text style={[styles.topicText, { color: isPositive ? color : colors.textSecondary }]}>
                {topic.name} ({topic.percentage}%)
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 7-day trend */}
      <View style={styles.trendRow}>
        <Text style={styles.trendLabel}>7-day trend</Text>
        <Svg width={100} height={20} viewBox="0 0 100 20" style={styles.trendSparkline}>
          <Defs>
            <LinearGradient id="moodSparkGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={isDecline ? '#F59E0B' : '#10B981'} stopOpacity={0.2} />
              <Stop offset="100%" stopColor={isDecline ? '#F59E0B' : '#10B981'} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={sparkD} fill="none" stroke={isDecline ? '#F59E0B' : '#10B981'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d={sparkFillD} fill="url(#moodSparkGrad)" />
        </Svg>
        <View style={[styles.trendBadge, isDecline ? styles.trendNeg : styles.trendPos]}>
          <Text style={[styles.trendBadgeText, isDecline ? styles.trendNegText : styles.trendPosText]}>
            {isDecline ? '-' : '+'}{Math.abs(data.trend.change_percent)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  liveTag: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  arcWrap: {
    width: 72,
    height: 44,
    flexShrink: 0,
  },
  moodTextWrap: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    lineHeight: 18,
  },
  moodDetail: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  topicPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 14,
  },
  topicBar: {
    width: 3,
    height: 10,
    borderRadius: 2,
  },
  topicText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  trendLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
  },
  trendSparkline: {
    flex: 1,
    marginHorizontal: 10,
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendNeg: {
    backgroundColor: '#FEF2F2',
  },
  trendPos: {
    backgroundColor: '#ECFDF5',
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  trendNegText: {
    color: '#B91C1C',
  },
  trendPosText: {
    color: '#047857',
  },
});
