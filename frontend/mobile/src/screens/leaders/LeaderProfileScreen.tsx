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

const PROMISE_STATUS: Record<string, { color: string; label: string; icon: string }> = {
  detected: { color: colors.info, label: 'Detected', icon: '\u{1F50D}' },
  pending: { color: colors.textMuted, label: 'Pending', icon: '\u23F3' },
  on_track: { color: colors.warning, label: 'On Track', icon: '\u{1F3D7}' },
  in_progress: { color: colors.warning, label: 'In Progress', icon: '\u{1F3D7}' },
  fulfilled: { color: colors.success, label: 'Fulfilled', icon: '\u2705' },
  broken: { color: colors.error, label: 'Broken', icon: '\u274C' },
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
  const [showThankYou, setShowThankYou] = useState(false);
  const [ratingStep, setRatingStep] = useState(0); // 0-4 for 5 dimensions, 5 = done
  const [dimensions, setDimensions] = useState({
    responsiveness: 0,
    transparency: 0,
    deliveryOnPromises: 0,
    accessibility: 0,
    overallImpact: 0,
  });

  const RATING_QUESTIONS = [
    { key: 'responsiveness', label: 'Responsiveness', question: 'How quickly do they respond to issues?' },
    { key: 'transparency', label: 'Transparency', question: 'How open are they about decisions?' },
    { key: 'deliveryOnPromises', label: 'Delivery on Promises', question: 'Do they keep their promises?' },
    { key: 'accessibility', label: 'Accessibility', question: 'How easy is it to reach them?' },
    { key: 'overallImpact', label: 'Overall Impact', question: 'How much positive change have they brought?' },
  ] as const;

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

  // Fetch this leader's promises
  const { data: leaderPromises } = useQuery<any[]>({
    queryKey: ['leader-promises', leaderId],
    queryFn: async () => {
      const res = await api.get<{ promises: any[] } | any[]>('/api/v1/promises');
      const all = Array.isArray(res) ? res : (res.promises ?? []);
      return all.filter((p: any) => p.leader_id === leaderId);
    },
    enabled: !!leaderId,
    staleTime: 60000,
  });
  const promises = leaderPromises ?? [];

  const rateMutation = useMutation({
    mutationFn: (data: { score: number; responsiveness: number; transparency: number; delivery_on_promises: number; accessibility: number; overall_impact: number }) =>
      api.post(`/api/v1/ratings/survey`, {
        representative_id: leaderId,
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaders', leaderId] });
      queryClient.invalidateQueries({ queryKey: ['my-rating', leaderId] });
      setShowThankYou(true);
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
        {leader.constituency ? (
          <Text style={styles.constituency}>{leader.constituency}</Text>
        ) : null}
        <Badge
          text={leader.partyAbbr || leader.party}
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
        <Button
          title={ratingSubmitted ? 'Update Rating' : 'Rate This Leader'}
          onPress={() => {
            setRatingStep(0);
            setDimensions({ responsiveness: 0, transparency: 0, deliveryOnPromises: 0, accessibility: 0, overallImpact: 0 });
            setShowThankYou(false);
            setShowRatingModal(true);
          }}
          variant="outline"
          size="md"
          fullWidth
          loading={rateMutation.isPending}
          style={styles.rateButton}
        />
      </Card>

      {/* Promise Tracker */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Promise Tracker</Text>
          <Text style={styles.promiseCount}>
            {promises.filter(p => p.status === 'fulfilled').length}/{promises.length} kept
          </Text>
        </View>
        {promises.length === 0 ? (
          <Text style={styles.noPromisesText}>No promises tracked yet</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {promises.slice(0, 5).map((p: any) => {
              const sc = PROMISE_STATUS[p.status] ?? PROMISE_STATUS.pending;
              return (
                <View key={p.id} style={styles.promiseItem}>
                  <View style={styles.promiseItemHeader}>
                    <Text style={styles.promiseItemTitle} numberOfLines={2}>{p.title}</Text>
                    <View style={[styles.promiseStatusBadge, { backgroundColor: sc.color + '15' }]}>
                      <Text style={[styles.promiseStatusText, { color: sc.color }]}>{sc.icon} {sc.label}</Text>
                    </View>
                  </View>
                  <View style={styles.promiseProgressRow}>
                    <View style={styles.promiseProgressBg}>
                      <View style={[styles.promiseProgressFill, { width: `${p.progress}%`, backgroundColor: sc.color }]} />
                    </View>
                    <Text style={[styles.promiseProgressPct, { color: sc.color }]}>{p.progress}%</Text>
                  </View>
                  <View style={styles.promiseItemFooter}>
                    <View style={styles.promiseCategoryBadge}>
                      <Text style={styles.promiseCategoryText}>{p.category}</Text>
                    </View>
                    <Text style={styles.promiseDeadline}>Deadline: {p.deadline}</Text>
                  </View>
                </View>
              );
            })}
            {promises.length > 5 && (
              <TouchableOpacity
                style={styles.viewPromisesBtn}
                onPress={() => navigation.navigate('Promises', { leaderId })}
                activeOpacity={0.7}
              >
                <Text style={styles.viewPromisesBtnText}>View All {promises.length} Promises</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>

      {/* Performance Stats */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Performance Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {leader.issuesTotal > 0 ? Math.round((leader.issuesResolved / leader.issuesTotal) * 100) : 0}%
            </Text>
            <Text style={styles.statLabel}>Resolution Rate</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {leader.avgResponseDays > 0 ? leader.avgResponseDays.toFixed(1) : '\u2014'}
            </Text>
            <Text style={styles.statLabel}>Avg Response (days)</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#D97706' }]}>
              {leader.citizenSatisfaction > 0 ? leader.citizenSatisfaction.toFixed(1) : '\u2014'}/5
            </Text>
            <Text style={styles.statLabel}>Citizen Satisfaction</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#7C3AED' }]}>
              {leader.promiseCompletionRate > 0 ? Math.round(leader.promiseCompletionRate * 100) : 0}%
            </Text>
            <Text style={styles.statLabel}>Promises Kept</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {leader.issuesResolved}
            </Text>
            <Text style={styles.statLabel}>Issues Resolved</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>
              {leader.issuesTotal}
            </Text>
            <Text style={styles.statLabel}>Total Issues</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#059669' }]}>
              {leader.totalRatings}
            </Text>
            <Text style={styles.statLabel}>Total Ratings</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { fontSize: 14, color: colors.textPrimary }]}>
              {leader.activeSince ? new Date(leader.activeSince).getFullYear().toString() : '\u2014'}
            </Text>
            <Text style={styles.statLabel}>Active Since</Text>
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

    {/* Rating Modal — All 5 dimensions in one view */}
    <Modal visible={showRatingModal} transparent animationType="fade" onRequestClose={() => setShowRatingModal(false)}>
      <Pressable style={ratingStyles.backdrop} onPress={() => !rateMutation.isPending && setShowRatingModal(false)}>
        <View style={ratingStyles.card}>
          {!showThankYou ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={ratingStyles.title}>Rate {leader?.name}</Text>
              <Text style={ratingStyles.subtitle}>Tap stars for each dimension</Text>

              {RATING_QUESTIONS.map(q => (
                <View key={q.key} style={ratingStyles.dimensionRow}>
                  <Text style={ratingStyles.dimensionLabel}>{q.label}</Text>
                  <View style={ratingStyles.miniStarsRow}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <TouchableOpacity key={star} onPress={() => setDimensions(d => ({ ...d, [q.key]: star }))} activeOpacity={0.7} hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}>
                        <Svg viewBox="0 0 24 24" width={28} height={28}>
                          <Path
                            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill={star <= dimensions[q.key] ? '#FFD700' : '#F3F4F6'}
                            stroke={star <= dimensions[q.key] ? '#F59E0B' : '#E5E7EB'}
                            strokeWidth={0.8}
                          />
                        </Svg>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              <View style={ratingStyles.btnRow}>
                <TouchableOpacity style={ratingStyles.cancelBtn} onPress={() => setShowRatingModal(false)} activeOpacity={0.7}>
                  <Text style={ratingStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ratingStyles.submitBtn, Object.values(dimensions).some(v => v === 0) && ratingStyles.submitBtnDisabled]}
                  onPress={() => {
                    if (Object.values(dimensions).some(v => v === 0)) return;
                    const avg = Math.round((dimensions.responsiveness + dimensions.transparency + dimensions.deliveryOnPromises + dimensions.accessibility + dimensions.overallImpact) / 5);
                    rateMutation.mutate({
                      score: avg,
                      responsiveness: dimensions.responsiveness,
                      transparency: dimensions.transparency,
                      delivery_on_promises: dimensions.deliveryOnPromises,
                      accessibility: dimensions.accessibility,
                      overall_impact: dimensions.overallImpact,
                    });
                  }}
                  activeOpacity={0.7}
                  disabled={rateMutation.isPending}
                >
                  <Text style={ratingStyles.submitBtnText}>
                    {rateMutation.isPending ? 'Submitting...' : 'Submit'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <>
              <View style={ratingStyles.successIcon}>
                <Svg viewBox="0 0 24 24" width={32} height={32} fill="none">
                  <Path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <Text style={ratingStyles.title}>Thank You!</Text>
              <Text style={ratingStyles.subtitle}>
                Your rating for {leader?.name} has been recorded.
              </Text>
              <TouchableOpacity style={ratingStyles.doneBtn} onPress={() => setShowRatingModal(false)} activeOpacity={0.7}>
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
  stepCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#FF6B35',
    borderRadius: 2,
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
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dimensionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  miniStarsRow: {
    flexDirection: 'row',
    gap: 4,
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
    alignSelf: 'center',
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
    gap: 8,
    marginBottom: 12,
  },
  yourRatingStars: {
    flexDirection: 'row',
    gap: 3,
  },
  yourRatingLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
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
  viewPromisesBtn: {
    backgroundColor: '#FFF3ED',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  viewPromisesBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B35',
  },
  promiseItem: {
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  promiseItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  promiseItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  promiseStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  promiseStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  promiseProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  promiseProgressBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.white,
    borderRadius: 3,
    overflow: 'hidden',
  },
  promiseProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  promiseProgressPct: {
    fontSize: 12,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  promiseItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promiseCategoryBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  promiseCategoryText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  promiseDeadline: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
