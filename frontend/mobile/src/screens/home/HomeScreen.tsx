import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IssueCard } from '../../components/issues/IssueCard';
import { VoiceCard } from '../../components/voices/VoiceCard';
import { StatsBar } from '../../components/ui/StatsCard';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { FAB } from '../../components/ui/FAB';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { getGreeting } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useIssues } from '../../hooks/useIssues';
import type { RootStackParamList } from '../../navigation/types';
import type { Voice } from '../../types/voice';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

const MOCK_VOICES: Voice[] = [
  {
    id: 'voice-001',
    userId: 'user-006',
    userName: 'Rahul Deshpande',
    content: 'The new metro line has really improved connectivity in our area. Commute time reduced by 30 minutes!',
    category: 'Infrastructure',
    sentiment: 'positive',
    ward: 'Ward 15',
    constituency: 'Bangalore South',
    upvotes: 34,
    commentCount: 8,
    hasUpvoted: false,
    tags: ['metro', 'transport', 'infrastructure'],
    createdAt: '2025-11-29T16:00:00Z',
  },
  {
    id: 'voice-002',
    userId: 'user-007',
    userName: 'Deepa Venkatesh',
    content: 'Still no proper footpath on the main road. Pedestrians are forced to walk on the road with heavy traffic. This needs urgent attention from BBMP.',
    category: 'Safety',
    sentiment: 'negative',
    ward: 'Ward 15',
    constituency: 'Bangalore South',
    upvotes: 67,
    commentCount: 15,
    hasUpvoted: true,
    tags: ['footpath', 'pedestrian', 'safety'],
    createdAt: '2025-11-30T10:00:00Z',
  },
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavProp>();
  const user = useAuthStore(state => state.user);
  const notificationCount = useUIStore(state => state.notificationCount);
  const { data: issues, isLoading, refetch } = useIssues();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const wardStats = [
    { label: 'Open', value: 23, color: colors.error },
    { label: 'In Progress', value: 15, color: colors.warning },
    { label: 'Resolved', value: 142, color: colors.success },
    { label: 'Avg Days', value: '4.2', color: colors.info },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Avatar name={user?.name || 'User'} size={44} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Citizen'} {'\u{1F44B}'}
            </Text>
            <Text style={styles.wardText}>{user?.ward || 'Ward 15 - Koramangala'}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Search')}
            style={styles.iconButton}
          >
            <Text style={styles.iconText}>{'\u{1F50D}'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.iconButton}
          >
            <Text style={styles.iconText}>{'\u{1F514}'}</Text>
            {notificationCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

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
        {/* Civic Score */}
        <View style={styles.scoreSection}>
          <ScoreRing
            score={user?.civicScore || 72}
            size={64}
            strokeWidth={5}
            label="Civic"
          />
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>Your Civic Score</Text>
            <Text style={styles.scoreDesc}>
              Report issues and participate to improve your score
            </Text>
            <Badge
              text="Active Citizen"
              backgroundColor={colors.success + '15'}
              color={colors.success}
              size="sm"
            />
          </View>
        </View>

        {/* Ward Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ward Dashboard</Text>
        </View>
        <StatsBar stats={wardStats} style={styles.statsBar} />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Polls')}
          >
            <Text style={styles.quickActionIcon}>{'\u{1F5F3}'}</Text>
            <Text style={styles.quickActionText}>Polls</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Promises')}
          >
            <Text style={styles.quickActionIcon}>{'\u{1F91D}'}</Text>
            <Text style={styles.quickActionText}>Promises</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('CHI', {})}
          >
            <Text style={styles.quickActionIcon}>{'\u{1F3E5}'}</Text>
            <Text style={styles.quickActionText}>CHI</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Messages')}
          >
            <Text style={styles.quickActionIcon}>{'\u{1F4E9}'}</Text>
            <Text style={styles.quickActionText}>Messages</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Issues */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Issues</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {issues?.slice(0, 3).map(issue => (
          <IssueCard
            key={issue.id}
            issue={issue}
            onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
          />
        ))}

        {/* Community Voices */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Community Voices</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {MOCK_VOICES.map(voice => (
          <VoiceCard key={voice.id} voice={voice} />
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB */}
      <FAB
        onPress={() => navigation.navigate('Main', { screen: 'Report' } as any)}
        icon={'\u{1F4F7}'}
        label="Report"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  wardText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconText: {
    fontSize: 18,
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
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
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  scoreInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  scoreDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  statsBar: {
    marginBottom: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIcon: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: 100,
  },
});
