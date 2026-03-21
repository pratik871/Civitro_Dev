import React, { useState, useCallback, useMemo } from 'react';
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
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import { useAuth } from '../../hooks/useAuth';
import { useIssues } from '../../hooks/useIssues';
import { useWardMood } from '../../hooks/useWardMood';
import { useLeaders } from '../../hooks/useLeaders';
import { useUnreadCount } from '../../hooks/useNotifications';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { usePatterns } from '../../hooks/usePatterns';
import { useActions } from '../../hooks/useCommunityActions';
import { FAB } from '../../components/ui/FAB';
import type { RootStackParamList } from '../../navigation/types';

// Dashboard components
import { CivicScoreRing } from '../../components/dashboard/CivicScoreRing';
import { WardOfficerCard } from '../../components/dashboard/WardOfficerCard';
import { WardDashboardChart } from '../../components/dashboard/WardDashboardChart';
import { WardMood } from '../../components/dashboard/WardMood';
import { CommunityPulse } from '../../components/dashboard/CommunityPulse';
import { PatternBanner } from '../../components/dashboard/PatternBanner';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { CommunityActionsSection, type CommunityAction } from '../../components/dashboard/CommunityActionCard';
import { CelebrationBanner } from '../../components/dashboard/CelebrationBanner';
import { IssueFeedCard } from '../../components/dashboard/IssueFeedCard';

