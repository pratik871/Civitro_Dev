import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
} from 'react-native-svg';
import { useTranslation } from 'react-i18next';
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

const RING_SIZE = 76;
const RING_VIEWBOX = 90;
const RING_R = 36;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

// ---------------------------------------------------------------------------
// Civic level tiers — score thresholds and requirements
// ---------------------------------------------------------------------------
interface CivicTier {
  name: string;
  minScore: number;
  minReported: number;
}

const CIVIC_TIERS: CivicTier[] = [
  { name: 'Observer',    minScore: 0,    minReported: 0 },
  { name: 'Reporter',    minScore: 50,   minReported: 3 },
  { name: 'Validator',   minScore: 100,  minReported: 10 },
  { name: 'Advocate',    minScore: 250,  minReported: 25 },
  { name: 'Champion',    minScore: 500,  minReported: 50 },
  { name: 'Guardian',    minScore: 1000, minReported: 100 },
];

function computeMilestone(score: number, reported: number) {
  let currentIdx = 0;
  for (let i = CIVIC_TIERS.length - 1; i >= 0; i--) {
    if (score >= CIVIC_TIERS[i].minScore && reported >= CIVIC_TIERS[i].minReported) {
      currentIdx = i;
      break;
    }
  }

  const nextIdx = Math.min(currentIdx + 1, CIVIC_TIERS.length - 1);
  const nextTier = CIVIC_TIERS[nextIdx];

  if (currentIdx === CIVIC_TIERS.length - 1) {
    return { prefix: 'max_level', highlight: '', suffix: 'reached', progress: 1, isMaxLevel: true, reportsNeeded: 0, pointsNeeded: 0, nextTierName: '' };
  }

  const currentTier = CIVIC_TIERS[currentIdx];
  const reportsNeeded = Math.max(0, nextTier.minReported - reported);
  const reportsRange = nextTier.minReported - currentTier.minReported;
  const reportsProgress = reportsRange > 0 ? Math.min((reported - currentTier.minReported) / reportsRange, 1) : 1;

  const scoreRange = nextTier.minScore - currentTier.minScore;
  const scoreProgress = scoreRange > 0 ? Math.min((score - currentTier.minScore) / scoreRange, 1) : 1;

  // Use the lower of the two — whichever is the bottleneck
  const overallProgress = Math.min(scoreProgress, reportsProgress);

  if (reportsNeeded > 0) {
    return {
      prefix: 'report',
      highlight: String(reportsNeeded),
      suffix: nextTier.name,
      progress: overallProgress,
      isMaxLevel: false,
      reportsNeeded,
      pointsNeeded: 0,
      nextTierName: nextTier.name,
    };
  }
  const pointsNeeded = Math.max(0, nextTier.minScore - score);
  return {
    prefix: 'points',
    highlight: String(pointsNeeded),
    suffix: nextTier.name,
    progress: overallProgress,
    isMaxLevel: false,
    reportsNeeded: 0,
    pointsNeeded,
    nextTierName: nextTier.name,
  };
}

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
  reported = 0,
  pollsVoted = 0,
  validations = 0,
  actionsSupported = 0,
  actionsStarted = 0,
  onBoostPress,
}) => {
  const { t } = useTranslation();
  // Ring progress based on civic tier — fills within current→next tier range
  const currentTierIdx = (() => {
    let idx = 0;
    for (let i = CIVIC_TIERS.length - 1; i >= 0; i--) {
      if (score >= CIVIC_TIERS[i].minScore) { idx = i; break; }
    }
    return idx;
  })();
  const isMaxTier = currentTierIdx >= CIVIC_TIERS.length - 1;
  const prevScore = CIVIC_TIERS[currentTierIdx].minScore;
  const nextScore = isMaxTier ? prevScore : CIVIC_TIERS[currentTierIdx + 1].minScore;
  const tierRange = nextScore - prevScore;
  const progress = isMaxTier ? 1 : tierRange > 0 ? Math.min((score - prevScore) / tierRange, 1) : 1;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  const milestone = computeMilestone(score, reported);

  // Arrow bounce animation (matches HTML: translateX 0→4px, 2s loop)
  const arrowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 4, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [arrowAnim]);

  const chips: ScoreChip[] = [
    { label: t('home.reported', { count: reported }), value: reported, color: SAFFRON, iconPath: 'M3 8h10M8 3l5 5-5 5' },
    { label: t('home.pollsVoted', { count: pollsVoted }), value: pollsVoted, color: STATUS_VERIFIED, iconPath: 'M2 8l4 4 8-8' },
    { label: t('home.validations', { count: validations }), value: validations, color: colors.textMuted, iconPath: '' },
    { label: t('home.actionsSupported', { count: actionsSupported }), value: actionsSupported, color: PURPLE, iconPath: 'M8 2v12M2 8h12' },
    { label: t('home.actionsStarted', { count: actionsStarted }), value: actionsStarted, color: colors.textMuted, iconPath: '' },
  ];

  return (
    <View style={styles.card}>
      {/* Top-right saffron glow */}
      <View style={styles.glowWrap} pointerEvents="none">
        <Svg width={240} height={240} viewBox="0 0 240 240">
          <Defs>
            <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={SAFFRON} stopOpacity={0.25} />
              <Stop offset="70%" stopColor={SAFFRON} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={120} cy={120} r={120} fill="url(#glowGrad)" />
        </Svg>
      </View>

      {/* Score header row */}
      <View style={styles.scoreHeader}>
        {/* Ring */}
        <View style={styles.ringContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`}>
            <Defs>
              <LinearGradient id="saffronGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#FF8F5E" />
                <Stop offset="100%" stopColor={SAFFRON} />
              </LinearGradient>
            </Defs>
            {/* Background ring */}
            <Circle
              cx={RING_VIEWBOX / 2}
              cy={RING_VIEWBOX / 2}
              r={RING_R}
              fill="none"
              stroke={colors.borderLight}
              strokeWidth={6}
            />
            {/* Progress ring */}
            <Circle
              cx={RING_VIEWBOX / 2}
              cy={RING_VIEWBOX / 2}
              r={RING_R}
              fill="none"
              stroke="url(#saffronGradient)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${RING_CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${RING_VIEWBOX / 2} ${RING_VIEWBOX / 2})`}
            />
          </Svg>
          {/* Center text */}
          <View style={styles.ringCenter}>
            <Text style={styles.scoreNumber}>{score}</Text>
            <Text style={styles.scoreLabel}>{t('home.civic')}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.scoreDetails}>
          <Text style={styles.journeyTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{t('home.yourCivicJourney')}</Text>
          <Text style={styles.journeySubtitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
            {t('home.civicJourneyDesc')}
          </Text>

          {/* Milestone bar */}
          <View style={styles.milestoneBar}>
            <View style={[styles.milestoneBarFill, { width: `${milestone.progress * 100}%` }]} />
          </View>

          <View style={styles.milestoneRow}>
            <Text style={styles.milestoneText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {milestone.isMaxLevel ? (
                <>{t('home.maxLevelReached', 'Max level reached!')}</>
              ) : milestone.reportsNeeded > 0 ? (
                <>{t('home.report', 'Report')} <Text style={styles.milestoneHighlight}>{String(t('home.nMore', '{{count}} more', { count: milestone.reportsNeeded } as any))}</Text> {String(t('home.toReach', 'to reach {{name}}', { name: milestone.nextTierName } as any))}</>
              ) : (
                <><Text style={styles.milestoneHighlight}>{String(t('home.nMore', '{{count}} more', { count: milestone.pointsNeeded } as any))}</Text> {String(t('home.pointsToReach', 'points to reach {{name}}', { name: milestone.nextTierName } as any))}</>
              )}
            </Text>
            <TouchableOpacity style={styles.boostCta} onPress={onBoostPress} activeOpacity={0.7}>
              <Text style={styles.boostCtaText}>{t('home.boost')}</Text>
              <Animated.View style={{ transform: [{ translateX: arrowAnim }] }}>
                <Svg width={16} height={16} viewBox="0 0 12 12" fill="none">
                  <Path d="M2 6h8M7 3l3 3-3 3" stroke="white" strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </Animated.View>
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
            <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
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
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  glowWrap: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 240,
    height: 240,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    fontSize: 24,
    fontWeight: '800',
    color: SAFFRON,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: -2,
  },
  scoreDetails: {
    flex: 1,
    marginLeft: 14,
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
    marginBottom: 10,
  },
  milestoneBar: {
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: 6,
  },
  milestoneBarFill: {
    height: 6,
    borderRadius: 4,
    backgroundColor: SAFFRON,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  milestoneText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  milestoneHighlight: {
    color: SAFFRON,
    fontWeight: '700',
  },
  boostCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SAFFRON,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    shadowColor: SAFFRON,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  boostCtaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chipScrollView: {
    marginTop: 12,
    marginHorizontal: -16,
  },
  chipScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
