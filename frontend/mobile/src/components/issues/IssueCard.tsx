import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { getCategoryColor, formatRelativeTime, formatNumber } from '../../lib/utils';
import type { Issue } from '../../types/issue';
import { ISSUE_CATEGORY_LABELS, ISSUE_STATUS_LABELS } from '../../types/issue';

interface IssueCardProps {
  issue: Issue;
  onPress: () => void;
  onUpvote?: () => void;
}

export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  onPress,
  onUpvote,
}) => {
  const categoryColor = getCategoryColor(issue.category);
  const isResolved = issue.status === 'completed' || issue.status === 'citizen_verified';

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
        <Badge
          text={ISSUE_CATEGORY_LABELS[issue.category]}
          backgroundColor={categoryColor + '18'}
          color={categoryColor}
          size="sm"
        />
        <View style={styles.spacer} />
        <Text style={styles.timeText}>
          {formatRelativeTime(issue.createdAt)}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {issue.title}
      </Text>

      <Text style={styles.description} numberOfLines={2}>
        {issue.description}
      </Text>

      <View style={styles.locationRow}>
        <Text style={styles.locationIcon}>{'\u{1F4CD}'}</Text>
        <Text style={styles.locationText} numberOfLines={1}>
          {issue.address}
        </Text>
      </View>

      <View style={styles.footer}>
        <Badge
          text={ISSUE_STATUS_LABELS[issue.status]}
          backgroundColor={isResolved ? colors.success + '18' : colors.warning + '18'}
          color={isResolved ? colors.success : colors.warning}
          size="sm"
        />

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onUpvote}
            style={styles.actionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.actionIcon, issue.hasUpvoted && styles.upvoted]}>
              {issue.hasUpvoted ? '\u25B2' : '\u25B3'}
            </Text>
            <Text style={[styles.actionText, issue.hasUpvoted && styles.upvoted]}>
              {formatNumber(issue.upvotes)}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionButton}>
            <Text style={styles.actionIcon}>{'\u{1F4AC}'}</Text>
            <Text style={styles.actionText}>{issue.commentCount}</Text>
          </View>
        </View>
      </View>

      {/* Priority indicator strip */}
      {issue.priority === 'critical' && (
        <View style={[styles.priorityStrip, { backgroundColor: colors.error }]} />
      )}
      {issue.priority === 'high' && (
        <View style={[styles.priorityStrip, { backgroundColor: colors.warning }]} />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  spacer: {
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
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
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    fontSize: 14,
    color: colors.textMuted,
  },
  actionText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  upvoted: {
    color: colors.primary,
  },
  priorityStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});
