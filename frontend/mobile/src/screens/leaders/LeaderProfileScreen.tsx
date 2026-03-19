import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '../../components/ui/Avatar';
import { StarRating } from '../../components/ui/StarRating';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { RatingBreakdown } from '../../components/leaders/RatingBreakdown';
import { Button } from '../../components/ui/Button';
import { useLeader } from '../../hooks/useLeaders';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { GOVERNANCE_LEVEL_LABELS } from '../../types/leader';
import { formatRelativeTime } from '../../lib/utils';
import type { RootStackParamList } from '../../navigation/types';

type ProfileRouteProp = RouteProp<RootStackParamList, 'LeaderProfile'>;

const ACTIVITY_ICONS: Record<string, string> = {
  issue_resolved: '\u2705',
  promise_update: '\u{1F4CA}',
  public_statement: '\u{1F4E2}',
  meeting: '\u{1F91D}',
};

type LeaderProfileNavProp = NativeStackNavigationProp<RootStackParamList>;

export const LeaderProfileScreen: React.FC = () => {
  const route = useRoute<ProfileRouteProp>();
  const navigation = useNavigation<LeaderProfileNavProp>();
  const { leaderId } = route.params;
  const { data: leader, isLoading } = useLeader(leaderId);
  const queryClient = useQueryClient();

  const rateMutation = useMutation({
    mutationFn: (rating: Record<string, unknown>) =>
      api.post(`/api/v1/rating/representatives/${leaderId}`, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaders', leaderId] });
      Alert.alert('Thank You', 'Your rating has been submitted.');
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message || 'Could not submit rating.');
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!leader) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Leader not found</Text>
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
              onPress={() => navigation.navigate('CHI', { constituencyId: leader.constituency })}
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
          onPress={() =>
            rateMutation.mutate({ overall: 4, responsiveness: 4, transparency: 4, delivery_on_promises: 4, accessibility: 4, overall_impact: 4 })
          }
          variant="outline"
          size="md"
          fullWidth
          loading={rateMutation.isPending}
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
        <Text style={styles.noPromisesText}>No promises tracked yet</Text>
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
  noPromisesText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
