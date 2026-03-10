import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

interface CHICategory {
  name: string;
  score: number;
  icon: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

const MOCK_CHI_SCORE = 68;

const MOCK_CATEGORIES: CHICategory[] = [
  { name: 'Infrastructure', score: 72, icon: '\u{1F3D7}', trend: 'up', change: 3 },
  { name: 'Cleanliness', score: 65, icon: '\u{1F9F9}', trend: 'down', change: -2 },
  { name: 'Water & Sanitation', score: 58, icon: '\u{1F4A7}', trend: 'stable', change: 0 },
  { name: 'Healthcare', score: 71, icon: '\u{1F3E5}', trend: 'up', change: 5 },
  { name: 'Education', score: 78, icon: '\u{1F393}', trend: 'up', change: 2 },
  { name: 'Public Safety', score: 62, icon: '\u{1F6E1}', trend: 'down', change: -1 },
  { name: 'Transport', score: 55, icon: '\u{1F68C}', trend: 'stable', change: 1 },
  { name: 'Environment', score: 70, icon: '\u{1F333}', trend: 'up', change: 4 },
  { name: 'Governance Response', score: 68, icon: '\u{1F3DB}', trend: 'up', change: 6 },
  { name: 'Citizen Engagement', score: 75, icon: '\u{1F465}', trend: 'up', change: 8 },
];

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
            score={MOCK_CHI_SCORE}
            size={100}
            strokeWidth={7}
            label="CHI"
          />
          <View style={styles.overallInfo}>
            <Text style={styles.overallTitle}>
              Constituency Health Index
            </Text>
            <Text style={styles.overallSubtitle}>
              Bangalore South - Ward 15
            </Text>
            <Text style={styles.overallDesc}>
              Composite score measuring the overall health and governance quality
              of your constituency.
            </Text>
            <View style={styles.trendRow}>
              <Text style={[styles.trendText, { color: colors.success }]}>
                {'\u2191'} +3.2 pts
              </Text>
              <Text style={styles.trendPeriod}>vs last month</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Score Breakdown */}
      <Text style={styles.sectionTitle}>Score Breakdown</Text>
      <Text style={styles.sectionSubtitle}>
        10 key areas that determine your constituency health
      </Text>

      {MOCK_CATEGORIES.map(category => {
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
        <Text style={styles.methodTitle}>{'\u{2139}\uFE0F'} How CHI is Calculated</Text>
        <Text style={styles.methodText}>
          The Constituency Health Index (CHI) is a composite score from 0-100 computed
          from 10 key governance areas. Data sources include citizen reports, government
          data, survey responses, and real-time issue tracking. Scores are updated monthly.
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
