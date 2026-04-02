import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { ScoreRing } from '../../components/ui/ScoreRing';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

interface CHICategory {
  name: string;
  score: number;
  icon: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

interface CHIData {
  overallScore: number;
  categories: CHICategory[];
  constituency?: string;
  trend?: { change: number; period: string };
}

const TREND_ICONS = {
  up: '\u2191',
  down: '\u2193',
  stable: '\u2192',
};

const TREND_COLORS = {
  up: colors.success,
  down: colors.error,
  stable: colors.textMuted,
};

export const CHIScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList>>();
  const constituencyId = (route.params as { constituencyId?: string } | undefined)?.constituencyId;

  const { data: chiData, isLoading } = useQuery<CHIData>({
    queryKey: ['chi', constituencyId],
    queryFn: () => api.get(constituencyId ? `/api/v1/issues/chi?constituency=${constituencyId}` : '/api/v1/issues/chi'),
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!chiData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>{t('chi.noData', 'CHI data not available yet')}</Text>
      </View>
    );
  }

  const overallScore = chiData.overallScore;
  const categories = chiData.categories ?? [];
  const trendChange = chiData.trend?.change ?? 0;
  const trendPeriod = chiData.trend?.period ?? t('chi.vsLastMonth', 'vs last month');
  const trendColor = trendChange >= 0 ? colors.success : colors.error;
  const trendArrow = trendChange >= 0 ? '\u2191' : '\u2193';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Overall Score */}
      <Card style={styles.overallCard}>
        <View style={styles.overallContent}>
          <ScoreRing
            score={overallScore}
            size={100}
            strokeWidth={7}
            label="CHI"
          />
          <View style={styles.overallInfo}>
            <Text style={styles.overallTitle}>
              {t('chi.constituencyHealthIndex', 'Constituency Health Index')}
            </Text>
            <Text style={styles.overallSubtitle}>
              {chiData.constituency ?? ''}
            </Text>
            <Text style={styles.overallDesc}>
              {t('chi.compositeScoreDesc', 'Composite score measuring the overall health and governance quality of your constituency.')}
            </Text>
            <View style={styles.trendRow}>
              <Text style={[styles.trendText, { color: trendColor }]}>
                {trendArrow} {trendChange > 0 ? '+' : ''}{trendChange} pts
              </Text>
              <Text style={styles.trendPeriod}>{trendPeriod}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Score Breakdown */}
      <Text style={styles.sectionTitle}>{t('chi.scoreBreakdown', 'Score Breakdown')}</Text>
      <Text style={styles.sectionSubtitle}>
        {t('chi.keyAreas', '{{count}} key areas that determine your constituency health', { count: categories.length })}
      </Text>

      {categories.map(category => {
        const scoreColor =
          category.score >= 75
            ? colors.success
            : category.score >= 50
            ? colors.warning
            : colors.error;

        return (
          <Card key={category.name} style={styles.categoryCard}>
            <View style={styles.categoryRow}>
              <View style={styles.categoryIconContainer}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <View style={styles.categoryBarBg}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        width: `${category.score}%`,
                        backgroundColor: scoreColor,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.categoryScore}>
                <Text style={[styles.scoreValue, { color: scoreColor }]}>
                  {category.score}
                </Text>
                <Text
                  style={[
                    styles.trendIndicator,
                    { color: TREND_COLORS[category.trend] },
                  ]}
                >
                  {TREND_ICONS[category.trend]}{' '}
                  {category.change > 0 ? `+${category.change}` : category.change}
                </Text>
              </View>
            </View>
          </Card>
        );
      })}

      {/* Methodology */}
      <Card style={styles.methodCard}>
        <Text style={styles.methodTitle}>{'\u{2139}\uFE0F'} {t('chi.howCalculated', 'How CHI is Calculated')}</Text>
        <Text style={styles.methodText}>
          {t('chi.methodologyText', 'The Constituency Health Index (CHI) is a composite score from 0-100 computed from 10 key governance areas. Data sources include citizen reports, government data, survey responses, and real-time issue tracking. Scores are updated monthly.')}
        </Text>
      </Card>

      <View style={styles.bottomSpacer} />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  overallCard: {
    marginBottom: spacing.xl,
  },
  overallContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overallInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  overallSubtitle: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  overallDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendPeriod: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  categoryCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  categoryBarBg: {
    height: 6,
    backgroundColor: colors.backgroundGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryScore: {
    alignItems: 'flex-end',
    minWidth: 44,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  trendIndicator: {
    fontSize: 11,
    fontWeight: '500',
  },
  methodCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.navy + '05',
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  methodText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});
