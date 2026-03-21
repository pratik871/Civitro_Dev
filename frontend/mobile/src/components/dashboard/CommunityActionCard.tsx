import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

const SAFFRON = '#FF6B35';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CommunityAction {
  id: string;
  title: string;
  badge: string;
  badgeType: 'trending' | 'acknowledged' | 'new';
  ward: string;
  supporters: number;
  goalPercent: number;
  incidents: number;
  locations: number;
  impactLabel: string;
  impactColor?: string;
  creatorInitial: string;
  creatorName: string;
  createdAgo: string;
}

interface CommunityActionCardProps {
  actions: CommunityAction[];
  onSupport?: (id: string) => void;
  onShare?: (id: string) => void;
  onSeeAll?: () => void;
}

// ---------------------------------------------------------------------------
// Badge color map
// ---------------------------------------------------------------------------
const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  trending: { bg: '#FEF3C7', text: '#D97706' },
  acknowledged: { bg: '#D1FAE5', text: '#059669' },
  new: { bg: '#EDE9FE', text: '#7C3AED' },
};

// ---------------------------------------------------------------------------
// Single card
// ---------------------------------------------------------------------------
const ActionCard: React.FC<{
  action: CommunityAction;
  onSupport?: () => void;
  onShare?: () => void;
}> = ({ action, onSupport, onShare }) => {
  const badgeStyle = BADGE_STYLES[action.badgeType] ?? BADGE_STYLES.new;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.badgePill, { backgroundColor: badgeStyle.bg }]}>
          <Text style={[styles.badgeText, { color: badgeStyle.text }]}>{action.badge}</Text>
        </View>
        <Text style={styles.wardTag}>{action.ward}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {action.title}
      </Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${action.goalPercent}%` }]} />
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.supporters}>{action.supporters} supporters</Text>
        <Text style={styles.goal}>{action.goalPercent}% of goal</Text>
      </View>

      {/* Evidence */}
      <View style={styles.evidenceRow}>
        <View style={styles.evidenceItem}>
          <Svg viewBox="0 0 12 12" width={12} height={12} fill="none">
            <Path d="M2 8l2-3 2 2 3-4 2 3" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" />
            <Rect x={1} y={1} width={10} height={10} rx={1} stroke={colors.textMuted} strokeWidth={1.5} />
          </Svg>
          <Text style={styles.evCount}>{action.incidents}</Text>
          <Text style={styles.evLabel}>incidents</Text>
        </View>
        <View style={styles.evidenceItem}>
          <Svg viewBox="0 0 12 12" width={12} height={12} fill="none">
            <Path
              d="M6 1C3.24 1 1 3.24 1 6c0 3.31 5 5 5 5s5-1.69 5-5c0-2.76-2.24-5-5-5z"
              stroke={colors.textMuted}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <Circle cx={6} cy={6} r={1.5} stroke={colors.textMuted} strokeWidth={1.5} />
          </Svg>
          <Text style={styles.evCount}>{action.locations}</Text>
          <Text style={styles.evLabel}>locations</Text>
        </View>
        <View style={styles.evidenceItem}>
          <Svg viewBox="0 0 12 12" width={12} height={12} fill="none">
            <Path d="M6 1v6l3 3" stroke={action.impactColor ?? '#0F766E'} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
          <Text style={[styles.evCount, action.impactColor ? { color: action.impactColor } : null]}>
            {action.impactLabel}
          </Text>
          <Text style={styles.evLabel}>impact</Text>
        </View>
      </View>

      {/* CTAs */}
      <View style={styles.ctaRow}>
        <TouchableOpacity style={styles.supportBtn} onPress={onSupport} activeOpacity={0.7}>
          <Svg viewBox="0 0 14 14" width={14} height={14} fill="none">
            <Path d="M7 1v12M1 7h12" stroke="white" strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <Text style={styles.supportBtnText}>Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.7}>
          <Svg viewBox="0 0 14 14" width={14} height={14} fill="none">
            <Circle cx={4} cy={7} r={2} stroke={colors.textSecondary} strokeWidth={1.5} />
            <Circle cx={11} cy={3} r={2} stroke={colors.textSecondary} strokeWidth={1.5} />
            <Circle cx={11} cy={11} r={2} stroke={colors.textSecondary} strokeWidth={1.5} />
            <Path d="M5.5 6l4-2M5.5 8l4 2" stroke={colors.textSecondary} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Creator */}
      <View style={styles.creatorRow}>
        <View style={styles.creatorAvatar}>
          <Text style={styles.creatorAvatarText}>{action.creatorInitial}</Text>
        </View>
        <Text style={styles.creatorText}>
          Started by {action.creatorName} · {action.createdAgo}
        </Text>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
export const CommunityActionsSection: React.FC<CommunityActionCardProps> = ({
  actions,
  onSupport,
  onShare,
  onSeeAll,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Community Actions</Text>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {actions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            onSupport={() => onSupport?.(action.id)}
            onShare={() => onShare?.(action.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: SAFFRON,
  },
  scroll: {
    paddingRight: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: 280,
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  wardTag: {
    fontSize: 11,
    color: colors.textMuted,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: SAFFRON,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  supporters: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  goal: {
    fontSize: 11,
    color: colors.textMuted,
  },
  evidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  evCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  evLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  supportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SAFFRON,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  supportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundGray,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  creatorText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
