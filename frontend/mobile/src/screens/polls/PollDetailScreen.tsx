import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { PollCard } from '../../components/polls/PollCard';
import { Card } from '../../components/ui/Card';
import { usePoll, useVotePoll, useRetractVote } from '../../hooks/usePolls';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatDate, formatNumber } from '../../lib/utils';
import type { RootStackParamList } from '../../navigation/types';

type PollDetailRouteProp = RouteProp<RootStackParamList, 'PollDetail'>;

export const PollDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<PollDetailRouteProp>();
  const { pollId } = route.params;
  const { data: poll, isLoading } = usePoll(pollId);
  const voteMutation = useVotePoll();
  const retractMutation = useRetractVote();

  const handleVote = (optionId: string) => {
    voteMutation.mutate({ pollId, optionId });
  };

  const handleRetract = () => {
    retractMutation.mutate(pollId);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!poll) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>{t('polls.pollNotFound', 'Poll not found')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <PollCard
        poll={poll}
        onVote={handleVote}
        onRetract={handleRetract}
        voting={voteMutation.isPending || retractMutation.isPending}
      />

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>{t('polls.pollInformation', 'Poll Information')}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('polls.createdBy', 'Created By')}</Text>
          <Text style={styles.infoValue}>{poll.createdByName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('polls.createdOn', 'Created On')}</Text>
          <Text style={styles.infoValue}>{formatDate(poll.createdAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('polls.expiresOn', 'Expires On')}</Text>
          <Text style={styles.infoValue}>{formatDate(poll.expiresAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('polls.totalVotes', 'Total Votes')}</Text>
          <Text style={styles.infoValue}>{formatNumber(poll.totalVotes)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('polls.ward', 'Ward')}</Text>
          <Text style={styles.infoValue}>{poll.ward || t('polls.allWards', 'All wards')}</Text>
        </View>
      </Card>

      <Card style={styles.disclaimerCard}>
        <Text style={styles.disclaimerIcon}>{'\u{1F512}'}</Text>
        <Text style={styles.disclaimerText}>
          {t('polls.disclaimerText', 'All votes are anonymous and cannot be traced back to individual users. Results are verified on-chain for transparency.')}
        </Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  infoCard: {
    marginTop: spacing.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  disclaimerCard: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.info + '08',
  },
  disclaimerIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
    lineHeight: 18,
  },
});
