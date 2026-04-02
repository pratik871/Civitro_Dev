import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Modal,
  Pressable,
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
import { useGovernanceChain } from '../../hooks/useGovernanceChain';
import { useWeatherTip } from '../../hooks/useWeatherTip';
import { useSettingsStore } from '../../stores/settingsStore';
import { FAB } from '../../components/ui/FAB';
import api from '../../lib/api';
import type { RootStackParamList } from '../../navigation/types';

// Dashboard components
import { CivicScoreRing } from '../../components/dashboard/CivicScoreRing';
import { RepresentativesPyramid } from '../../components/dashboard/RepresentativesPyramid';
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
const NAVY_SOFT = '#1E3A5F';

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTimeAgo(dateStr: string, t?: (key: string, fallback: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (t) {
    if (days === 0) return t('home.today', 'today');
    if (days === 1) return t('home.oneDayAgo', '1 day ago');
    return t('home.daysAgo', '{{count}} days ago', { count: days } as any);
  }
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
  const { data: governanceChain } = useGovernanceChain(wardId);
  // Weather tip — use Andheri East coordinates (Ward 45 default)
  const { data: weatherTip } = useWeatherTip(19.12, 72.85);
  const darkMode = useSettingsStore(state => state.darkMode);
  const [refreshing, setRefreshing] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Monitor connectivity
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('https://api.civitro.com/health', { method: 'HEAD' });
        setIsOffline(!response.ok);
      } catch {
        setIsOffline(true);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.goodMorning');
    if (hour < 17) return t('home.goodAfternoon');
    return t('home.goodEvening');
  }, [t]);

  const rawName = user?.name || '';
  const isPhoneNumber = /^\+?\d{10,}$/.test(rawName.replace(/\s/g, ''));
  const firstName = isPhoneNumber ? t('home.citizen', 'Citizen') : (rawName.split(' ')[0] || t('home.citizen', 'Citizen'));

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
    if (score >= 75) return t('home.starCitizen', 'Star Citizen');
    if (score >= 50) return t('home.activeCitizen', 'Active Citizen');
    if (score >= 25) return t('home.reporter', 'Reporter');
    return t('home.newCitizen', 'New Citizen');
  }, [dashboardStats?.civic_level, user?.civicScore, t]);

  const unreadCount = dashboardStats?.unread_messages ?? unreadData?.count ?? 0;

  // Debug: log raw action data
  if (actionsData && actionsData.length > 0) {
    console.log('=== ACTIONS DATA ===', actionsData.slice(0, 2).map(a => ({ title: a.title?.substring(0, 20), hasSupported: a.hasSupported })));
  }

  // Map community actions from API to the card component shape
  const communityActions: CommunityAction[] = useMemo(() => {
    if (!actionsData || actionsData.length === 0) return [];
    return actionsData.slice(0, 4).map((a) => ({
      id: a.id,
      title: a.title,
      badge: a.status === 'acknowledged' ? t('home.acknowledged', 'Acknowledged') : a.supportCount >= 100 ? t('home.trending', 'Trending') : t('home.newBadge', 'New'),
      badgeType: (a.status === 'acknowledged' ? 'acknowledged' : a.supportCount >= 100 ? 'trending' : 'new') as 'trending' | 'acknowledged' | 'new',
      ward: a.wardName || '',
      supporters: a.supportCount || 0,
      goalPercent: a.supportGoal > 0 ? Math.round(((a.supportCount || 0) / a.supportGoal) * 100) : 0,
      incidents: a.evidenceCount || 0,
      locations: 0,
      impactLabel: a.economicImpact?.costOfInaction ? `\u20B9${Math.round(a.economicImpact.costOfInaction / 100000)}L` : '',
      impactColor: '#0F766E',
      creatorInitial: (a.creatorName || 'C').charAt(0),
      creatorName: a.creatorName || t('home.citizen', 'Citizen'),
      createdAgo: formatTimeAgo(a.createdAt, t),
      hasSupported: a.hasSupported ?? false,
    }));
  }, [actionsData]);

  // New user empty state check
  const isNewUser = (dashboardStats?.civic_score ?? 0) === 0
    && (dashboardStats?.issues_reported ?? 0) === 0
    && (!issueList || issueList.length === 0);

  // Skeleton loading state
  const isLoadingDashboard = !dashboardStats && !user;

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
        case 'actions':
          navigation.navigate('ActionsList' as any);
          break;
        default:
          break;
      }
    },
    [navigation],
  );

  return (
    <View style={[styles.container, darkMode && { backgroundColor: '#0F1419' }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={darkMode ? '#0F1419' : colors.background} />

      {/* ================================================================ */}
      {/* 1. HEADER                                                        */}
      {/* ================================================================ */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }, darkMode && { backgroundColor: '#0F1419' }]}>
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
            <Text style={styles.greetingText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {greeting}, {firstName}
            </Text>
            <Text style={styles.greetingSubText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {civicLevel} {t('home.level', 'Level')} · {dashboardStats?.ward_name || user?.ward || t('home.defaultWard', 'Ward 45')}
            </Text>
            <Text style={styles.lastSynced} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('home.lastSynced', 'Last synced:')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Streak flame — only show when active */}
          {(dashboardStats?.streak_days ?? 0) > 0 && (
            <View style={styles.streakBadge}>
              <Svg viewBox="0 0 16 16" width={12} height={12} fill="none">
                <Path d="M8 1c0 3-3 4.5-3 7.5a3.5 3.5 0 007 0C12 5.5 8 4 8 1z" fill={SAFFRON} />
                <Path d="M8 7c0 1.5-1.5 2.25-1.5 3.75a1.75 1.75 0 003.5 0C10 9.25 8 8.5 8 7z" fill="#FFD700" />
              </Svg>
              <Text style={styles.streakText}>{dashboardStats.streak_days}</Text>
            </View>
          )}

          {/* Language */}
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('Language')}
            activeOpacity={0.7}
          >
            <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
              <Circle cx={12} cy={12} r={10} stroke={NAVY_SOFT} strokeWidth={2} />
              <Path
                d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"
                stroke={NAVY_SOFT}
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
              <Circle cx={10.5} cy={10.5} r={7} stroke={NAVY_SOFT} strokeWidth={2} />
              <Path d="M15.5 15.5L21 21" stroke={NAVY_SOFT} strokeWidth={2} strokeLinecap="round" />
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
                stroke={NAVY_SOFT}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M13.73 21a2 2 0 01-3.46 0"
                stroke={NAVY_SOFT}
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
          <View style={styles.taglineRow}>
            <Svg width={98} height={56} viewBox="0 0 641 366" style={{ marginTop: -16, marginRight: -6 }}>
              <Path fill="#121825" transform="scale(0.476934 0.476562)" d="M1125.26 361.315C1125.35 361.306 1125.43 361.296 1125.51 361.287C1158.61 359.981 1192.51 369.093 1218.01 390.742C1236.3 406.276 1248.82 426.994 1250.74 450.975C1252.8 475.223 1245.41 498.519 1229.48 516.96C1218.08 530.16 1205.23 538.725 1189.25 545.663C1172.86 552.784 1157.05 555.186 1139.39 556.544C1103.33 556.978 1070.59 549.543 1042.59 525.374C1024.36 509.791 1013.21 487.489 1011.69 463.55C1010.2 440.805 1017.83 418.403 1032.91 401.307C1057.29 373.428 1089.49 363.736 1125.26 361.315ZM1136.46 521.252C1144.95 520.369 1150.01 519.856 1157.95 517.075C1186.57 507.049 1201.63 480.618 1198.38 450.904C1196.7 434.896 1188.61 420.253 1175.94 410.321C1163.3 400.284 1143.92 394.272 1128.01 396.11C1107.91 397.775 1091.18 403.348 1077.66 419.084C1056.4 443.822 1059.63 484.224 1084.8 505.056C1100.25 517.844 1116.78 521.654 1136.46 521.252Z" />
              <Path fill="#121825" transform="scale(0.476934 0.476562)" d="M788.176 365.053C824.179 364.389 859.776 365.809 896.376 364.945C932.495 364.094 979.55 365.577 998.434 403.081C1004.86 415.838 1003.71 430.288 998.928 443.394C992.509 460.984 977.304 468.08 961.43 475.277C987.042 500.659 1013.62 527.749 1038.8 553.588C1019.67 554.062 997.754 553.509 978.394 553.538C967.965 543.694 956.455 530.872 946.653 520.273C935.009 507.821 923.429 495.31 911.912 482.741C911.202 506.02 911.822 530.15 912.197 553.463C904.832 553.61 870.056 554.659 865.258 552.952L864.873 551.549L864.809 423.392L911.691 423.452L911.974 457.047C929.753 454.737 952.495 451.709 952.423 428.605C952.307 391.096 899.493 397.408 874.611 397.396C859.378 397.316 844.145 397.339 828.912 397.466C828.122 448.464 828.861 502.655 829.279 553.768C811.623 553.539 793.965 553.465 776.308 553.548L776.256 445.021C776.264 430.121 775.678 410.202 777.095 395.594C777.583 390.558 785.857 371.6 788.176 365.053Z" />
              <Path fill="#121825" transform="scale(0.476934 0.476562)" d="M717.471 345.088C736.021 345.179 759.714 344.524 777.744 345.355C746.903 420.795 712.742 496.302 681.591 571.984C664.386 572.759 634.756 572.884 617.77 572.045C588.104 505.787 555.52 440.353 525.658 374.142C521.305 364.49 516.754 354.822 512.155 345.288L575.063 345.273C600.378 400.803 623.119 458.491 648.83 513.307C654.754 501.199 661.928 480.665 667.552 467.525C684.8 427.229 700.077 385.282 717.471 345.088Z" />
              <Path fill="#121825" transform="scale(0.476934 0.476562)" d="M213.234 361.327C234.061 361.563 251.634 362.415 271.561 369.226L271.615 408.784C267.864 407.454 264.108 406.152 260.335 404.885C221.993 392.003 166.118 394.609 143.781 433.917C137.145 445.373 135.421 459.025 139.001 471.772C150.81 514.34 207.116 523.389 244.071 515.536C253.019 513.634 262.651 510.36 271.533 507.846C271.896 515.308 271.682 524.366 271.703 531.946L271.779 550.138C256.65 554.132 243.188 556.647 227.395 557.258C187.661 558.797 139.424 548.689 109.548 520.582C93.3341 505.29 83.8414 484.193 83.1499 461.914C82.0554 421.739 108.473 390.96 143.809 375.201C166.483 365.089 188.743 361.973 213.234 361.327Z" />
              <Path fill="#121825" transform="scale(0.476934 0.476562)" d="M500.47 361.379C503.523 363.88 532.09 429.256 535.691 437.471C524.125 475.458 509.867 515.389 497.528 553.589C476.984 554.509 456.772 553.451 436.205 553.479C422.742 514.297 406.952 475.113 392.211 436.337C383.853 414.558 372.537 387.383 365.448 365.636C370.854 364.885 380.837 365.093 386.495 365.104L420.105 365.213C435.644 408.137 450.954 451.143 466.034 494.23C470.492 479.031 473.709 463.376 478.021 448.126C486.141 419.408 492.597 390.124 500.47 361.379Z" />
              <Path fill="#121825" transform="scale(0.476934 0.476562)" d="M328.78 365.284C335.468 365.209 342.723 365.452 349.454 365.546C349.771 371.838 349.399 381.237 349.348 387.731L349.192 428.899L349.637 553.658C339.736 553.862 329.368 553.733 319.43 553.757L297.976 553.7C297.533 532.026 297.876 509.114 297.879 487.377L297.866 365.484C308.166 365.287 318.353 365.572 328.78 365.284Z" />
              <Path fill="#DA5E34" transform="scale(0.476934 0.476562)" d="M576.072 291.009C616.117 285.657 675.933 283.354 716.025 291.199C714.138 300.499 711.401 310 709.64 318.952C680.388 318.047 676.755 313.403 675.831 345.299L616.723 345.277C613.963 311.069 613.071 319.284 582.268 318.993C580.22 309.713 578.228 300.249 576.072 291.009Z" />
              <Path fill="#DA5E34" transform="scale(0.476934 0.476562)" d="M717.471 345.088C721.44 334.405 728.39 309.173 738.663 304.442C770.496 289.78 903.097 320.285 942.824 329.371C960.859 333.496 980.351 336.692 997.642 343.341C999.31 343.987 1000.96 344.68 1002.59 345.418C972.932 343.306 799.363 319.123 785.074 331.385C781.13 334.77 780.129 340.958 777.744 345.355C759.714 344.524 736.021 345.179 717.471 345.088Z" />
              <Path fill="#121825" transform="scale(0.476934 0.476562)" d="M616.723 345.277L675.831 345.299L673.874 388.33C672.794 417.602 673.702 417.818 662.021 445.183C657.508 455.909 652.862 466.579 648.085 477.19C640.937 465.919 624.545 428.027 620.128 414.552C619.341 412.15 618.76 392.523 618.623 388.822C618.159 374.3 617.526 359.784 616.723 345.277Z" />
              <Path fill="#DA5E34" transform="scale(0.476934 0.476562)" d="M292.175 345.94C336.359 331.754 517.165 286.282 553.502 305.139C563.304 310.226 571.057 335.22 575.063 345.273L512.155 345.288C509.682 340.332 507.382 331.405 501.75 329.494C475.794 320.688 330.828 342.644 292.175 345.94Z" />
              <Circle fill="#DA5E34" transform="scale(0.476934 0.476562)" cx="525" cy="259" r="33" />
              <Circle fill="#DA5E34" transform="scale(0.476934 0.476562)" cx="765" cy="259" r="33" />
            </Svg>
            <Text style={styles.taglineText}>{t('home.democracyTagline', 'DEMOCRACY')}</Text>
            <Text style={styles.taglineDot}>{'\u2022'}</Text>
            <Text style={styles.taglineText}>{t('home.youShape', 'YOU SHAPE')}</Text>
            <Text style={styles.taglineTM}>
              <Text style={styles.taglineTMDot}>{'.'}</Text>{'TM'}
            </Text>
            <View style={styles.taglineLine}>
              <Svg width="100%" height={1} viewBox="0 0 100 1" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="fadeLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#D1D5DB" stopOpacity={0.6} />
                    <Stop offset="100%" stopColor="#D1D5DB" stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Path d="M0 0.5 H100" stroke="url(#fadeLineGrad)" strokeWidth={1} />
              </Svg>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* OFFLINE BANNER                                                */}
        {/* ============================================================ */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Svg viewBox="0 0 24 24" width={16} height={16} fill="none">
              <Path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="#D97706" strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <Text style={styles.offlineText}>{t('home.offline', 'Offline — data may not be current')}</Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* 3. WEATHER TIP (dynamic from weather API)                     */}
        {/* ============================================================ */}
        {weatherTip?.show && (
          <View style={[styles.weatherTip, { backgroundColor: weatherTip.bgColor }]}>
            <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
              <Path
                d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"
                stroke={weatherTip.textColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <Path d="M8 15v2M12 15v2M16 15v2" stroke={weatherTip.textColor} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
            </Svg>
            <Text style={[styles.weatherText, { color: weatherTip.textColor }]}>
              {weatherTip.message}
            </Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* SKELETON LOADING STATE                                        */}
        {/* ============================================================ */}
        {isLoadingDashboard && (
          <View style={styles.skeletonWrap}>
            <View style={[styles.skeletonBox, { width: '60%', height: 20, marginBottom: 8 }]} />
            <View style={[styles.skeletonBox, { width: '40%', height: 14, marginBottom: 24 }]} />
            <View style={[styles.skeletonBox, { width: '100%', height: 120, borderRadius: 16, marginBottom: 16 }]} />
            <View style={[styles.skeletonBox, { width: '100%', height: 80, borderRadius: 16, marginBottom: 16 }]} />
            <View style={[styles.skeletonBox, { width: '100%', height: 160, borderRadius: 16, marginBottom: 16 }]} />
          </View>
        )}

        {/* ============================================================ */}
        {/* EMPTY STATE — NEW USER                                        */}
        {/* ============================================================ */}
        {!isLoadingDashboard && isNewUser && (
          <View style={styles.emptyState}>
            <Svg viewBox="0 0 160 160" width={160} height={160} fill="none">
              <Circle cx={80} cy={55} r={14} fill="#FFF3ED" stroke="#FF6B35" strokeWidth={2} />
              <Path d="M80 69L80 105" stroke="#FF6B35" strokeWidth={3} strokeLinecap="round" />
              <Path d="M80 80L65 95" stroke="#FF6B35" strokeWidth={2.5} strokeLinecap="round" />
              <Path d="M80 80L95 72" stroke="#FF6B35" strokeWidth={2.5} strokeLinecap="round" />
              <Path d="M80 105L68 135" stroke="#FF6B35" strokeWidth={2.5} strokeLinecap="round" />
              <Path d="M80 105L92 135" stroke="#FF6B35" strokeWidth={2.5} strokeLinecap="round" />
              <Path d="M95 72L95 35" stroke="#1E3A5F" strokeWidth={2} strokeLinecap="round" />
              <Path d="M95 35L120 42L95 50" fill="#FF6B35" opacity={0.8} />
              <Circle cx={75} cy={53} r={1.5} fill="#0B1426" />
              <Circle cx={85} cy={53} r={1.5} fill="#0B1426" />
              <Path d="M75 60Q80 65 85 60" stroke="#0B1426" strokeWidth={1.5} fill="none" strokeLinecap="round" />
            </Svg>
            <Text style={styles.emptyTitle}>{t('home.plantYourFlag', 'Plant Your Flag')}</Text>
            <Text style={styles.emptySubtitle}>{t('home.beTheFirst', 'Be the first to report an issue in your ward and start building your civic reputation.')}</Text>
            <View style={styles.emptySteps}>
              <View style={styles.emptyStep}><View style={styles.emptyStepNum}><Text style={styles.emptyStepNumText}>1</Text></View><Text style={styles.emptyStepText}>{t('home.spotAnIssue', 'Spot an issue')}</Text></View>
              <View style={styles.emptyStep}><View style={styles.emptyStepNum}><Text style={styles.emptyStepNumText}>2</Text></View><Text style={styles.emptyStepText}>{t('home.snapAPhoto', 'Snap a photo')}</Text></View>
              <View style={styles.emptyStep}><View style={styles.emptyStepNum}><Text style={styles.emptyStepNumText}>3</Text></View><Text style={styles.emptyStepText}>{t('home.watchItGetFixed', 'Watch it get fixed')}</Text></View>
            </View>
            <TouchableOpacity style={styles.emptyCta} onPress={() => navigation.navigate('Main', { screen: 'Report' } as any)} activeOpacity={0.7}>
              <Text style={styles.emptyCtaText}>{t('home.reportYourFirstIssue', 'Report Your First Issue')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================================ */}
        {/* DASHBOARD SECTIONS (hidden when loading or new user)          */}
        {/* ============================================================ */}
        {!isLoadingDashboard && !isNewUser && (<>

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
            onBoostPress={() => navigation.navigate('Main', { screen: 'Report' } as any)}
          />
        </View>

        {/* ============================================================ */}
        {/* 5. YOUR REPRESENTATIVES — Governance Pyramid Strip            */}
        {/* ============================================================ */}
        {governanceChain && governanceChain.length > 0 && (
          <View style={styles.sectionSpacing}>
            <RepresentativesPyramid
              reps={governanceChain}
              onMessage={(rep) => {
                if (rep.userId) {
                  navigation.navigate('Chat', { recipientId: rep.userId, recipientName: rep.name });
                } else {
                  setComingSoonFeature(String(t('home.directMessaging', 'Direct Messaging with Representatives')));
                }
              }}
              onRate={(rep) => {
                const match = leaders?.find(l => l.name === rep.name);
                if (match) {
                  navigation.navigate('LeaderProfile', { leaderId: match.id });
                } else {
                  setComingSoonFeature(String(t('home.ratingFor', 'Rating for {{name}}', { name: rep.name } as any)));
                }
              }}
              onViewIssues={() => navigation.navigate('Main', { screen: 'Map' } as any)}
            />
          </View>
        )}

        {/* ============================================================ */}
        {/* 6. WARD DASHBOARD                                             */}
        {/* ============================================================ */}
        <View style={styles.sectionSpacing}>
          <WardDashboardChart
            open={openCount || 0}
            inProgress={inProgressCount || 0}
            resolved={resolvedCount || 0}
            verified={verifiedCount || 0}
            wardName={dashboardStats?.ward_name || ''}
            wardArea={dashboardStats?.ward_area || ''}
            rank={dashboardStats?.ward_rank || 0}
            totalWards={dashboardStats?.total_wards || 0}
            resolutionTrend={dashboardStats?.resolution_trend || ''}
            sparklineData={dashboardStats?.sparkline_data || []}
            sparklineTrend={dashboardStats?.sparkline_trend || ''}
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

        {/* ============================================================ */}
        {/* 8. COMMUNITY PULSE                                            */}
        {/* ============================================================ */}
        <View style={styles.sectionSpacing}>
          <CommunityPulse
            activeCitizens={dashboardStats?.active_citizens_in_ward || 0}
            weeklyTrendPercent={dashboardStats?.active_citizens_trend || 0}
            initials={dashboardStats?.citizen_initials || []}
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
                { icon: 'location', value: String(firstPattern.locations ?? firstPattern.unique_locations ?? 0), label: t('home.locations') },
                { icon: 'calendar', value: String(firstPattern.days_unresolved ?? 0), label: t('home.daysUnresolved') },
                { icon: 'damage', value: firstPattern.estimated_damage ?? (firstPattern.economic_impact ? `\u20B9${Math.round(firstPattern.economic_impact / 100000)}L` : ''), label: t('home.estDamage'), valueColor: '#0F766E' },
              ]}
              onStartAction={() => navigation.navigate('CreateAction' as any, { patternId: firstPattern.id })}
              onViewEvidence={() => navigation.navigate('IssuesList' as any, { category: firstPattern.category })}
            />
          </View>
        )}

        {/* ============================================================ */}
        {/* 10. WARD COMPARISON NUDGE                                     */}
        {/* ============================================================ */}
        {dashboardStats?.comparison_ward && dashboardStats.comparison_count > 0 && (
          <View style={styles.comparisonCard}>
            <Svg viewBox="0 0 16 16" width={16} height={16} fill="none">
              <Path d="M8 1v14M1 8h14" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" />
              <Path d="M4 4l4 4-4 4" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
            </Svg>
            <Text style={styles.comparisonText}>
              {t('home.wardComparison', {
                ward: dashboardStats.comparison_ward,
                count: dashboardStats.comparison_count,
                yourCount: dashboardStats.your_resolved_count,
              })}
            </Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* 11. QUICK ACTIONS CAROUSEL                                    */}
        {/* ============================================================ */}
        <View style={styles.sectionSpacing}>
          <QuickActions
            pollCount={dashboardStats?.active_polls_count || 0}
            promiseCount={dashboardStats?.promises_tracked || 0}
            chiScore={dashboardStats?.chi_score || 0}
            messageCount={dashboardStats?.unread_messages || 0}
            actionCount={dashboardStats?.active_actions_count || 0}
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
              onPress={(id) => navigation.navigate('ActionDetail' as any, { actionId: id })}
              onSeeAll={() => navigation.navigate('ActionsList' as any)}
              onSupport={async (id) => {
                try {
                  const res = await api.post<{ supported: boolean; support_count: number }>(`/api/v1/actions/${id}/support`);
                  // Refetch actions to update the card
                  refetchStats();
                } catch {}
              }}
              onShare={async (id) => {
                const action = communityActions.find(a => a.id === id);
                const shareUrl = `https://civitro.com/share/action/${id}`;
                try {
                  await Share.share({
                    title: action ? String(t('home.shareActionTitle', 'Community Action: {{title}}', { title: action.title } as any)) : String(t('home.shareActionGeneric', 'Community Action on Civitro')),
                    message: action ? String(t('home.shareActionMessage', 'Support this: "{{title}}"', { title: action.title } as any)) + `\n\n${shareUrl}` : shareUrl,
                    url: shareUrl,
                  });
                } catch {}
              }}
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
              timeAgo={formatTimeAgo(recentResolution.resolved_at, t)}
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
              <Text style={styles.sectionTitle}>{t('home.liveFromYourWard')}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('IssuesList')}>
              <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
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

        {/* End of feed */}
        <View style={styles.endOfFeed}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M20 6L9 17l-5-5" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.endOfFeedText}>{t('home.allCaughtUp', "You're all caught up")}</Text>
          <Text style={styles.endOfFeedTagline}>{t('home.democracyYouShape', 'Democracy. You Shape.')}{'\u2122'}</Text>
        </View>

        {/* Bottom spacer for FAB clearance */}
        <View style={styles.bottomSpacer} />
        </>)}
      </ScrollView>

      {/* FAB */}
      <FAB
        onPress={(key) => {
          if (key === 'photo') {
            navigation.navigate('Main', { screen: 'Report' } as any);
          } else if (key === 'voice') {
            navigation.navigate('CreateVoice' as any);
          } else if (key === 'community_action') {
            navigation.navigate('CreateAction' as any);
          } else {
            const labels: Record<string, string> = {
              text: t('home.textReport', 'Text Report'),
              pin: t('home.pinLocation', 'Pin Location'),
            };
            setComingSoonFeature(labels[key] || key);
          }
        }}
      />

      {/* Coming Soon Modal */}
      <Modal visible={!!comingSoonFeature} transparent animationType="fade" onRequestClose={() => setComingSoonFeature(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setComingSoonFeature(null)}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Svg viewBox="0 0 24 24" width={28} height={28} fill="none">
                <Path d="M12 2L2 7l10 5 10-5-10-5z" stroke={SAFFRON} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M2 17l10 5 10-5" stroke={SAFFRON} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M2 12l10 5 10-5" stroke={SAFFRON} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={styles.modalTitle}>{t('home.comingSoon', 'Coming Soon')}</Text>
            <Text style={styles.modalSubtitle}>
              <Text style={styles.modalFeatureName}>{comingSoonFeature}</Text>
              {' '}{t('home.isBeingBuilt', 'is being built. We will notify you when it is ready.')}
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setComingSoonFeature(null)} activeOpacity={0.7}>
              <Text style={styles.modalBtnText}>{t('home.gotIt', 'Got it')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 8,
  },
  shieldWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SAFFRON,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  shieldLevel: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  greetingBlock: {
    flex: 1,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '700',
    color: NAVY,
    lineHeight: 24,
  },
  greetingSubText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  lastSynced: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
    backgroundColor: '#FFF3ED',
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: SAFFRON,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: SAFFRON,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
    paddingLeft: 2,
    paddingRight: 20,
    paddingBottom: 12,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taglineText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B0B5BE',
    letterSpacing: 1.5,
  },
  taglineDot: {
    color: SAFFRON,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    marginLeft: -8,
    marginRight: -1,
  },
  taglineTMDot: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    marginLeft: -2,
  },
  taglineTM: {
    fontSize: 10,
    color: SAFFRON,
    fontWeight: '800',
    marginTop: -8,
    marginLeft: -7,
  },
  taglineLine: {
    flex: 1,
    height: 1,
    marginLeft: 8,
    alignSelf: 'center',
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
  endOfFeed: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  endOfFeedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  endOfFeedTagline: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
    opacity: 0.7,
  },
  bottomSpacer: {
    height: 100,
  },

  // ---- COMING SOON MODAL ----
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0B1426',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalFeatureName: {
    fontWeight: '700',
    color: '#FF6B35',
  },
  modalBtn: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ---- OFFLINE BANNER ----
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    gap: 8,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
    flex: 1,
  },

  // ---- EMPTY STATE ----
  emptyState: { alignItems: 'center', padding: 40, paddingTop: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#0B1426', marginTop: 20, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },
  emptySteps: { flexDirection: 'row', gap: 8, marginBottom: 28, flexWrap: 'wrap', justifyContent: 'center' },
  emptyStep: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  emptyStepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center' },
  emptyStepNumText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  emptyStepText: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  emptyCta: { backgroundColor: '#FF6B35', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 4 },
  emptyCtaText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // ---- SKELETON LOADING ----
  skeletonWrap: { padding: 20 },
  skeletonBox: { backgroundColor: '#F3F4F6', borderRadius: 8 },
});
