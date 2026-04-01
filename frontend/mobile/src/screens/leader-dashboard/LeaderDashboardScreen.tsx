import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useLeaderDashboard } from '../../hooks/useLeaderDashboard';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type DashboardRouteProp = RouteProp<RootStackParamList, 'LeaderDashboard'>;
type DashboardNavProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  reported: { color: colors.warning, label: 'Reported' },
  acknowledged: { color: colors.info, label: 'Acknowledged' },
  in_progress: { color: '#7C3AED', label: 'In Progress' },
  resolved: { color: colors.success, label: 'Resolved' },
  closed: { color: colors.textMuted, label: 'Closed' },
};

const CATEGORY_LABELS: Record<string, string> = {
  pothole: 'Pothole',
  garbage: 'Garbage',
  streetlight: 'Streetlight',
  water_supply: 'Water Supply',
  road_damage: 'Road Damage',
  construction: 'Construction',
  drainage: 'Drainage',
  traffic: 'Traffic',
  healthcare: 'Healthcare',
  education: 'Education',
  public_safety: 'Public Safety',
  other: 'Other',
};

export const LeaderDashboardScreen: React.FC = () => {
  const route = useRoute<DashboardRouteProp>();
  const navigation = useNavigation<DashboardNavProp>();
  const { leaderId } = route.params;
  const user = useAuthStore((state) => state.user);
  const { data: dashboard, isLoading, refetch } = useLeaderDashboard(leaderId);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Dashboard data unavailable</Text>
      </View>
    );
  }

  const resolutionRate =
    dashboard.issues_in_ward > 0
      ? Math.round((dashboard.resolved_count / dashboard.issues_in_ward) * 100)
      : 0;

  const formatResponseTime = (days: number): string => {
    if (days === 0) return '--';
    if (days < 1) return `${Math.round(days * 24)}h`;
    return `${days.toFixed(1)}d`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Avatar
            name={dashboard.leader_name}
            size={64}
            backgroundColor={colors.navy}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.leaderName}>{dashboard.leader_name}</Text>
            <Text style={styles.wardName}>{dashboard.ward || 'Ward'}</Text>
            <View style={styles.headerBadges}>
              {dashboard.party ? (
                <Badge
                  text={dashboard.party}
                  backgroundColor={colors.navy + '10'}
                  color={colors.navy}
                  size="sm"
                />
              ) : null}
              {dashboard.designation ? (
                <Badge
                  text={dashboard.designation}
                  backgroundColor={colors.primary + '10'}
                  color={colors.primary}
                  size="sm"
                />
              ) : null}
            </View>
          </View>
        </View>

        {/* Stats Cards Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dashboard.issues_in_ward}</Text>
            <Text style={styles.statLabel}>Total Issues</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {dashboard.resolved_count}
            </Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {dashboard.pending_count}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.info }]}>
              {formatResponseTime(dashboard.avg_response_days)}
            </Text>
            <Text style={styles.statLabel}>Avg Response</Text>
          </View>
        </View>

        {/* Resolution + Satisfaction */}
        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View style={styles.progressRing}>
                <Text style={styles.progressValue}>{resolutionRate}%</Text>
              </View>
              <Text style={styles.metricLabel}>Resolution Rate</Text>
            </View>
          </Card>
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <Text style={styles.satisfactionValue}>
                {dashboard.citizen_satisfaction > 0
                  ? dashboard.citizen_satisfaction.toFixed(1)
                  : '--'}
              </Text>
              <Text style={styles.satisfactionUnit}>/5</Text>
              <Text style={styles.metricLabel}>Citizen Satisfaction</Text>
              <Text style={styles.ratingCount}>
                {dashboard.total_ratings} rating
                {dashboard.total_ratings !== 1 ? 's' : ''}
              </Text>
            </View>
          </Card>
        </View>

        {/* Pending Actions Banner */}
        {dashboard.pending_actions > 0 && (
          <Card style={styles.pendingBanner}>
            <View style={styles.pendingRow}>
              <View style={styles.pendingIcon}>
                <Text style={styles.pendingIconText}>!</Text>
              </View>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingTitle}>
                  {dashboard.pending_actions} Issue
                  {dashboard.pending_actions !== 1 ? 's' : ''} Need Attention
                </Text>
                <Text style={styles.pendingDesc}>
                  Newly reported issues awaiting acknowledgement
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Recent Issues */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Issues</Text>
            {dashboard.boundary_id ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('IssuesList')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {dashboard.recent_issues.length === 0 ? (
            <View style={styles.emptyIssues}>
              <Text style={styles.emptyIssuesText}>
                No issues reported in this constituency yet
              </Text>
            </View>
          ) : (
            dashboard.recent_issues.map((issue) => {
              const statusConf =
                STATUS_CONFIG[issue.status] ?? STATUS_CONFIG.reported;
              return (
                <TouchableOpacity
                  key={issue.id}
                  style={styles.issueItem}
                  onPress={() =>
                    navigation.navigate('IssueDetail', { issueId: issue.id })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.issueItemHeader}>
                    <Text style={styles.issueCategory}>
                      {CATEGORY_LABELS[issue.category] || issue.category}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusConf.color + '15' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: statusConf.color },
                        ]}
                      >
                        {statusConf.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.issueText} numberOfLines={2}>
                    {issue.text}
                  </Text>
                  <Text style={styles.issueDate}>
                    {new Date(issue.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </Card>

        {/* Quick Actions */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <Button
              title="View All Issues"
              onPress={() => navigation.navigate('IssuesList')}
              variant="outline"
              size="sm"
              style={styles.actionBtn}
            />
            <Button
              title="View Profile"
              onPress={() =>
                navigation.navigate('LeaderProfile', { leaderId })
              }
              variant="primary"
              size="sm"
              style={styles.actionBtn}
            />
          </View>
        </Card>

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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  notFoundText: {
    fontSize: 16,
    color: colors.textMuted,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  headerInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  wardName: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  // Stats Cards
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
  },
  metricContent: {
    alignItems: 'center',
  },
  progressRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },
  satisfactionValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#D97706',
  },
  satisfactionUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: -4,
  },
  ratingCount: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Pending Banner
  pendingBanner: {
    marginBottom: spacing.lg,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA7420',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pendingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.warning,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pendingDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Section Card
  sectionCard: {
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
  viewAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },

  // Issue Items
  issueItem: {
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  issueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  issueCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  issueText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  issueDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emptyIssues: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyIssuesText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },

  bottomSpacer: {
    height: 40,
  },
});
