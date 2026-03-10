import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Avatar } from '../../components/ui/Avatar';
import { StarRating } from '../../components/ui/StarRating';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { RatingBreakdown } from '../../components/leaders/RatingBreakdown';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { GOVERNANCE_LEVEL_LABELS } from '../../types/leader';
import { formatRelativeTime } from '../../lib/utils';
import type { RootStackParamList } from '../../navigation/types';
import type { Leader, LeaderActivity } from '../../types/leader';

type ProfileRouteProp = RouteProp<RootStackParamList, 'LeaderProfile'>;

const MOCK_LEADER: Leader = {
  id: 'leader-001',
  name: 'Raghavendra Rao',
  party: 'Bharatiya Janata Party',
  partyAbbr: 'BJP',
  governanceLevel: 'ward_councillor',
  constituency: 'Bangalore South',
  ward: 'Ward 15 - Koramangala',
  overallRating: 3.8,
  ratingBreakdown: {
    responsiveness: 4.1,
    transparency: 3.5,
    deliveryOnPromises: 3.2,
    accessibility: 4.5,
    overallImpact: 3.7,
  },
  totalRatings: 342,
  responseRate: 0.78,
  chiScore: 68,
  promisesFulfilled: 8,
  promisesTotal: 15,
  issuesResolved: 89,
  issuesTotal: 142,
  recentActivity: [
    {
      id: 'act-1',
      type: 'issue_resolved',
      title: 'Pothole on MG Road repaired',
      description: 'The large pothole reported 2 weeks ago has been patched.',
      timestamp: '2025-11-29T14:00:00Z',
    },
    {
      id: 'act-2',
      type: 'promise_update',
      title: 'Park renovation 60% complete',
      description: 'Koramangala park renovation is progressing on schedule.',
      timestamp: '2025-11-28T10:00:00Z',
    },
    {
      id: 'act-3',
      type: 'public_statement',
      title: 'Ward budget allocation announced',
      description: 'Rs 2 crore allocated for road repairs in Q1 2026.',
      timestamp: '2025-11-25T16:00:00Z',
    },
  ],
};

const MOCK_PROMISES = [
  { title: 'Road repairs in all blocks', progress: 65, status: 'in_progress' as const },
  { title: 'New park in 3rd Block', progress: 90, status: 'in_progress' as const },
  { title: 'Improve garbage collection', progress: 100, status: 'fulfilled' as const },
  { title: '24/7 water supply', progress: 30, status: 'in_progress' as const },
  { title: 'Street lighting upgrade', progress: 0, status: 'pending' as const },
];

const ACTIVITY_ICONS: Record<string, string> = {
  issue_resolved: '\u2705',
  promise_update: '\u{1F4CA}',
  public_statement: '\u{1F4E2}',
  meeting: '\u{1F91D}',
};

export const LeaderProfileScreen: React.FC = () => {
  const route = useRoute<ProfileRouteProp>();
  const leader = MOCK_LEADER; // In production, fetch by route.params.leaderId

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.profileHeader}>
        <Avatar name={leader.name} size={80} backgroundColor={colors.navy} />
        <Text style={styles.name}>{leader.name}</Text>
        <Text style={styles.role}>
          {GOVERNANCE_LEVEL_LABELS[leader.governanceLevel]}
        </Text>
        <Text style={styles.constituency}>
          {leader.ward || leader.constituency}
        </Text>
        <Badge
          text={`${leader.party} (${leader.partyAbbr})`}
          backgroundColor={colors.navy + '10'}
          color={colors.navy}
          size="md"
          style={styles.partyBadge}
        />
        <View style={styles.ratingHeader}>
          <StarRating rating={leader.overallRating} size={20} />
          <Text style={styles.ratingCount}>
            {leader.totalRatings.toLocaleString()} ratings
          </Text>
        </View>
      </View>

      {/* CHI Score */}
      <Card style={styles.chiCard}>
        <View style={styles.chiRow}>
          <ScoreRing
            score={leader.chiScore}
            size={72}
            strokeWidth={5}
            label="CHI"
          />
          <View style={styles.chiInfo}>
            <Text style={styles.chiTitle}>Constituency Health Index</Text>
            <Text style={styles.chiDesc}>
              Overall health score for {leader.ward || leader.constituency}
            </Text>
            <Button
              title="View Full CHI"
              onPress={() => {}}
              variant="ghost"
              size="sm"
            />
          </View>
        </View>
      </Card>

      {/* Rating Breakdown */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Rating Breakdown</Text>
        <RatingBreakdown breakdown={leader.ratingBreakdown} />
        <Button
          title="Rate This Leader"
          onPress={() => {}}
          variant="outline"
          size="md"
          fullWidth
          style={styles.rateButton}
        />
      </Card>

      {/* Promise Progress */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Promise Tracker</Text>
          <Text style={styles.promiseCount}>
            {leader.promisesFulfilled}/{leader.promisesTotal} kept
          </Text>
        </View>
        {MOCK_PROMISES.map((promise, index) => (
          <View key={index} style={styles.promiseRow}>
            <View style={styles.promiseInfo}>
              <Text style={styles.promiseTitle}>{promise.title}</Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${promise.progress}%`,
                      backgroundColor:
                        promise.progress === 100
                          ? colors.success
                          : promise.progress > 0
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                />
              </View>
            </View>
            <Text
              style={[
                styles.promiseProgress,
                { color: promise.progress === 100 ? colors.success : colors.textMuted },
              ]}
            >
              {promise.progress}%
            </Text>
          </View>
        ))}
      </Card>

      {/* Key Stats */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Performance Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {Math.round(leader.responseRate * 100)}%
            </Text>
            <Text style={styles.statLabel}>Response Rate</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{leader.issuesResolved}</Text>
            <Text style={styles.statLabel}>Issues Resolved</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{leader.issuesTotal}</Text>
            <Text style={styles.statLabel}>Total Issues</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {Math.round((leader.issuesResolved / leader.issuesTotal) * 100)}%
            </Text>
            <Text style={styles.statLabel}>Resolution Rate</Text>
          </View>
        </View>
      </Card>

      {/* Recent Activity */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {leader.recentActivity.map(activity => (
          <View key={activity.id} style={styles.activityRow}>
            <Text style={styles.activityIcon}>
              {ACTIVITY_ICONS[activity.type] || '\u{1F4CB}'}
            </Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityDesc}>{activity.description}</Text>
              <Text style={styles.activityTime}>
                {formatRelativeTime(activity.timestamp)}
              </Text>
            </View>
          </View>
        ))}
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
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  role: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  constituency: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  partyBadge: {
    marginTop: spacing.sm,
  },
  ratingHeader: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  ratingCount: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  chiCard: {
    marginBottom: spacing.md,
  },
  chiRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chiInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  chiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  chiDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  promiseCount: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  rateButton: {
    marginTop: spacing.lg,
  },
  promiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  promiseInfo: {
    flex: 1,
  },
  promiseTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.backgroundGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  promiseProgress: {
    fontSize: 14,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statBox: {
    width: '46%',
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  activityRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  activityIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  activityDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  bottomSpacer: {
    height: 40,
  },
});
