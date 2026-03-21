import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Path,
} from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

// ---------------------------------------------------------------------------
// Design tokens from the HTML mockup
// ---------------------------------------------------------------------------
const SAFFRON = '#FF6B35';
const SAFFRON_LIGHT = '#FFF3ED';
const SAFFRON_DEEP = '#E85D2A';
const STATUS_VERIFIED = '#3B82F6';
const PURPLE = '#7C3AED';

const RING_SIZE = 90;
const RING_R = 36;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

// ---------------------------------------------------------------------------
// Chip data
// ---------------------------------------------------------------------------
interface ScoreChip {
  label: string;
  value: number;
  color: string;
  iconPath: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CivicScoreRingProps {
  score: number;
  maxScore?: number;
  milestoneLabel?: string;
  milestoneProgress?: number; // 0-1
  reported?: number;
  pollsVoted?: number;
  validations?: number;
  actionsSupported?: number;
  actionsStarted?: number;
  onBoostPress?: () => void;
}

export const CivicScoreRing: React.FC<CivicScoreRingProps> = ({
  score,
  maxScore = 100,
  milestoneLabel = 'Report 2 more to reach Validator',
  milestoneProgress = 0.6,
  reported = 3,
  pollsVoted = 1,
  validations = 0,
  actionsSupported = 1,
  actionsStarted = 0,
  onBoostPress,
}) => {
  const progress = Math.min(score / maxScore, 1);
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  const chips: ScoreChip[] = [
    { label: `${reported} Reported`, value: reported, color: SAFFRON, iconPath: 'M3 8h10M8 3l5 5-5 5' },
    { label: `${pollsVoted} Poll Voted`, value: pollsVoted, color: STATUS_VERIFIED, iconPath: 'M2 8l4 4 8-8' },
    { label: `${validations} Validations`, value: validations, color: colors.textMuted, iconPath: '' },
    { label: `${actionsSupported} Action Supported`, value: actionsSupported, color: PURPLE, iconPath: 'M8 2v12M2 8h12' },
    { label: `${actionsStarted} Actions Started`, value: actionsStarted, color: colors.textMuted, iconPath: '' },
  ];

  return (
    <View style={styles.card}>
      {/* Score header row */}
      <View style={styles.scoreHeader}>
        {/* Ring */}
        <View style={styles.ringContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            <Defs>
              <LinearGradient id="saffronGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#FF8F5E" />
                <Stop offset="100%" stopColor={SAFFRON} />
              </LinearGradient>
            </Defs>
            {/* Background ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              fill="none"
              stroke={colors.borderLight}
              strokeWidth={6}
            />
            {/* Progress ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              fill="none"
              stroke="url(#saffronGradient)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${RING_CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          {/* Center text */}
          <View style={styles.ringCenter}>
            <Text style={styles.scoreNumber}>{score}</Text>
            <Text style={styles.scoreLabel}>Civic</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.scoreDetails}>
          <Text style={styles.journeyTitle}>Your Civic Journey</Text>
          <Text style={styles.journeySubtitle}>
            Report issues and participate to level up your civic reputation
          </Text>

          {/* Milestone bar */}
          <View style={styles.milestoneBar}>
            <View style={[styles.milestoneBarFill, { width: `${milestoneProgress * 100}%` }]} />
          </View>

          <View style={styles.milestoneRow}>
            <Text style={styles.milestoneText}>
              {milestoneLabel}
            </Text>
            <TouchableOpacity style={styles.boostCta} onPress={onBoostPress} activeOpacity={0.7}>
              <Text style={styles.boostCtaText}>Boost</Text>
              <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                <Path d="M2 6h8M7 3l3 3-3 3" stroke="white" strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Score chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
        style={styles.chipScrollView}
      >
        {chips.map((chip, i) => (
          <View key={i} style={styles.chip}>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              {chip.iconPath ? (
                <Path
                  d={chip.iconPath}
                  stroke={chip.color}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              ) : (
                <>
                  <Circle cx={8} cy={8} r={5} stroke={chip.color} strokeWidth={1.5} />
                  <Path d="M8 5v3h3" stroke={chip.color} strokeWidth={1.5} strokeLinecap="round" />
                </>
              )}
            </Svg>
            <Text style={styles.chipText}>{chip.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

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
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: -2,
  },
  scoreDetails: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  journeyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  journeySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  milestoneBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  milestoneBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: SAFFRON,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  milestoneText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
    marginRight: spacing.sm,
  },
  boostCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SAFFRON,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  boostCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chipScrollView: {
    marginTop: spacing.md,
    marginHorizontal: -spacing.lg,
  },
  chipScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
