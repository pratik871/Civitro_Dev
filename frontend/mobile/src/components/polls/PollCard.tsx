import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime, formatNumber } from '../../lib/utils';
import type { Poll } from '../../types/poll';

interface PollCardProps {
  poll: Poll;
  onPress?: () => void;
  onVote?: (optionId: string) => void;
}

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  onPress,
  onVote,
}) => {
  const showResults = poll.hasVoted || !poll.isActive;

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Badge
          text={poll.isActive ? 'Active' : 'Closed'}
          backgroundColor={poll.isActive ? colors.success + '15' : colors.textMuted + '15'}
          color={poll.isActive ? colors.success : colors.textMuted}
          size="sm"
        />
        <Text style={styles.time}>
          {formatRelativeTime(poll.createdAt)}
        </Text>
      </View>

      <Text style={styles.title}>{poll.title}</Text>
      {poll.description ? (
        <Text style={styles.description}>{poll.description}</Text>
      ) : null}

      <View style={styles.options}>
        {poll.options.map(option => (
          <TouchableOpacity
            key={option.id}
            onPress={() => {
              if (!showResults && poll.isActive && onVote) {
                onVote(option.id);
              }
            }}
            style={[
              styles.optionButton,
              poll.selectedOptionId === option.id && styles.optionSelected,
            ]}
            disabled={showResults}
          >
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionText,
                  poll.selectedOptionId === option.id && styles.optionTextSelected,
                ]}
              >
                {option.text}
              </Text>
              {showResults && (
                <Text style={styles.optionPercentage}>
                  {option.percentage}%
                </Text>
              )}
            </View>
            {showResults && (
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${option.percentage}%`,
                      backgroundColor:
                        poll.selectedOptionId === option.id
                          ? colors.primary
                          : colors.navy + '30',
                    },
                  ]}
                />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.totalVotes}>
        {formatNumber(poll.totalVotes)} votes
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  time: {
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
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  options: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  optionPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: colors.backgroundGray,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  totalVotes: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
