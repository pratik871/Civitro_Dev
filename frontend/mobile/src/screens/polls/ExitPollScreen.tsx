import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useExitPolls } from '../../hooks/useExitPolls';
import { useVotePoll, useRetractVote } from '../../hooks/usePolls';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { Poll, PollOption } from '../../types/poll';
import type { RootStackParamList } from '../../navigation/types';

type ExitPollNavProp = NativeStackNavigationProp<RootStackParamList>;

const BAR_COLORS = ['#FF6B35', '#0B1426', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626'];

/** Returns a human-readable time remaining string or "Ended". */
function getTimeRemaining(expiresAt: string): { text: string; ended: boolean } {
  const now = Date.now();
  const end = new Date(expiresAt).getTime();
  const diff = end - now;

  if (diff <= 0) return { text: 'Ended', ended: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return { text: `${days}d ${hours}h remaining`, ended: false };
  if (hours > 0) return { text: `${hours}h ${minutes}m remaining`, ended: false };
  return { text: `${minutes}m remaining`, ended: false };
}

/** SVG horizontal bar chart for poll results. */
const ResultsBar: React.FC<{ options: PollOption[]; totalVotes: number }> = ({
  options,
  totalVotes,
}) => {
  const barWidth = 260;
  const barHeight = 28;
  const gap = 8;
  const chartHeight = options.length * (barHeight + gap);

  return (
    <View style={barStyles.container}>
      {options.map((opt, idx) => {
        const pct = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
        const fillWidth = Math.max((pct / 100) * barWidth, 2);
        const barColor = BAR_COLORS[idx % BAR_COLORS.length];

        return (
          <View key={opt.id} style={barStyles.row}>
            <View style={barStyles.labelRow}>
              <Text style={barStyles.optionText} numberOfLines={1}>
                {opt.text}
              </Text>
              <Text style={[barStyles.pctText, { color: barColor }]}>
                {pct.toFixed(1)}%
              </Text>
            </View>
            <Svg width={barWidth} height={barHeight}>
              <Rect
                x={0}
                y={0}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill="#F3F4F6"
              />
              <Rect
                x={0}
                y={0}
                width={fillWidth}
                height={barHeight}
                rx={6}
                fill={barColor}
                opacity={0.85}
              />
            </Svg>
            <Text style={barStyles.votesText}>
              {opt.votes.toLocaleString()} vote{opt.votes !== 1 ? 's' : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const barStyles = StyleSheet.create({
  container: {
    gap: 12,
    marginTop: spacing.sm,
  },
  row: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  pctText: {
    fontSize: 13,
    fontWeight: '700',
  },
  votesText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});

export const ExitPollScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ExitPollNavProp>();
  const { data: polls, isLoading, refetch } = useExitPolls();
  const voteMutation = useVotePoll();
  const retractMutation = useRetractVote();

  const activeCount = (polls ?? []).filter((p) => p.isActive).length;
  const totalVotes = (polls ?? []).reduce((sum, p) => sum + p.totalVotes, 0);

  const renderHeader = () => (
    <View>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{(polls ?? []).length}</Text>
          <Text style={styles.statLabel}>{t('polls.total', 'Total')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {activeCount}
          </Text>
          <Text style={styles.statLabel}>{t('polls.active', 'Active')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {totalVotes.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>{t('polls.votesLabel', 'Votes')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('polls.exitPolls', 'Exit Polls')}</Text>
    </View>
  );

  const renderPoll = ({ item }: { item: Poll }) => {
    const time = getTimeRemaining(item.expiresAt);
    const showResults = time.ended || item.hasVoted;

    return (
      <Card style={styles.pollCard}>
        {/* Poll Header */}
        <View style={styles.pollHeader}>
          <View style={styles.pollTitleRow}>
            <Text style={styles.pollTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Badge
              text={time.ended ? t('polls.ended', 'Ended') : t('polls.active', 'Active')}
              backgroundColor={
                time.ended ? colors.textMuted + '15' : colors.success + '15'
              }
              color={time.ended ? colors.textMuted : colors.success}
              size="sm"
            />
          </View>

          {item.description ? (
            <Text style={styles.pollDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.pollMeta}>
            <Text style={styles.pollMetaText}>
              {item.totalVotes.toLocaleString()} vote
              {item.totalVotes !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.pollMetaDot}> -- </Text>
            <Text
              style={[
                styles.pollMetaText,
                time.ended && { color: colors.error },
              ]}
            >
              {time.text}
            </Text>
          </View>
        </View>

        {/* Results or Vote Prompt */}
        {showResults ? (
          <View style={styles.resultsSection}>
            <ResultsBar options={item.options} totalVotes={item.totalVotes} />
            {item.hasVoted && !time.ended && (
              <TouchableOpacity
                style={styles.retractBtn}
                onPress={() => retractMutation.mutate(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.retractBtnText}>{t('polls.retractVote', 'Retract Vote')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.voteSection}>
            {item.options.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={styles.voteOption}
                onPress={() =>
                  voteMutation.mutate({ pollId: item.id, optionId: opt.id })
                }
                activeOpacity={0.7}
                disabled={voteMutation.isPending}
              >
                <Text style={styles.voteOptionText}>{opt.text}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.voteHint}>{t('polls.tapToVote', 'Tap an option to vote')}</Text>
          </View>
        )}

        {/* View Details */}
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() =>
            navigation.navigate('PollDetail', { pollId: item.id })
          }
          activeOpacity={0.7}
        >
          <Text style={styles.detailBtnText}>{t('polls.viewDetails', 'View Details')}</Text>
        </TouchableOpacity>
      </Card>
    );
  };

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
        data={polls ?? []}
        renderItem={renderPoll}
        keyExtractor={(item) => item.id}
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
            <Text style={styles.emptyTitle}>{t('polls.noExitPollsYet', 'No exit polls yet')}</Text>
            <Text style={styles.emptyText}>
              {t('polls.exitPollsWillAppear', 'Exit polls will appear here when they become available for your constituency.')}
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

  // Poll Card
  pollCard: {
    marginBottom: spacing.md,
  },
  pollHeader: {
    marginBottom: spacing.md,
  },
  pollTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  pollTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  pollDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  pollMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  pollMetaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  pollMetaDot: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Results
  resultsSection: {
    marginBottom: spacing.md,
  },

  // Vote Section
  voteSection: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  voteOption: {
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  voteOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  voteHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Retract
  retractBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.button,
  },
  retractBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // Detail Button
  detailBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
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
