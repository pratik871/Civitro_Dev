import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { Issue, IssueCategory, IssueStatus } from '../../types/issue';

const SAFFRON = '#FF6B35';
const STATUS_OPEN = '#EF4444';
const STATUS_PROGRESS = '#F59E0B';
const STATUS_RESOLVED = '#10B981';
const STATUS_VERIFIED = '#3B82F6';

// ---------------------------------------------------------------------------
// Category icon config
// ---------------------------------------------------------------------------
const CATEGORY_ICON_COLORS: Record<string, { bg: string; stroke: string }> = {
  water_supply: { bg: '#DBEAFE', stroke: '#3B82F6' },
  pothole: { bg: '#FEF3C7', stroke: '#D97706' },
  road_damage: { bg: '#FEF3C7', stroke: '#D97706' },
  streetlight: { bg: '#D1FAE5', stroke: '#059669' },
  garbage: { bg: '#FEE2E2', stroke: '#EF4444' },
  drainage: { bg: '#CCFBF1', stroke: '#0D9488' },
  traffic: { bg: '#FEE2E2', stroke: '#DC2626' },
  construction: { bg: '#EDE9FE', stroke: '#7C3AED' },
  healthcare: { bg: '#D1FAE5', stroke: '#16A34A' },
  education: { bg: '#DBEAFE', stroke: '#2563EB' },
  public_safety: { bg: '#F1F5F9', stroke: '#1E293B' },
  other: { bg: '#F3F4F6', stroke: '#6B7280' },
};

const STATUS_COLORS: Record<string, string> = {
  reported: STATUS_OPEN,
  acknowledged: STATUS_PROGRESS,
  assigned: STATUS_PROGRESS,
  work_started: STATUS_PROGRESS,
  completed: STATUS_RESOLVED,
  citizen_verified: STATUS_VERIFIED,
};

const STATUS_DISPLAY: Record<string, string> = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  work_started: 'Work Started',
  completed: 'Resolved',
  citizen_verified: 'Verified',
};

// ---------------------------------------------------------------------------
// Progress step state: 0=empty, 1=completed, 2=active
// ---------------------------------------------------------------------------
function getProgressSteps(status: IssueStatus): number[] {
  switch (status) {
    case 'reported':
      return [2, 0, 0];
    case 'acknowledged':
    case 'assigned':
    case 'work_started':
      return [1, 2, 0];
    case 'completed':
    case 'citizen_verified':
      return [1, 1, 1];
    default:
      return [2, 0, 0];
  }
}

