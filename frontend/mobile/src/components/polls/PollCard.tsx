import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Card } from '../ui/Card';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatNumber } from '../../lib/utils';
import type { Poll, PollOption } from '../../types/poll';

interface PollCardProps {
  poll: Poll;
  onPress?: () => void;
  onVote?: (optionId: string) => void;
  onRetract?: () => void;
  voting?: boolean;
}

const CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
  constituency: { icon: '\u{1F3DB}', label: 'Constituency', color: '#7C3AED' },
  satisfaction: { icon: '\u{2B50}', label: 'Satisfaction', color: '#D97706' },
  budget: { icon: '\u{1F4B0}', label: 'Budget', color: '#059669' },
  exit: { icon: '\u{1F5F3}', label: 'Exit Poll', color: '#DC2626' },
  custom: { icon: '\u{1F4CB}', label: 'Custom', color: '#2563EB' },
};

function getTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 1) return `${days} days left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 1) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  onPress,
  onVote,
  onRetract,
  voting = false,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const showResults = poll.hasVoted || !poll.isActive;
  const canRetract = poll.hasVoted && poll.isActive && !!onRetract;
  const meta = CATEGORY_META[poll.category] ?? CATEGORY_META.custom;
  const timeLeft = getTimeLeft(poll.expiresAt);
  const isEnded = timeLeft === 'Ended';
  const canVote = !showResults && poll.isActive && !!onVote;

  const handleSubmit = () => {
    if (!selectedId || !onVote) return;
    onVote(selectedId);
  };

  const handleCancel = () => {
    setSelectedId(null);
  };

  // Find the winning option
  const maxVotes = Math.max(...poll.options.map(o => o.votes), 0);

  const renderVoteOption = (option: PollOption) => {
    const isChosen = selectedId === option.id;

    return (
      <TouchableOpacity
        key={option.id}
        onPress={() => setSelectedId(option.id)}
        activeOpacity={0.7}
        style={[
          styles.voteOption,
          isChosen && styles.voteOptionChosen,
        ]}
        disabled={voting}
      >
        <View style={[styles.radioOuter, isChosen && styles.radioOuterChosen]}>
          {isChosen && <View style={styles.radioFilled} />}
        </View>
        <Text
          style={[styles.voteText, isChosen && styles.voteTextChosen]}
          numberOfLines={2}
        >
          {option.text}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderResultOption = (option: PollOption) => {
    const isSelected = poll.selectedOptionId === option.id;
    const isWinner = option.votes === maxVotes && maxVotes > 0;
    const pct = Math.round(option.percentage);

    return (
      <View
        key={option.id}
        style={[
          styles.resultOption,
          isSelected && styles.resultOptionSelected,
        ]}
      >
        <View
          style={[
            styles.resultBar,
            {
              width: `${pct}%`,
              backgroundColor: isSelected
                ? colors.primary + '20'
                : isWinner
                ? colors.success + '12'
                : colors.backgroundGray,
            },
          ]}
        />
        <View style={styles.resultContent}>
          <View style={styles.resultLeft}>
            {isSelected && (
              <View style={styles.checkCircle}>
                <Text style={styles.checkMark}>{'\u2713'}</Text>
              </View>
            )}
            <Text
              style={[
                styles.resultText,
                isSelected && styles.resultTextSelected,
                isWinner && styles.resultTextWinner,
              ]}
              numberOfLines={2}
            >
              {option.text}
            </Text>
          </View>
          <Text
            style={[
              styles.resultPct,
              isSelected && styles.resultPctSelected,
              isWinner && styles.resultPctWinner,
            ]}
          >
            {pct}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      {/* Top accent line */}
      <View style={[styles.accentLine, { backgroundColor: meta.color }]} />

      <View style={styles.body}>
        {/* Header row */}
        <View style={styles.header}>
          <View style={[styles.categoryPill, { backgroundColor: meta.color + '12' }]}>
            <Text style={styles.categoryIcon}>{meta.icon}</Text>
            <Text style={[styles.categoryLabel, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isEnded ? colors.textMuted : colors.success },
              ]}
            />
            <Text style={[styles.timeLeft, isEnded && styles.timeLeftEnded]}>
              {timeLeft}
            </Text>
          </View>
        </View>

        {/* Question */}
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={onPress ? 0.7 : 1}
          disabled={!onPress}
        >
          <Text style={styles.question}>{poll.title}</Text>
        </TouchableOpacity>

        {/* Options */}
        <View style={styles.options}>
          {showResults
            ? poll.options.map(renderResultOption)
            : poll.options.map(renderVoteOption)}
        </View>

        {/* Action buttons — only show when an option is selected but not yet submitted */}
        {canVote && selectedId && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
              disabled={voting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, voting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.7}
              disabled={voting}
            >
              {voting ? (
                <ActivityIndicator size={16} color={colors.white} />
              ) : (
                <Text style={styles.submitText}>Submit Vote</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Change vote button */}
        {canRetract && (
          <TouchableOpacity
            style={styles.retractButton}
            onPress={onRetract}
            activeOpacity={0.7}
            disabled={voting}
          >
            {voting ? (
              <ActivityIndicator size={14} color={colors.primary} />
            ) : (
              <Text style={styles.retractText}>Change my vote</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.votesIcon}>{'\u{1F5F3}'}</Text>
            <Text style={styles.votesCount}>
              {formatNumber(poll.totalVotes)} vote{poll.totalVotes !== 1 ? 's' : ''}
            </Text>
          </View>
          {poll.createdByName ? (
            <Text style={styles.createdBy}>by {poll.createdByName}</Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
  body: {
    padding: spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 12,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timeLeft: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  timeLeftEnded: {
    color: colors.textMuted,
  },

  // Question
  question: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },

  // Options container
  options: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  // Vote options (before voting)
  voteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    gap: spacing.md,
  },
  voteOptionChosen: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '06',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterChosen: {
    borderColor: colors.primary,
  },
  radioFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  voteText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 21,
  },
  voteTextChosen: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },

  // Result options (after voting)
  resultOption: {
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  resultOptionSelected: {
    borderColor: colors.primary + '40',
  },
  resultBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: borderRadius.md,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    zIndex: 1,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  resultText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  resultTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  resultTextWinner: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  resultPct: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
    marginLeft: spacing.sm,
    minWidth: 40,
    textAlign: 'right',
  },
  resultPctSelected: {
    color: colors.primary,
  },
  resultPctWinner: {
    color: colors.textPrimary,
  },

  // Retract
  retractButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  retractText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  votesIcon: {
    fontSize: 13,
  },
  votesCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  createdBy: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
