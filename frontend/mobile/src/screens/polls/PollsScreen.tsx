import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { PollCard } from '../../components/polls/PollCard';
import { usePolls, useVotePoll, useRetractVote } from '../../hooks/usePolls';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { Poll } from '../../types/poll';
import type { RootStackParamList } from '../../navigation/types';

type PollsNavProp = NativeStackNavigationProp<RootStackParamList>;

export const PollsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<PollsNavProp>();
  const route = useRoute();
  const myVoted = (route.params as any)?.myVoted as boolean | undefined;
  const { data: polls, isLoading, refetch } = usePolls();
  const voteMutation = useVotePoll();
  const retractMutation = useRetractVote();

  const handleVote = (pollId: string, optionId: string) => {
    voteMutation.mutate({ pollId, optionId });
  };

  const handleRetract = (pollId: string) => {
    retractMutation.mutate(pollId);
  };

  // Sort only on first load — preserve order after voting
  const sortedOnce = useRef(false);
  const sortedOrderRef = useRef<string[]>([]);

  const rawPolls = myVoted ? (polls ?? []).filter(p => p.hasVoted) : (polls ?? []);

  if (!sortedOnce.current && rawPolls.length > 0) {
    const sorted = [...rawPolls].sort((a, b) => {
      if (a.isActive && !a.hasVoted && (!b.isActive || b.hasVoted)) return -1;
      if (b.isActive && !b.hasVoted && (!a.isActive || a.hasVoted)) return 1;
      if (a.isActive && !b.isActive) return -1;
      if (b.isActive && !a.isActive) return 1;
      return 0;
    });
    sortedOrderRef.current = sorted.map(p => p.id);
    sortedOnce.current = true;
  }

  // Use saved order, fall back to raw order
  const allPolls = sortedOrderRef.current.length > 0
    ? sortedOrderRef.current.map(id => rawPolls.find(p => p.id === id)).filter(Boolean) as typeof rawPolls
    : rawPolls;

  const activeCount = allPolls.filter(p => p.isActive).length;
  const totalVotes = allPolls.reduce((sum, p) => sum + p.totalVotes, 0);

  const renderHeader = () => (
    <View>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{allPolls.length}</Text>
          <Text style={styles.statLabel}>{t('polls.total', 'Total')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>{t('polls.active', 'Active')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{totalVotes}</Text>
          <Text style={styles.statLabel}>{t('polls.votesLabel', 'Votes')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('polls.communityPolls', 'Community Polls')}</Text>
    </View>
  );

  const renderPoll = ({ item }: { item: Poll }) => (
    <PollCard
      poll={item}
      onPress={() => navigation.navigate('PollDetail', { pollId: item.id })}
      onVote={(optionId) => handleVote(item.id, optionId)}
      onRetract={() => handleRetract(item.id)}
      voting={voteMutation.isPending || retractMutation.isPending}
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <FlatList
        data={allPolls}
        renderItem={renderPoll}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F5F3}'}</Text>
            <Text style={styles.emptyTitle}>{t('polls.noPollsYet', 'No polls yet')}</Text>
            <Text style={styles.emptyText}>
              {t('polls.pollsWillAppear', 'Community polls will appear here when they become available.')}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing['3xl'],
  },
});