// ---------------------------------------------------------------------------
// Category SVG icon
// ---------------------------------------------------------------------------
const CategoryIcon: React.FC<{ category: IssueCategory }> = ({ category }) => {
  const iconCfg = CATEGORY_ICON_COLORS[category] ?? CATEGORY_ICON_COLORS.other;
  const s = iconCfg.stroke;

  const renderSvg = () => {
    switch (category) {
      case 'water_supply':
        return (
          <Svg viewBox="0 0 20 20" width={20} height={20} fill="none">
            <Path d="M4 6h12v3c0 2-1 3-3 3H7c-2 0-3-1-3-3V6z" stroke={s} strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M7 12v3M13 12v3" stroke={s} strokeWidth={1.5} strokeLinecap="round" />
            <Circle cx={8} cy={16} r={1} fill={s} opacity={0.5} />
            <Circle cx={12} cy={17} r={0.7} fill={s} opacity={0.3} />
            <Path d="M3 6h14" stroke={s} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        );
      case 'pothole':
      case 'road_damage':
        return (
          <Svg viewBox="0 0 20 20" width={20} height={20} fill="none">
            <Path d="M2 14h16" stroke={s} strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M5 14c0-2 2-3 5-3s5 1 5 3" stroke={s} strokeWidth={1.5} />
            <Path d="M7 11c1-1 2.5-1.5 3-1.5" stroke={s} strokeWidth={1} strokeDasharray="1 1" />
          </Svg>
        );
      case 'streetlight':
        return (
          <Svg viewBox="0 0 20 20" width={20} height={20} fill="none">
            <Path d="M10 4v12" stroke={s} strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M7 4h6l-1 3H8L7 4z" fill={s} opacity={0.3} stroke={s} strokeWidth={1} />
            <Path d="M8 16h4" stroke={s} strokeWidth={1.5} strokeLinecap="round" />
            <Circle cx={10} cy={3} r={1.5} fill="#FFD700" stroke={s} strokeWidth={0.5} />
          </Svg>
        );
      case 'garbage':
        return (
          <Svg viewBox="0 0 20 20" width={20} height={20} fill="none">
            <Path d="M6 5h8v10a2 2 0 01-2 2H8a2 2 0 01-2-2V5z" stroke={s} strokeWidth={1.5} />
            <Path d="M4 5h12" stroke={s} strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M8 3h4" stroke={s} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        );
      default:
        return (
          <Svg viewBox="0 0 20 20" width={20} height={20} fill="none">
            <Circle cx={10} cy={10} r={7} stroke={s} strokeWidth={1.5} />
            <Path d="M10 7v6M7 10h6" stroke={s} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        );
    }
  };

  return (
    <View style={[styles.categoryIcon, { backgroundColor: iconCfg.bg }]}>
      {renderSvg()}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Linked action indicator
// ---------------------------------------------------------------------------
interface LinkedAction {
  title: string;
  supporters: number;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface IssueFeedCardProps {
  issue: Issue;
  isUrgent?: boolean;
  linkedAction?: LinkedAction;
  onPress?: () => void;
}

export const IssueFeedCard: React.FC<IssueFeedCardProps> = ({
  issue,
  isUrgent = false,
  linkedAction,
  onPress,
}) => {
  const statusColor = STATUS_COLORS[issue.status] ?? STATUS_OPEN;
  const progressSteps = getProgressSteps(issue.status);

  // Time ago
  const timeAgo = (() => {
    const diff = Date.now() - new Date(issue.createdAt).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  })();

  const timeLabel = issue.status === 'completed' || issue.status === 'citizen_verified'
    ? `${STATUS_DISPLAY[issue.status]} · ${timeAgo}`
    : isUrgent
    ? `URGENT · ${timeAgo}`
    : timeAgo;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: statusColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <CategoryIcon category={issue.category} />
        <Text
          style={[
            styles.timeText,
            isUrgent && { color: STATUS_OPEN, fontWeight: '700' },
            (issue.status === 'completed' || issue.status === 'citizen_verified') && {
              color: STATUS_RESOLVED,
            },
          ]}
        >
          {timeLabel}
        </Text>
      </View>

      {/* Body */}
      <Text style={styles.title} numberOfLines={2}>
        {issue.title}
      </Text>
      <View style={styles.locationRow}>
        <Svg viewBox="0 0 16 16" width={14} height={14} fill="none">
          <Path
            d="M8 1C5.24 1 3 3.24 3 6c0 4.13 5 9 5 9s5-4.87 5-9c0-2.76-2.24-5-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z"
            fill={SAFFRON}
          />
        </Svg>
        <Text style={styles.locationText} numberOfLines={1}>
          {issue.address}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Engagement */}
        <View style={styles.engagement}>
          <View style={styles.engItem}>
            <Svg viewBox="0 0 14 14" width={14} height={14} fill="none">
              <Circle cx={7} cy={7} r={5} stroke={colors.textMuted} strokeWidth={1.5} />
              <Circle cx={7} cy={7} r={2} stroke={colors.textMuted} strokeWidth={1.5} />
            </Svg>
            <Text style={styles.engCount}>{issue.upvotes + issue.commentCount}</Text>
          </View>
          <View style={styles.engItem}>
            <Svg viewBox="0 0 14 14" width={14} height={14} fill="none">
              <Path
                d="M7 11V3M4 6l3-3 3 3"
                stroke={colors.textMuted}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={styles.engCount}>{issue.upvotes}</Text>
          </View>
          <View style={styles.engItem}>
            <Svg viewBox="0 0 14 14" width={14} height={14} fill="none">
              <Path
                d="M1 10l3 3 10-10"
                stroke={colors.textMuted}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <Path d="M4 7h5" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
            </Svg>
            <Text style={styles.engCount}>{issue.commentCount}</Text>
          </View>
        </View>

        {/* Progress stepper */}
        <View style={styles.progressWrap}>
          <View style={styles.progressDots}>
            {progressSteps.map((step, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  step === 1 && styles.progressDotCompleted,
                  step === 2 && [styles.progressDotActive, { backgroundColor: statusColor }],
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressLabel}>{STATUS_DISPLAY[issue.status]}</Text>
        </View>
      </View>

      {/* Linked action */}
      {linkedAction && (
        <View style={styles.linkedAction}>
          <Svg viewBox="0 0 12 12" width={12} height={12} fill="none">
            <Path d="M5 7l2 2 4-4" stroke={SAFFRON} strokeWidth={1.5} strokeLinecap="round" />
            <Circle cx={6} cy={6} r={5} stroke={SAFFRON} strokeWidth={1.5} />
          </Svg>
          <Text style={styles.linkedText} numberOfLines={1}>
            Part of: {linkedAction.title} ({linkedAction.supporters} supporters)
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
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
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  locationText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  engagement: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  engItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  engCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
  },
  progressDotCompleted: {
    backgroundColor: STATUS_RESOLVED,
  },
  progressDotActive: {
    backgroundColor: STATUS_OPEN,
  },
  progressLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  linkedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    gap: 6,
  },
  linkedText: {
    fontSize: 11,
    color: SAFFRON,
    fontWeight: '500',
    flex: 1,
  },
});
