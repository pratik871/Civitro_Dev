import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, ActivityIndicator, TouchableOpacity, Modal, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '../../components/ui/Avatar';
import { StarRating } from '../../components/ui/StarRating';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { RatingBreakdown } from '../../components/leaders/RatingBreakdown';
import { Button } from '../../components/ui/Button';
import { useLeader } from '../../hooks/useLeaders';
import { useAuthStore } from '../../stores/authStore';
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
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);

  // Fetch user's existing rating for this leader
  const { data: myRatingData } = useQuery({
    queryKey: ['my-rating', leaderId],
    queryFn: async () => {
      try {
        const res = await api.get<{ score: number; total_ratings: number }>(`/api/v1/ratings/my-rating/${leaderId}`);
        return { score: res.score || 0, totalRatings: res.total_ratings || 0 };
      } catch {
        return { score: 0, totalRatings: 0 };
      }
    },
    enabled: !!leaderId,
  });

  const myRating = myRatingData?.score ?? 0;
  const totalRatings = myRatingData?.totalRatings ?? 0;
  const ratingSubmitted = myRating > 0;

  const rateMutation = useMutation({
    mutationFn: (score: number) =>
      api.post(`/api/v1/ratings/survey`, {
        representative_id: leaderId,
        score,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaders', leaderId] });
      queryClient.invalidateQueries({ queryKey: ['my-rating', leaderId] });
      setSelectedStars(0);
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
    <View style={styles.container}>
    <ScrollView
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
            {(totalRatings || leader.totalRatings).toLocaleString()} rating{(totalRatings || leader.totalRatings) !== 1 ? 's' : ''}
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
        {ratingSubmitted && (
          <View style={styles.yourRating}>
            <Text style={styles.yourRatingText}>You rated {myRating} star{(myRating ?? 0) > 1 ? 's' : ''}</Text>
            <View style={styles.yourRatingStars}>
              {[1, 2, 3, 4, 5].map(s => (
                <Svg key={s} viewBox="0 0 24 24" width={14} height={14}>
                  <Path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill={s <= (myRating ?? 0) ? '#FFD700' : '#E5E7EB'}
                    stroke={s <= (myRating ?? 0) ? '#F59E0B' : '#D1D5DB'}
                    strokeWidth={1}
                  />
                </Svg>
              ))}
            </View>
          </View>
        )}
        <Button
          title={ratingSubmitted ? 'Update Rating' : 'Rate This Leader'}
          onPress={() => {
            if (!ratingSubmitted) setSelectedStars(0);
            setRatingSubmitted(false);
            setShowRatingModal(true);
          }}
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

    {/* Rating Modal */}
    <Modal visible={showRatingModal} transparent animationType="fade" onRequestClose={() => setShowRatingModal(false)}>
      <Pressable style={ratingStyles.backdrop} onPress={() => !rateMutation.isPending && setShowRatingModal(false)}>
        <View style={ratingStyles.card}>
          {!ratingSubmitted ? (
            <>
              {/* Star selection */}
              <Text style={ratingStyles.title}>Rate {leader?.name}</Text>
              <Text style={ratingStyles.subtitle}>How would you rate this leader's performance?</Text>

              <View style={ratingStyles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setSelectedStars(star)} activeOpacity={0.7}>
                    <Svg viewBox="0 0 24 24" width={40} height={40}>
                      <Path
                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        fill={star <= selectedStars ? '#FFD700' : '#E5E7EB'}
                        stroke={star <= selectedStars ? '#F59E0B' : '#D1D5DB'}
                        strokeWidth={1}
                      />
                    </Svg>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedStars > 0 && (
                <Text style={ratingStyles.starLabel}>
                  {['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][selectedStars]}
                </Text>
              )}

              <View style={ratingStyles.btnRow}>
                <TouchableOpacity
                  style={ratingStyles.cancelBtn}
                  onPress={() => setShowRatingModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={ratingStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ratingStyles.submitBtn, selectedStars === 0 && ratingStyles.submitBtnDisabled]}
                  onPress={() => selectedStars > 0 && rateMutation.mutate(selectedStars)}
                  activeOpacity={selectedStars > 0 ? 0.7 : 1}
                  disabled={rateMutation.isPending}
                >
                  <Text style={ratingStyles.submitBtnText}>
                    {rateMutation.isPending ? 'Submitting...' : 'Submit Rating'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Success state */}
              <View style={ratingStyles.successIcon}>
                <Svg viewBox="0 0 24 24" width={32} height={32} fill="none">
                  <Path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <Text style={ratingStyles.title}>Thank You!</Text>
              <Text style={ratingStyles.subtitle}>
                Your {selectedStars}-star rating for {leader?.name} has been recorded. It helps improve civic accountability.
              </Text>
              <TouchableOpacity
                style={ratingStyles.doneBtn}
                onPress={() => setShowRatingModal(false)}
                activeOpacity={0.7}
              >
                <Text style={ratingStyles.submitBtnText}>Done</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
    </View>
  );
};

const ratingStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0B1426',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doneBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
});

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
  yourRating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3ED',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  yourRatingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B35',
  },
  yourRatingStars: {
    flexDirection: 'row',
    gap: 2,
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
