import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatNumber } from '../../lib/utils';

interface TrendingTopic {
  id: string;
  title: string;
  mentions: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentimentScore: number;
  category: string;
  change: number; // percentage change
  relatedIssues: number;
}

const SENTIMENT_CONFIG_BASE = {
  positive: { color: colors.success, labelKey: 'trending.positive', labelDefault: 'Positive', icon: '\u{1F44D}' },
  negative: { color: colors.error, labelKey: 'trending.negative', labelDefault: 'Negative', icon: '\u{1F44E}' },
  neutral: { color: colors.info, labelKey: 'trending.neutral', labelDefault: 'Neutral', icon: '\u2796' },
  mixed: { color: colors.warning, labelKey: 'trending.mixed', labelDefault: 'Mixed', icon: '\u{1F914}' },
};

export const TrendingScreen: React.FC = () => {
  const { t } = useTranslation();

  const SENTIMENT_CONFIG = Object.fromEntries(
    Object.entries(SENTIMENT_CONFIG_BASE).map(([key, val]) => [
      key,
      { color: val.color, label: t(val.labelKey, val.labelDefault), icon: val.icon },
    ]),
  ) as Record<string, { color: string; label: string; icon: string }>;

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [filter, setFilter] = useState<string>('all');

  const { data: trending, isLoading, refetch } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get<TrendingTopic[]>('/api/v1/issues/trending'),
    staleTime: 30000,
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filters = ['all', 'positive', 'negative', 'mixed'];

  const trendingData = trending ?? [];
  const filteredTopics =
    filter === 'all'
      ? trendingData
      : trendingData.filter(t => t.sentiment === filter);

  // Compute sentiment summary from real data
  const sentimentSummary = (() => {
    if (trendingData.length === 0) return null;
    const counts = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
    trendingData.forEach(t => {
      counts[t.sentiment] = (counts[t.sentiment] || 0) + 1;
    });
    const total = trendingData.length;
    return {
      positive: Math.round((counts.positive / total) * 100),
      negative: Math.round((counts.negative / total) * 100),
      neutral: Math.round((counts.neutral / total) * 100),
      mixed: Math.round((counts.mixed / total) * 100),
    };
  })();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle}>{t('trending.trendingTopics', 'Trending Topics')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('trending.communityTalking', 'What your community is talking about')}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Community Voices card */}
        <TouchableOpacity
          style={styles.voicesCard}
          onPress={() => navigation.navigate('VoicesList' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.voicesLeft}>
            <Text style={styles.voicesIcon}>{'\u{1F399}'}</Text>
            <View>
              <Text style={styles.voicesTitle}>{t('trending.communityVoices', 'Community Voices')}</Text>
              <Text style={styles.voicesSubtitle}>{t('trending.seeWhatCitizens', 'See what citizens are saying')}</Text>
            </View>
          </View>
          <Text style={styles.voicesArrow}>{'\u203A'}</Text>
        </TouchableOpacity>

        {/* Sentiment Overview — only shown when data is available */}
        {sentimentSummary && (
          <Card style={styles.sentimentOverview}>
            <Text style={styles.overviewTitle}>{t('trending.communitySentiment', 'Community Sentiment')}</Text>
            <View style={styles.sentimentBar}>
              {Object.entries(sentimentSummary).map(([key, value]) => (
                <View
                  key={key}
                  style={[
                    styles.sentimentSegment,
                    {
                      flex: value || 0,
                      backgroundColor:
                        SENTIMENT_CONFIG[key as keyof typeof SENTIMENT_CONFIG].color,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.sentimentLabels}>
              {Object.entries(sentimentSummary).map(([key, value]) => {
                const config = SENTIMENT_CONFIG[key as keyof typeof SENTIMENT_CONFIG];
                return (
                  <View key={key} style={styles.sentimentLabelItem}>
                    <View
                      style={[
                        styles.sentimentDot,
                        { backgroundColor: config.color },
                      ]}
                    />
                    <Text style={styles.sentimentLabelText}>
                      {config.label} {value}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                filter === f && styles.filterChipActive,
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === f && styles.filterChipTextActive,
                ]}
              >
                {f === 'all' ? t('trending.allTopics', 'All Topics') : SENTIMENT_CONFIG[f as keyof typeof SENTIMENT_CONFIG].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Trending List */}
        {filteredTopics.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F4CA}'}</Text>
            <Text style={styles.emptyText}>{t('trending.noTrendingTopics', 'No trending topics yet')}</Text>
          </View>
        ) : (
          filteredTopics.map((topic, index) => {
            const sentimentConfig = SENTIMENT_CONFIG[topic.sentiment];
            return (
              <Card key={topic.id} style={styles.topicCard} onPress={() => navigation.navigate('IssuesList' as any, { category: topic.id })}>
                <View style={styles.topicHeader}>
                  <View style={styles.topicRank}>
                    <Text style={styles.rankNumber}>#{index + 1}</Text>
                  </View>
                  <View style={styles.topicInfo}>
                    <Text style={styles.topicTitle}>{topic.title}</Text>
                    <View style={styles.topicMeta}>
                      <Badge
                        text={topic.category}
                        backgroundColor={colors.navy + '10'}
                        color={colors.navy}
                        size="sm"
                      />
                      <Text style={styles.mentionCount}>
                        {formatNumber(topic.mentions)} {t('trending.mentions', 'mentions')}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.topicStats}>
                  <View style={styles.sentimentPill}>
                    <Text style={styles.sentimentIcon}>
                      {sentimentConfig.icon}
                    </Text>
                    <Text
                      style={[
                        styles.sentimentText,
                        { color: sentimentConfig.color },
                      ]}
                    >
                      {sentimentConfig.label} ({topic.sentimentScore}%)
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.changeText,
                      {
                        color:
                          topic.change > 0 ? colors.success : colors.textMuted,
                      },
                    ]}
                  >
                    {topic.change > 0 ? '\u2191' : '\u2193'}{' '}
                    {Math.abs(topic.change)}%
                  </Text>

                  <Text style={styles.relatedText}>
                    {topic.relatedIssues} {t('trending.issues', 'issues')}
                  </Text>
                </View>

                {/* Sentiment bar */}
                <View style={styles.topicSentimentBar}>
                  <View
                    style={[
                      styles.topicSentimentFill,
                      {
                        width: `${topic.sentimentScore}%`,
                        backgroundColor: sentimentConfig.color,
                      },
                    ]}
                  />
                </View>
              </Card>
            );
          })
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  sentimentOverview: {
    marginBottom: spacing.lg,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sentimentBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.md,
    gap: 2,
  },
  sentimentSegment: {
    borderRadius: 6,
  },
  sentimentLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  sentimentLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sentimentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sentimentLabelText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  filterRow: {
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  topicCard: {
    marginBottom: spacing.md,
  },
  topicHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  topicRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mentionCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  topicStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  sentimentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sentimentIcon: {
    fontSize: 14,
  },
  sentimentText: {
    fontSize: 13,
    fontWeight: '500',
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  relatedText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  topicSentimentBar: {
    height: 4,
    backgroundColor: colors.backgroundGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  topicSentimentFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  bottomSpacer: {
    height: 40,
  },
  voicesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  voicesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voicesIcon: {
    fontSize: 28,
  },
  voicesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1426',
  },
  voicesSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  voicesArrow: {
    fontSize: 24,
    color: '#7C3AED',
    fontWeight: '300',
  },
});
