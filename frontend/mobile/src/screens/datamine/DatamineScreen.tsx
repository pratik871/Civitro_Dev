import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatsBar } from '../../components/ui/StatsCard';
import { useAuthStore } from '../../stores/authStore';
import {
  useIssueTrends,
  useDemographics,
  useCreateReport,
  useReport,
  type IssueTrendPoint,
} from '../../hooks/useDatamine';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Category color palette for charts
const CATEGORY_COLORS: Record<string, string> = {
  pothole: '#DC2626',
  garbage: '#EA580C',
  streetlight: '#EAB308',
  water_supply: '#2563EB',
  road_damage: '#D97706',
  construction: '#7C3AED',
  drainage: '#0D9488',
  traffic: '#DC2626',
  healthcare: '#16A34A',
  education: '#2563EB',
  public_safety: '#1E293B',
  other: '#6B7280',
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] || colors.primary;
}

function formatCategory(cat: string): string {
  return cat
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------- Bar Chart Component ----------

interface BarChartProps {
  data: { label: string; value: number; color: string }[];
  width: number;
  height: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, width, height }) => {
  if (data.length === 0) return null;

  const paddingLeft = 36;
  const paddingBottom = 32;
  const paddingTop = 12;
  const paddingRight = 8;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barGap = 4;
  const barWidth = Math.max(
    4,
    (chartW - barGap * (data.length - 1)) / data.length,
  );

  // Y-axis ticks
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round((maxVal / tickCount) * i),
  );

  return (
    <Svg width={width} height={height}>
      {/* Y axis gridlines + labels */}
      {ticks.map((tick) => {
        const y = paddingTop + chartH - (tick / maxVal) * chartH;
        return (
          <G key={`tick-${tick}`}>
            <Line
              x1={paddingLeft}
              y1={y}
              x2={width - paddingRight}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4,3"
            />
            <SvgText
              x={paddingLeft - 6}
              y={y + 4}
              fontSize={10}
              fill={colors.textMuted}
              textAnchor="end"
            >
              {tick}
            </SvgText>
          </G>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = paddingLeft + i * (barWidth + barGap);
        const y = paddingTop + chartH - barH;
        return (
          <G key={`bar-${i}`}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={3}
              fill={d.color}
            />
            <SvgText
              x={x + barWidth / 2}
              y={height - paddingBottom + 14}
              fontSize={9}
              fill={colors.textMuted}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
};

// ---------- Horizontal Bar Chart ----------

interface HBarChartProps {
  data: { label: string; value: number; color: string }[];
  width: number;
}

const HorizontalBarChart: React.FC<HBarChartProps> = ({ data, width }) => {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barHeight = 20;
  const gap = 10;
  const labelWidth = 90;
  const valueWidth = 36;
  const chartWidth = width - labelWidth - valueWidth - 16;
  const totalHeight = data.length * (barHeight + gap) + gap;

  return (
    <Svg width={width} height={totalHeight}>
      {data.map((d, i) => {
        const y = gap + i * (barHeight + gap);
        const barW = Math.max(4, (d.value / maxVal) * chartWidth);
        return (
          <G key={`hbar-${i}`}>
            <SvgText
              x={labelWidth - 4}
              y={y + barHeight / 2 + 4}
              fontSize={11}
              fill={colors.textSecondary}
              textAnchor="end"
              fontWeight="500"
            >
              {d.label.length > 12 ? d.label.slice(0, 12) + '..' : d.label}
            </SvgText>
            <Rect
              x={labelWidth}
              y={y}
              width={barW}
              height={barHeight}
              rx={4}
              fill={d.color}
              opacity={0.85}
            />
            <SvgText
              x={labelWidth + barW + 6}
              y={y + barHeight / 2 + 4}
              fontSize={11}
              fill={colors.textPrimary}
              fontWeight="600"
            >
              {d.value}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
};

// ---------- Main Screen ----------

export const DatamineScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const boundaryId = user?.ward || user?.constituency;

  const { data: trendsData, isLoading: trendsLoading } =
    useIssueTrends(boundaryId);
  const { data: demoData, isLoading: demoLoading } =
    useDemographics(boundaryId);

  const createReport = useCreateReport();
  const [activeReportId, setActiveReportId] = useState<string | undefined>();
  const { data: reportData } = useReport(activeReportId);

  // Aggregate trends by month for bar chart
  const monthlyBars = useMemo(() => {
    if (!trendsData?.trends?.length) return [];
    const byMonth: Record<string, { label: string; total: number }> = {};
    trendsData.trends.forEach((t: IssueTrendPoint) => {
      // date is "YYYY-MM-DD" or "YYYY-MM"
      const month = t.date.slice(0, 7);
      const label = month.slice(5); // "MM"
      if (!byMonth[month]) byMonth[month] = { label, total: 0 };
      byMonth[month].total += t.count;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, v]) => ({
        label: v.label,
        value: v.total,
        color: colors.primary,
      }));
  }, [trendsData]);

  // Top categories aggregated from trends
  const topCategories = useMemo(() => {
    if (!trendsData?.trends?.length) return [];
    const byCat: Record<string, number> = {};
    trendsData.trends.forEach((t: IssueTrendPoint) => {
      byCat[t.category] = (byCat[t.category] || 0) + t.count;
    });
    return Object.entries(byCat)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([cat, count]) => ({
        label: formatCategory(cat),
        value: count,
        color: categoryColor(cat),
      }));
  }, [trendsData]);

  // Stats
  const totalIssues = useMemo(() => {
    if (!trendsData?.trends?.length) return 0;
    return trendsData.trends.reduce(
      (sum: number, t: IssueTrendPoint) => sum + t.count,
      0,
    );
  }, [trendsData]);

  const avgResolution = useMemo(() => {
    if (!trendsData?.trends?.length) return 0;
    const rates = trendsData.trends
      .filter((t: IssueTrendPoint) => t.resolution_rate > 0)
      .map((t: IssueTrendPoint) => t.resolution_rate);
    if (rates.length === 0) return 0;
    return Math.round(
      (rates.reduce((s: number, r: number) => s + r, 0) / rates.length) * 100,
    );
  }, [trendsData]);

  const handleGenerateReport = async () => {
    if (!boundaryId) {
      Alert.alert(t('datamine.noWard', 'No ward'), t('datamine.wardRequired', 'Ward information is required to generate a report.'));
      return;
    }
    try {
      const report = await createReport.mutateAsync({
        type: 'issue_trends',
        boundary_id: boundaryId,
      });
      setActiveReportId(report.id);
    } catch {
      Alert.alert(t('common.error', 'Error'), t('datamine.failedReport', 'Failed to start report generation.'));
    }
  };

  const isLoading = trendsLoading || demoLoading;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('datamine.loadingAnalytics', 'Loading analytics...')}</Text>
      </View>
    );
  }

  if (!boundaryId) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyIcon}>{'\u{1F4CA}'}</Text>
        <Text style={styles.emptyText}>
          {t('datamine.wardNotAvailable', 'Ward information not available. Update your profile to view analytics.')}
        </Text>
      </View>
    );
  }

  const chartWidth = 340; // approximate; will be constrained by container

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <Text style={styles.title}>{t('datamine.title', 'Datamine Analytics')}</Text>
      <Text style={styles.subtitle}>
        {t('datamine.wardInsights', 'Ward-level insights for {{ward}}', { ward: boundaryId })}
      </Text>

      {/* Stats Cards */}
      <StatsBar
        stats={[
          {
            label: t('datamine.totalIssues', 'Total Issues'),
            value: totalIssues,
            color: colors.primary,
          },
          {
            label: t('datamine.resolvedPct', 'Resolved %'),
            value: `${avgResolution}%`,
            color: colors.success,
          },
          {
            label: t('datamine.activeUsers', 'Active Users'),
            value: demoData?.activity_metrics?.avg_daily_active_users ?? '--',
            color: colors.info,
          },
        ]}
        style={styles.statsBar}
      />

      {/* Issue Trends Bar Chart */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('datamine.issueTrends', 'Issue Trends')}</Text>
          <Badge
            text={`${trendsData?.period_days ?? 30}d`}
            backgroundColor={colors.primary + '15'}
            color={colors.primary}
            size="sm"
          />
        </View>
        {monthlyBars.length > 0 ? (
          <BarChart data={monthlyBars} width={chartWidth} height={200} />
        ) : (
          <Text style={styles.noData}>{t('datamine.noTrendData', 'No trend data available')}</Text>
        )}
      </Card>

      {/* Top Categories Horizontal Bars */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('datamine.topCategories', 'Top Categories')}</Text>
        {topCategories.length > 0 ? (
          <HorizontalBarChart data={topCategories} width={chartWidth} />
        ) : (
          <Text style={styles.noData}>{t('datamine.noCategoryData', 'No category data available')}</Text>
        )}
      </Card>

      {/* Demographics Section */}
      {demoData && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('datamine.demographics', 'Demographics')}</Text>

          <View style={styles.demoRow}>
            <View style={styles.demoItem}>
              <Text style={styles.demoValue}>{demoData.total_users}</Text>
              <Text style={styles.demoLabel}>{t('datamine.totalUsers', 'Total Users')}</Text>
            </View>
            <View style={styles.demoItem}>
              <Text style={styles.demoValue}>
                {demoData.verification_breakdown.aadhaar_verified}
              </Text>
              <Text style={styles.demoLabel}>{t('datamine.aadhaarVerified', 'Aadhaar Verified')}</Text>
            </View>
            <View style={styles.demoItem}>
              <Text style={styles.demoValue}>
                {demoData.verification_breakdown.phone_verified}
              </Text>
              <Text style={styles.demoLabel}>{t('datamine.phoneVerified', 'Phone Verified')}</Text>
            </View>
          </View>

          {/* Verification breakdown bar */}
          <View style={styles.verBarContainer}>
            <Text style={styles.verBarLabel}>{t('datamine.verificationBreakdown', 'Verification Breakdown')}</Text>
            <View style={styles.verBar}>
              {demoData.total_users > 0 && (
                <>
                  <View
                    style={[
                      styles.verSegment,
                      {
                        flex: demoData.verification_breakdown.aadhaar_verified,
                        backgroundColor: colors.success,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.verSegment,
                      {
                        flex: demoData.verification_breakdown.phone_verified,
                        backgroundColor: colors.info,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.verSegment,
                      {
                        flex: demoData.verification_breakdown.unverified,
                        backgroundColor: colors.border,
                      },
                    ]}
                  />
                </>
              )}
            </View>
            <View style={styles.verLegend}>
              <View style={styles.verLegendItem}>
                <View
                  style={[styles.verDot, { backgroundColor: colors.success }]}
                />
                <Text style={styles.verLegendText}>{t('datamine.aadhaar', 'Aadhaar')}</Text>
              </View>
              <View style={styles.verLegendItem}>
                <View
                  style={[styles.verDot, { backgroundColor: colors.info }]}
                />
                <Text style={styles.verLegendText}>{t('datamine.phone', 'Phone')}</Text>
              </View>
              <View style={styles.verLegendItem}>
                <View
                  style={[styles.verDot, { backgroundColor: colors.border }]}
                />
                <Text style={styles.verLegendText}>{t('datamine.unverified', 'Unverified')}</Text>
              </View>
            </View>
          </View>

          {/* Activity Metrics */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
            {t('datamine.activityLast30', 'Activity (Last 30 Days)')}
          </Text>
          <View style={styles.demoRow}>
            <View style={styles.demoItem}>
              <Text style={[styles.demoValue, { color: colors.primary }]}>
                {demoData.activity_metrics.issues_last_30d}
              </Text>
              <Text style={styles.demoLabel}>{t('datamine.issues', 'Issues')}</Text>
            </View>
            <View style={styles.demoItem}>
              <Text style={[styles.demoValue, { color: colors.info }]}>
                {demoData.activity_metrics.voices_last_30d}
              </Text>
              <Text style={styles.demoLabel}>{t('datamine.voices', 'Voices')}</Text>
            </View>
            <View style={styles.demoItem}>
              <Text style={[styles.demoValue, { color: colors.success }]}>
                {demoData.activity_metrics.polls_participated_last_30d}
              </Text>
              <Text style={styles.demoLabel}>{t('datamine.pollVotes', 'Poll Votes')}</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Heatmap CTA */}
      <Card
        style={styles.heatmapCta}
        onPress={() =>
          navigation.navigate('Heatmap', { boundaryId: boundaryId })
        }
      >
        <View style={styles.heatmapCtaRow}>
          <View style={styles.heatmapCtaInfo}>
            <Text style={styles.heatmapCtaTitle}>{t('datamine.issueHeatmap', 'Issue Heatmap')}</Text>
            <Text style={styles.heatmapCtaDesc}>
              {t('datamine.heatmapDesc', 'View geographic distribution of issues in your ward')}
            </Text>
          </View>
          <Text style={styles.heatmapCtaArrow}>{'\u2192'}</Text>
        </View>
      </Card>

      {/* Generate Report */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('datamine.generateReport', 'Generate Report')}</Text>
        <Text style={styles.reportDesc}>
          {t('datamine.reportDesc', 'Create a detailed analytics report for your ward. This may take a few moments to process.')}
        </Text>
        <Button
          title={
            createReport.isPending
              ? t('datamine.starting', 'Starting...')
              : activeReportId
              ? t('datamine.generateAnother', 'Generate Another Report')
              : t('datamine.generateReport', 'Generate Report')
          }
          onPress={handleGenerateReport}
          loading={createReport.isPending}
          variant="primary"
          size="md"
          fullWidth
          style={styles.reportBtn}
        />

        {/* Report Status */}
        {reportData && (
          <View style={styles.reportStatus}>
            <View style={styles.reportStatusRow}>
              <Text style={styles.reportStatusLabel}>{t('datamine.status', 'Status')}:</Text>
              <Badge
                text={reportData.status}
                backgroundColor={
                  reportData.status === 'completed'
                    ? colors.success + '20'
                    : reportData.status === 'failed'
                    ? colors.error + '20'
                    : colors.warning + '20'
                }
                color={
                  reportData.status === 'completed'
                    ? colors.success
                    : reportData.status === 'failed'
                    ? colors.error
                    : colors.warning
                }
                size="sm"
              />
            </View>
            {reportData.status === 'processing' && (
              <View style={styles.reportProcessing}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.reportProcessingText}>
                  {t('datamine.processingReport', 'Processing report...')}
                </Text>
              </View>
            )}
            {reportData.status === 'queued' && (
              <View style={styles.reportProcessing}>
                <ActivityIndicator size="small" color={colors.warning} />
                <Text style={styles.reportProcessingText}>
                  {t('datamine.queuedProcessing', 'Queued for processing...')}
                </Text>
              </View>
            )}
            {reportData.status === 'completed' && reportData.result_url && (
              <TouchableOpacity style={styles.downloadBtn}>
                <Text style={styles.downloadBtnText}>
                  {t('datamine.downloadReport', 'Download Report')}
                </Text>
              </TouchableOpacity>
            )}
            {reportData.status === 'failed' && reportData.error_message && (
              <Text style={styles.reportError}>
                {reportData.error_message}
              </Text>
            )}
          </View>
        )}
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
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  statsBar: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  noData: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },

  // Demographics
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  demoItem: {
    alignItems: 'center',
  },
  demoValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  demoLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  // Verification bar
  verBarContainer: {
    marginTop: spacing.md,
  },
  verBarLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  verBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.backgroundGray,
  },
  verSegment: {
    height: '100%',
  },
  verLegend: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.lg,
  },
  verLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  verDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  verLegendText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Heatmap CTA
  heatmapCta: {
    marginBottom: spacing.lg,
    backgroundColor: colors.navy,
  },
  heatmapCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heatmapCtaInfo: {
    flex: 1,
  },
  heatmapCtaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textInverse,
    marginBottom: 4,
  },
  heatmapCtaDesc: {
    fontSize: 13,
    color: colors.textInverse,
    opacity: 0.7,
  },
  heatmapCtaArrow: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '700',
    marginLeft: spacing.md,
  },

  // Report
  reportDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  reportBtn: {
    marginTop: spacing.xs,
  },
  reportStatus: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  reportStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reportStatusLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  reportProcessing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  reportProcessingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  downloadBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.success + '15',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.button,
    alignSelf: 'flex-start',
  },
  downloadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  reportError: {
    fontSize: 13,
    color: colors.error,
    marginTop: spacing.sm,
  },

  bottomSpacer: {
    height: 40,
  },
});
