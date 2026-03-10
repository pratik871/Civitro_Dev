import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formatDate, formatRelativeTime } from '../../lib/utils';
import type { IssueLedgerEntry, IssueStatus } from '../../types/issue';
import { ISSUE_STATUS_LABELS } from '../../types/issue';

const ALL_STEPS: IssueStatus[] = [
  'reported',
  'acknowledged',
  'assigned',
  'work_started',
  'completed',
  'citizen_verified',
];

const STEP_ICONS: Record<IssueStatus, string> = {
  reported: '\u{1F4CB}',
  acknowledged: '\u2705',
  assigned: '\u{1F464}',
  work_started: '\u{1F6E0}',
  completed: '\u{1F3C1}',
  citizen_verified: '\u2B50',
};

interface LedgerTimelineProps {
  ledger: IssueLedgerEntry[];
  currentStatus: IssueStatus;
}

export const LedgerTimeline: React.FC<LedgerTimelineProps> = ({
  ledger,
  currentStatus,
}) => {
  const currentStepIndex = ALL_STEPS.indexOf(currentStatus);

  const getLedgerEntry = (status: IssueStatus): IssueLedgerEntry | undefined => {
    return ledger.find(entry => entry.status === status);
  };

  return (
    <View style={styles.container}>
      {ALL_STEPS.map((step, index) => {
        const entry = getLedgerEntry(step);
        const isCompleted = index <= currentStepIndex && !!entry;
        const isCurrent = step === currentStatus;
        const isFuture = index > currentStepIndex;

        return (
          <View key={step} style={styles.stepRow}>
            {/* Timeline line */}
            <View style={styles.lineContainer}>
              {index > 0 && (
                <View
                  style={[
                    styles.lineTop,
                    isCompleted ? styles.lineCompleted : styles.linePending,
                  ]}
                />
              )}
              <View
                style={[
                  styles.dot,
                  isCompleted && styles.dotCompleted,
                  isCurrent && styles.dotCurrent,
                  isFuture && styles.dotFuture,
                ]}
              >
                <Text style={styles.dotIcon}>
                  {isCompleted ? STEP_ICONS[step] : '\u25CB'}
                </Text>
              </View>
              {index < ALL_STEPS.length - 1 && (
                <View
                  style={[
                    styles.lineBottom,
                    isCompleted && !isCurrent
                      ? styles.lineCompleted
                      : styles.linePending,
                  ]}
                />
              )}
            </View>

            {/* Content */}
            <View
              style={[
                styles.content,
                isFuture && styles.contentFuture,
              ]}
            >
              <Text
                style={[
                  styles.stepTitle,
                  isCurrent && styles.stepTitleCurrent,
                  isFuture && styles.stepTitleFuture,
                ]}
              >
                {ISSUE_STATUS_LABELS[step]}
              </Text>
              {entry ? (
                <>
                  <Text style={styles.stepDescription}>
                    {entry.description}
                  </Text>
                  <Text style={styles.stepTimestamp}>
                    {formatDate(entry.timestamp)} ({formatRelativeTime(entry.timestamp)})
                  </Text>
                </>
              ) : (
                <Text style={styles.stepPending}>Pending</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 72,
  },
  lineContainer: {
    width: 40,
    alignItems: 'center',
  },
  lineTop: {
    width: 2,
    flex: 1,
  },
  lineBottom: {
    width: 2,
    flex: 1,
  },
  lineCompleted: {
    backgroundColor: colors.success,
  },
  linePending: {
    backgroundColor: colors.border,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundGray,
  },
  dotCompleted: {
    backgroundColor: colors.success + '20',
  },
  dotCurrent: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dotFuture: {
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotIcon: {
    fontSize: 12,
  },
  content: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.lg,
  },
  contentFuture: {
    opacity: 0.5,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  stepTitleCurrent: {
    color: colors.primary,
  },
  stepTitleFuture: {
    color: colors.textMuted,
  },
  stepDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 2,
  },
  stepTimestamp: {
    fontSize: 11,
    color: colors.textMuted,
  },
  stepPending: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
