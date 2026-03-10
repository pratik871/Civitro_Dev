import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { LedgerTimeline } from '../../components/issues/LedgerTimeline';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { getCategoryColor, formatRelativeTime, formatNumber } from '../../lib/utils';
import { useIssue, useUpvoteIssue } from '../../hooks/useIssues';
import { ISSUE_CATEGORY_LABELS, ISSUE_STATUS_LABELS } from '../../types/issue';
import type { RootStackParamList } from '../../navigation/types';

type DetailRouteProp = RouteProp<RootStackParamList, 'IssueDetail'>;

export const IssueDetailScreen: React.FC = () => {
  const route = useRoute<DetailRouteProp>();
  const { data: issue, isLoading } = useIssue(route.params.issueId);
  const upvoteMutation = useUpvoteIssue();

  if (isLoading || !issue) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading issue...</Text>
      </View>
    );
  }

  const categoryColor = getCategoryColor(issue.category);
  const isResolved = issue.status === 'completed' || issue.status === 'citizen_verified';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Photo placeholder */}
      <View style={styles.photoContainer}>
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoIcon}>{'\u{1F4F8}'}</Text>
          <Text style={styles.photoText}>Issue Photo</Text>
        </View>
        <Badge
          text={ISSUE_STATUS_LABELS[issue.status]}
          backgroundColor={isResolved ? colors.success : colors.warning}
          color={colors.white}
          size="md"
          style={styles.statusBadge}
        />
      </View>

      {/* Title and Meta */}
      <View style={styles.titleSection}>
        <View style={styles.categoryRow}>
          <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
          <Badge
            text={ISSUE_CATEGORY_LABELS[issue.category]}
            backgroundColor={categoryColor + '15'}
            color={categoryColor}
            size="sm"
          />
          <Badge
            text={issue.priority.toUpperCase()}
            backgroundColor={
              issue.priority === 'critical'
                ? colors.error + '15'
                : issue.priority === 'high'
                ? colors.warning + '15'
                : colors.info + '15'
            }
            color={
              issue.priority === 'critical'
                ? colors.error
                : issue.priority === 'high'
                ? colors.warning
                : colors.info
            }
            size="sm"
          />
        </View>

        <Text style={styles.title}>{issue.title}</Text>
        <Text style={styles.description}>{issue.description}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.locationIcon}>{'\u{1F4CD}'}</Text>
          <Text style={styles.locationText}>{issue.address}</Text>
        </View>

        <View style={styles.reporterRow}>
          <Avatar name={issue.reportedByName} size={28} />
          <Text style={styles.reporterText}>
            Reported by <Text style={styles.reporterName}>{issue.reportedByName}</Text>
          </Text>
          <Text style={styles.timeText}>
            {formatRelativeTime(issue.createdAt)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            issue.hasUpvoted && styles.actionButtonActive,
          ]}
          onPress={() => upvoteMutation.mutate(issue.id)}
        >
          <Text
            style={[
              styles.actionIcon,
              issue.hasUpvoted && styles.actionIconActive,
            ]}
          >
            {issue.hasUpvoted ? '\u25B2' : '\u25B3'}
          </Text>
          <Text
            style={[
              styles.actionText,
              issue.hasUpvoted && styles.actionTextActive,
            ]}
          >
            Upvote ({formatNumber(issue.upvotes)})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>{'\u{1F4AC}'}</Text>
          <Text style={styles.actionText}>
            Comment ({issue.commentCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>{'\u{1F4E4}'}</Text>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Department Assignment */}
      <Card style={styles.departmentCard}>
        <View style={styles.departmentRow}>
          <View style={styles.departmentIcon}>
            <Text style={styles.departmentEmoji}>{'\u{1F3E2}'}</Text>
          </View>
          <View style={styles.departmentInfo}>
            <Text style={styles.departmentLabel}>Routed To</Text>
            <Text style={styles.departmentName}>{issue.department}</Text>
            {issue.assignedToName && (
              <Text style={styles.assignedTo}>
                Assigned: {issue.assignedToName}
              </Text>
            )}
          </View>
        </View>
      </Card>

      {/* Ledger Timeline */}
      <Card style={styles.ledgerCard}>
        <Text style={styles.sectionTitle}>Resolution Ledger</Text>
        <Text style={styles.sectionSubtitle}>
          Blockchain-verified issue tracking
        </Text>
        <LedgerTimeline ledger={issue.ledger} currentStatus={issue.status} />
      </Card>

      {/* Before / After */}
      <Card style={styles.comparisonCard}>
        <Text style={styles.sectionTitle}>Before / After</Text>
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonItem}>
            <View style={styles.comparisonPlaceholder}>
              <Text style={styles.comparisonEmoji}>{'\u{1F4F7}'}</Text>
              <Text style={styles.comparisonLabel}>Before</Text>
            </View>
          </View>
          <View style={styles.comparisonDivider} />
          <View style={styles.comparisonItem}>
            <View
              style={[
                styles.comparisonPlaceholder,
                !isResolved && styles.comparisonPending,
              ]}
            >
              <Text style={styles.comparisonEmoji}>
                {isResolved ? '\u{1F4F7}' : '\u23F3'}
              </Text>
              <Text style={styles.comparisonLabel}>
                {isResolved ? 'After' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Verify button for completed issues */}
      {issue.status === 'completed' && (
        <Card style={styles.verifyCard}>
          <Text style={styles.verifyTitle}>Verify Resolution</Text>
          <Text style={styles.verifyDesc}>
            Has this issue been resolved to your satisfaction?
          </Text>
          <View style={styles.verifyButtons}>
            <Button
              title="Yes, Verified"
              onPress={() => {}}
              variant="primary"
              size="md"
              style={styles.verifyButtonItem}
            />
            <Button
              title="Not Resolved"
              onPress={() => {}}
              variant="outline"
              size="md"
              style={styles.verifyButtonItem}
            />
          </View>
        </Card>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  photoContainer: {
    height: 200,
    position: 'relative',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: colors.navy + '08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  photoText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statusBadge: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
  },
  titleSection: {
    padding: spacing.lg,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 28,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  locationText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  reporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reporterText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  reporterName: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundGray,
  },
  actionButtonActive: {
    backgroundColor: colors.primary + '12',
  },
  actionIcon: {
    fontSize: 14,
    color: colors.textMuted,
  },
  actionIconActive: {
    color: colors.primary,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  actionTextActive: {
    color: colors.primary,
  },
  departmentCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  departmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  departmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.info + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  departmentEmoji: {
    fontSize: 22,
  },
  departmentInfo: {
    flex: 1,
  },
  departmentLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  departmentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 1,
  },
  assignedTo: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  ledgerCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  comparisonCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  comparisonItem: {
    flex: 1,
  },
  comparisonPlaceholder: {
    height: 120,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonPending: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.white,
  },
  comparisonEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  comparisonLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  comparisonDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  verifyCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.success + '08',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  verifyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  verifyButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  verifyButtonItem: {
    flex: 1,
  },
  bottomSpacer: {
    height: 40,
  },
});
