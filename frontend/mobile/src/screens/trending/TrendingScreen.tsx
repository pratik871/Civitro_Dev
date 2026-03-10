import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
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

const MOCK_TRENDING: TrendingTopic[] = [
  {
    id: 'trend-1',
    title: 'Metro Phase 3 Construction',
    mentions: 2340,
    sentiment: 'mixed',
    sentimentScore: 55,
    category: 'Infrastructure',
    change: 45,
    relatedIssues: 34,
  },
  {
    id: 'trend-2',
    title: 'Water Supply Crisis',
    mentions: 1890,
    sentiment: 'negative',
    sentimentScore: 25,
    category: 'Water',
    change: 120,
    relatedIssues: 67,
  },
  {
    id: 'trend-3',
    title: 'New Parks Initiative',
    mentions: 1450,
    sentiment: 'positive',
    sentimentScore: 82,
    category: 'Environment',
    change: 30,
    relatedIssues: 12,
  },
  {
    id: 'trend-4',
    title: 'Traffic Congestion HSR Layout',
    mentions: 1200,
    sentiment: 'negative',
    sentimentScore: 18,
    category: 'Traffic',
    change: 15,
    relatedIssues: 28,
  },
  {
    id: 'trend-5',
    title: 'Smart Street Lighting Pilot',
    mentions: 980,
    sentiment: 'positive',
    sentimentScore: 78,
    category: 'Technology',
    change: 200,
    relatedIssues: 8,
  },
  {
    id: 'trend-6',
    title: 'Garbage Segregation Drive',
    mentions: 870,
    sentiment: 'positive',
    sentimentScore: 71,
    category: 'Cleanliness',
    change: -10,
    relatedIssues: 19,
  },
  {
    id: 'trend-7',
    title: 'Footpath Encroachment',
    mentions: 650,
    sentiment: 'negative',
    sentimentScore: 22,
    category: 'Safety',
    change: 50,
    relatedIssues: 41,
  },
];

const SENTIMENT_CONFIG = {
  positive: { color: colors.success, label: 'Positive', icon: '\u{1F44D}' },
  negative: { color: colors.error, label: 'Negative', icon: '\u{1F44E}' },
  neutral: { color: colors.info, label: 'Neutral', icon: '\u2796' },
  mixed: { color: colors.warning, label: 'Mixed', icon: '\u{1F914}' },
};

const SENTIMENT_SUMMARY = {
  positive: 42,
  negative: 28,
  neutral: 18,
  mixed: 12,
};

export const TrendingScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
  }, []);

  const filters = ['all', 'positive', 'negative', 'mixed'];

  const filteredTopics =
    filter === 'all'
      ? MOCK_TRENDING
      : MOCK_TRENDING.filter(t => t.sentiment === filter);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trending Topics</Text>
        <Text style={styles.headerSubtitle}>
          What your community is talking about
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
        {/* Sentiment Overview */}
        <Card style={styles.sentimentOverview}>
          <Text style={styles.overviewTitle}>Community Sentiment</Text>
          <View style={styles.sentimentBar}>
            {Object.entries(SENTIMENT_SUMMARY).map(([key, value]) => (
              <View
                key={key}
                style={[
                  styles.sentimentSegment,
                  {
                    flex: value,
                    backgroundColor:
                      SENTIMENT_CONFIG[key as keyof typeof SENTIMENT_CONFIG].color,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.sentimentLabels}>
            {Object.entries(SENTIMENT_SUMMARY).map(([key, value]) => {
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
                {f === 'all' ? 'All Topics' : SENTIMENT_CONFIG[f as keyof typeof SENTIMENT_CONFIG].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Trending List */}
        {filteredTopics.map((topic, index) => {
          const sentimentConfig = SENTIMENT_CONFIG[topic.sentiment];
          return (
            <Card key={topic.id} style={styles.topicCard}>
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
                      {formatNumber(topic.mentions)} mentions
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
                  {topic.relatedIssues} issues
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
        })}

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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['4xl'],
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
  bottomSpacer: {
    height: 40,
  },
});