// ---------------------------------------------------------------------------
// Design tokens from the HTML mockup
// ---------------------------------------------------------------------------
const SAFFRON = '#FF6B35';
const SAFFRON_LIGHT = '#FFF3ED';
const NAVY = '#0B1426';

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavProp>();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: issues, isLoading, refetch } = useIssues();
  const { data: unreadData } = useUnreadCount();
  const { data: leaders } = useLeaders();
  const { data: dashboardStats, refetch: refetchStats } = useDashboardStats();
  const wardId = dashboardStats?.ward_id || user?.ward;
  const { data: wardMoodData } = useWardMood(wardId);
  const { data: patternsData } = usePatterns(wardId);
  const { data: actionsData } = useActions(wardId);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh on focus
  useFocusEffect(useCallback(() => { refreshProfile(); }, [refreshProfile]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refreshProfile(), refetchStats()]);
    setRefreshing(false);
  }, [refetch, refreshProfile, refetchStats]);

  // Derived data
  const issueList = issues ?? [];
  const openCount = issueList.filter((i) => i.status === 'reported').length;
  const inProgressCount = issueList.filter((i) => ['assigned', 'work_started', 'acknowledged'].includes(i.status)).length;
  const resolvedCount = issueList.filter((i) => i.status === 'completed').length;
  const verifiedCount = issueList.filter((i) => i.status === 'citizen_verified').length;

  // Ward officer (first leader, or mock)
  const wardOfficer = useMemo(() => {
    if (leaders && leaders.length > 0) {
      const l = leaders[0];
      return { name: l.name, designation: 'Ward Corporator', party: l.partyAbbr || l.party };
    }
    return { name: 'Priya Sharma', designation: 'Ward Corporator', party: 'BJP' };
  }, [leaders]);

  // Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Citizen';

  // Civic level from dashboard stats (fall back to computed from profile)
  const civicLevel = useMemo(() => {
    if (dashboardStats?.civic_level) {
      // Capitalize the tier name for display
      return dashboardStats.civic_level
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    const score = user?.civicScore ?? 0;
    if (score >= 75) return 'Star Citizen';
    if (score >= 50) return 'Active Citizen';
    if (score >= 25) return 'Reporter';
    return 'New Citizen';
  }, [dashboardStats?.civic_level, user?.civicScore]);

  const unreadCount = dashboardStats?.unread_messages ?? unreadData?.count ?? 0;

  // Map community actions from API to the card component shape
  const communityActions: CommunityAction[] = useMemo(() => {
    if (!actionsData || actionsData.length === 0) return [];
    return actionsData.slice(0, 4).map((a) => ({
      id: a.id,
      title: a.title,
      badge: a.status === 'acknowledged' ? 'Acknowledged' : a.supportCount >= 100 ? 'Trending' : 'New',
      badgeType: (a.status === 'acknowledged' ? 'acknowledged' : a.supportCount >= 100 ? 'trending' : 'new') as 'trending' | 'acknowledged' | 'new',
      ward: a.wardName,
      supporters: a.supportCount,
      goalPercent: a.supportGoal > 0 ? Math.round((a.supportCount / a.supportGoal) * 100) : 0,
      incidents: a.evidenceCount,
      locations: 0,
      impactLabel: a.economicImpact ? `\u20B9${Math.round(a.economicImpact.costOfInaction / 100000)}L` : '',
      impactColor: '#0F766E',
      creatorInitial: a.creatorName.charAt(0),
      creatorName: a.creatorName,
      createdAgo: formatTimeAgo(a.createdAt),
    }));
  }, [actionsData]);

  // First pattern for the banner
  const firstPattern = patternsData?.patterns?.[0];

  // Recently resolved for celebration banner
  const recentResolution = dashboardStats?.recently_resolved?.[0];

  // Quick action handler
  const handleQuickAction = useCallback(
    (key: string) => {
      switch (key) {
        case 'report':
          navigation.navigate('Main', { screen: 'Report' } as any);
          break;
        case 'polls':
          navigation.navigate('Polls');
          break;
        case 'promises':
          navigation.navigate('Promises');
          break;
        case 'chi':
          navigation.navigate('CHI', {});
          break;
        case 'messages':
          navigation.navigate('Messages');
          break;
        default:
          break;
      }
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* ================================================================ */}
      {/* 1. HEADER                                                        */}
      {/* ================================================================ */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerLeft}>
          {/* Civic Shield Badge */}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
            <View style={styles.shieldWrap}>
              <Svg viewBox="0 0 44 44" width={44} height={44} fill="none">
                <Defs>
                  <LinearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#FF8F5E" />
                    <Stop offset="100%" stopColor={SAFFRON} />
                  </LinearGradient>
                </Defs>
                <Path
                  d="M22 3L6 10v10c0 11 6.8 18.4 16 21 9.2-2.6 16-10 16-21V10L22 3z"
                  fill="url(#shieldGrad)"
                />
                <Path
                  d="M22 6L9 12v8c0 9.5 5.8 15.8 13 18 7.2-2.2 13-8.5 13-18v-8L22 6z"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={0.5}
                />
              </Svg>
              <Text style={styles.shieldLevel}>{Math.floor((dashboardStats?.civic_score ?? user?.civicScore ?? 0) / 10) || 1}</Text>
            </View>
          </TouchableOpacity>

          {/* Greeting */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingText} numberOfLines={1}>
              {greeting}, {firstName}
            </Text>
            <Text style={styles.greetingSubText}>
              {civicLevel} Level · {dashboardStats?.ward_name || user?.ward || 'Ward 45'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Streak flame */}
          <View style={styles.streakBadge}>
            <Svg viewBox="0 0 16 16" width={14} height={14} fill="none">
              <Path d="M8 1c0 3-3 4.5-3 7.5a3.5 3.5 0 007 0C12 5.5 8 4 8 1z" fill={SAFFRON} />
              <Path d="M8 7c0 1.5-1.5 2.25-1.5 3.75a1.75 1.75 0 003.5 0C10 9.25 8 8.5 8 7z" fill="#FFD700" />
            </Svg>
            <Text style={styles.streakText}>{dashboardStats?.streak_days ?? 0}</Text>
          </View>

          {/* Language */}
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('Language')}
            activeOpacity={0.7}
          >
            <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
              <Circle cx={12} cy={12} r={10} stroke={NAVY} strokeWidth={2} />
              <Path
                d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"
                stroke={NAVY}
                strokeWidth={2}
              />
            </Svg>
          </TouchableOpacity>

          {/* Search */}
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.7}
          >
            <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
              <Circle cx={10.5} cy={10.5} r={7} stroke={NAVY} strokeWidth={2} />
              <Path d="M15.5 15.5L21 21" stroke={NAVY} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
              <Path
                d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
                stroke={NAVY}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M13.73 21a2 2 0 01-3.46 0"
                stroke={NAVY}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ================================================================ */}
      {/* SCROLL CONTENT                                                   */}
      {/* ================================================================ */}
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
        {/* ============================================================ */}
        {/* 2. TAGLINE                                                    */}
        {/* ============================================================ */}
        <View style={styles.taglineWrap}>
          <Text style={styles.taglineText}>
            Democracy<Text style={styles.taglineDot}> {'\u2022'} </Text>You Shape
            <Text style={styles.taglineTM}>.TM</Text>
          </Text>
          <View style={styles.taglineLine} />
        </View>

        {/* ============================================================ */}
        {/* 3. WEATHER TIP                                                */}
        {/* ============================================================ */}
        <View style={styles.weatherTip}>
          <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
            <Path
              d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"
              stroke={SAFFRON}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path d="M8 15v2M12 15v2M16 15v2" stroke={SAFFRON} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
          </Svg>
          <Text style={styles.weatherText}>
            Monsoon alert: Drainage issues likely -- report blockages early
          </Text>
        </View>

        {/* ============================================================ */}
        {/* 4. CIVIC SCORE RING                                           */}
        {/* ============================================================ */}
        <View style={styles.sectionSpacing}>
          <CivicScoreRing
            score={dashboardStats?.civic_score ?? user?.civicScore ?? 0}
            reported={dashboardStats?.issues_reported ?? user?.issuesReported ?? 0}
            pollsVoted={dashboardStats?.polls_voted ?? user?.pollsVoted ?? 0}
            validations={dashboardStats?.validations ?? 0}
            actionsSupported={dashboardStats?.actions_supported ?? 0}
            actionsStarted={dashboardStats?.actions_started ?? 0}
            milestoneProgress={0.6}
            milestoneLabel="Report 2 more to reach Validator"
            onBoostPress={() => navigation.navigate('Main', { screen: 'Report' } as any)}
          />
        </View>

        {/* ============================================================ */}
        {/* 5. WARD OFFICER CARD                                          */}
        {/* ============================================================ */}
        <View style={styles.sectionSpacing}>
          <WardOfficerCard
            name={wardOfficer.name}
            designation={wardOfficer.designation}
            party={wardOfficer.party}
            onMessage={() => navigation.navigate('Messages')}
            onRate={() => {
              if (leaders && leaders.length > 0) {
                navigation.navigate('LeaderProfile', { leaderId: leaders[0].id });
              }
            }}
          />
        </View>

        {/* ============================================================ */}
        {/* 6. WARD DASHBOARD                                             */}
        {/* ============================================================ */}
        <View style={styles.sectionSpacing}>
          <WardDashboardChart
            open={openCount || 3}
            inProgress={inProgressCount || 2}
            resolved={resolvedCount || 2}
            verified={verifiedCount || 1}
            wardName={dashboardStats?.ward_name || user?.ward || 'Ward 45'}
            wardArea="Andheri East"
            rank={12}
            totalWards={236}
          />
        </View>

        {/* ============================================================ */}
        {/* 7. WARD MOOD                                                  */}
        {/* ============================================================ */}
        {wardMoodData && (
          <View style={styles.sectionSpacing}>
            <WardMood data={wardMoodData} />
          </View>
        )}
        {/* Fallback mock if API data not available */}
        {!wardMoodData && (
          <View style={styles.sectionSpacing}>
            <WardMood
              data={{
                ward_id: user?.ward || 'ward-45',
                mood: 'frustrated',
                score: 0.35,
                topics: [
                  { name: 'Water supply', sentiment: -0.6, percentage: 43 },
                  { name: 'Potholes', sentiment: -0.3, percentage: 22 },
                  { name: 'Streetlights fixed', sentiment: 0.4, percentage: 18 },
                  { name: 'New park', sentiment: 0.5, percentage: 17 },
                ],
                trend: {
                  direction: 'declining',
                  change_percent: 12,
                  sparkline: [0.45, 0.42, 0.38, 0.35, 0.32, 0.36, 0.33],
                },
              }}
            />
          </View>
        )}

        {/* ============================================================ */}
        {/* 8. COMMUNITY PULSE                                            */}
        {/* ============================================================ */}
        <View style={styles.sectionSpacing}>
          <CommunityPulse
            activeCitizens={dashboardStats?.active_citizens_in_ward}
            weeklyTrendPercent={dashboardStats?.active_citizens_trend}
          />
        </View>

        {/* ============================================================ */}
        {/* 9. PATTERN DETECTION BANNER                                   */}
        {/* ============================================================ */}
        {firstPattern && (
          <View style={styles.sectionSpacing}>
            <PatternBanner
              description={firstPattern.description}
              stats={[
                { icon: 'location', value: String(firstPattern.locations ?? 0), label: 'locations' },
                { icon: 'calendar', value: String(firstPattern.days_unresolved ?? 0), label: 'days unresolved' },
                { icon: 'damage', value: firstPattern.estimated_damage ?? '', label: 'est. damage', valueColor: '#0F766E' },
              ]}
              onStartAction={() => {}}
              onViewEvidence={() => navigation.navigate('IssuesList')}
            />
          </View>
        )}

        {/* ============================================================ */}
        {/* 10. WARD COMPARISON NUDGE                                     */}
        {/* ============================================================ */}
        <View style={styles.comparisonCard}>
          <Svg viewBox="0 0 16 16" width={16} height={16} fill="none">
            <Path d="M8 1v14M1 8h14" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M4 4l4 4-4 4" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
          </Svg>
          <Text style={styles.comparisonText}>
            Ward 44 (Jogeshwari) resolved{' '}
            <Text style={styles.comparisonBold}>31 issues</Text> this week vs your ward's 23. Close the gap!
          </Text>
        </View>

        {/* ============================================================ */}
        {/* 11. QUICK ACTIONS CAROUSEL                                    */}
        {/* ============================================================ */}
        <View style={styles.sectionSpacing}>
          <QuickActions
            pollCount={dashboardStats?.active_polls_count}
            messageCount={dashboardStats?.unread_messages}
            onPress={handleQuickAction}
          />
        </View>

        {/* ============================================================ */}
        {/* 12. COMMUNITY ACTIONS SECTION                                 */}
        {/* ============================================================ */}
        {communityActions.length > 0 && (
          <View style={styles.sectionSpacing}>
            <CommunityActionsSection
              actions={communityActions}
              onSeeAll={() => {}}
            />
          </View>
        )}

        {/* ============================================================ */}
        {/* 13. CELEBRATION BANNER                                        */}
        {/* ============================================================ */}
        {recentResolution && (
          <View style={styles.sectionSpacing}>
            <CelebrationBanner
              issueTitle={recentResolution.title}
              reportCount={recentResolution.citizen_reports}
              timeAgo={formatTimeAgo(recentResolution.resolved_at)}
              onPress={() => {}}
            />
          </View>
        )}

        {/* ============================================================ */}
        {/* 14. ISSUE FEED                                                */}
        {/* ============================================================ */}
        <View style={styles.sectionSpacingLarge}>
          {/* Section header */}
          <View style={styles.feedHeader}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>Live from Your Ward</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('IssuesList')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            issueList.slice(0, 4).map((issue, index) => (
              <IssueFeedCard
                key={issue.id}
                issue={issue}
                isUrgent={index === 0 && issue.priority === 'critical'}
                linkedAction={
                  index === 0
                    ? { title: 'Fix water supply failures', supporters: 312 }
                    : undefined
                }
                onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
              />
            ))
          )}

          {/* If no issues loaded, show mock placeholder cards */}
          {!isLoading && issueList.length === 0 && (
            <>
              <IssueFeedCard
                issue={{
                  id: 'mock-1',
                  title: 'Broken water pipe flooding Nehru Street',
                  description: '',
                  category: 'water_supply',
                  status: 'reported',
                  priority: 'critical',
                  latitude: 19.1136,
                  longitude: 72.8697,
                  address: 'Nehru Street, Andheri East',
                  ward: 'Ward 45',
                  constituency: '',
                  department: '',
                  reportedBy: '',
                  reportedByName: '',
                  upvotes: 24,
                  commentCount: 3,
                  hasUpvoted: false,
                  ledger: [],
                  createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                  updatedAt: new Date().toISOString(),
                }}
                isUrgent
                linkedAction={{ title: 'Fix water supply failures', supporters: 312 }}
              />
              <IssueFeedCard
                issue={{
                  id: 'mock-2',
                  title: 'Large pothole near Infinity Mall junction',
                  description: '',
                  category: 'pothole',
                  status: 'assigned',
                  priority: 'high',
                  latitude: 19.1369,
                  longitude: 72.8271,
                  address: 'Link Road, Andheri West',
                  ward: 'Ward 45',
                  constituency: '',
                  department: '',
                  reportedBy: '',
                  reportedByName: '',
                  upvotes: 15,
                  commentCount: 7,
                  hasUpvoted: false,
                  ledger: [],
                  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                  updatedAt: new Date().toISOString(),
                }}
              />
              <IssueFeedCard
                issue={{
                  id: 'mock-3',
                  title: 'Streetlight outage on SV Road',
                  description: '',
                  category: 'streetlight',
                  status: 'completed',
                  priority: 'medium',
                  latitude: 19.1286,
                  longitude: 72.8350,
                  address: 'SV Road, Andheri West',
                  ward: 'Ward 45',
                  constituency: '',
                  department: '',
                  reportedBy: '',
                  reportedByName: '',
                  upvotes: 5,
                  commentCount: 2,
                  hasUpvoted: false,
                  ledger: [],
                  createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                  updatedAt: new Date().toISOString(),
                }}
              />
            </>
          )}
        </View>

        {/* Bottom spacer for FAB clearance */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB */}
      <FAB
        onPress={() => navigation.navigate('Main', { screen: 'Report' } as any)}
        icon={'\u{1F4F7}'}
        label={t('home.fabReport')}
      />
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ---- HEADER ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shieldWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldLevel: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    top: 14,
  },
  greetingBlock: {
    marginLeft: spacing.md,
    flex: 1,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  greetingSubText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3ED',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '800',
    color: SAFFRON,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.background,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ---- SCROLL ----
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },

  // ---- 2. TAGLINE ----
  taglineWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  taglineText: {
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  taglineDot: {
    color: SAFFRON,
    fontSize: 16,
  },
  taglineTM: {
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: '400',
  },
  taglineLine: {
    width: 40,
    height: 2,
    backgroundColor: SAFFRON,
    borderRadius: 1,
    marginTop: spacing.xs,
  },

  // ---- 3. WEATHER TIP ----
  weatherTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3ED',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  weatherText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 17,
  },

  // ---- SECTION SPACING ----
  sectionSpacing: {
    marginBottom: spacing.lg,
  },
  sectionSpacingLarge: {
    marginBottom: spacing.xl,
  },

  // ---- 10. WARD COMPARISON ----
  comparisonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  comparisonText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  comparisonBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // ---- 14. ISSUE FEED HEADER ----
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: SAFFRON,
  },

  // ---- BOTTOM SPACER ----
  bottomSpacer: {
    height: 100,
  },
});
