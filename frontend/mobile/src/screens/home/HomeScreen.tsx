import React, { useState, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { IssueCard } from '../../components/issues/IssueCard';
import { VoiceCard } from '../../components/voices/VoiceCard';
import { StatsBar } from '../../components/ui/StatsCard';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { FAB } from '../../components/ui/FAB';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import { useAuth } from '../../hooks/useAuth';
import { useIssues } from '../../hooks/useIssues';
import { useVoices } from '../../hooks/useVoices';
import { useUnreadCount } from '../../hooks/useNotifications';
import type { RootStackParamList } from '../../navigation/types';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavProp>();
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const { refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: issues, isLoading, refetch } = useIssues();
  const { data: voices } = useVoices();
  const { data: unreadData } = useUnreadCount();
  const [refreshing, setRefreshing] = useState(false);

  // Refresh civic score whenever this screen comes into focus
  useFocusEffect(useCallback(() => { refreshProfile(); }, [refreshProfile]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refreshProfile()]);
    setRefreshing(false);
  }, [refetch, refreshProfile]);

  const issueList = issues ?? [];
  const wardStats = [
    { label: t('home.open'), value: issueList.filter(i => i.status === 'reported').length, color: colors.error },
    { label: t('home.inProgress'), value: issueList.filter(i => ['assigned', 'work_started'].includes(i.status)).length, color: colors.warning },
    { label: t('home.resolved'), value: issueList.filter(i => i.status === 'completed').length, color: colors.success },
    { label: t('home.total'), value: issueList.length, color: colors.info },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Avatar name={user?.name || 'User'} size={44} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              {(() => {
                const hour = new Date().getHours();
                if (hour < 12) return t('home.greeting');
                if (hour < 17) return t('home.greetingAfternoon');
                return t('home.greetingEvening');
              })()}, {user?.name?.split(' ')[0] || t('home.citizen')} {'\u{1F44B}'}
            </Text>
            {user?.ward && <Text style={styles.wardText}>{user.ward}</Text>}
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
            {(unreadData?.count ?? 0) > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadData?.count ?? 0}</Text>
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
            score={user?.civicScore ?? 0}
            size={64}
            strokeWidth={5}
            label="Civic"
          />
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>{t('home.yourCivicScore')}</Text>
            <Text style={styles.scoreDesc}>
              {t('home.civicScoreHint')}
            </Text>
            {(user?.civicScore ?? 0) > 0 && (
              <Badge
                text={
                  (user?.civicScore ?? 0) >= 75
                    ? t('profile.starCitizen')
                    : (user?.civicScore ?? 0) >= 50
                    ? t('profile.activeCitizen')
                    : t('profile.newCitizen')
                }
                backgroundColor={
                  ((user?.civicScore ?? 0) >= 50 ? colors.success : colors.info) + '15'
                }
                color={(user?.civicScore ?? 0) >= 50 ? colors.success : colors.info}
                size="sm"
              />
            )}
          </View>
        </View>

        {/* Ward Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.wardDashboard')}</Text>
        </View>
        <StatsBar stats={wardStats} style={styles.statsBar} />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Polls')}
          >
            <Text style={styles.quickActionIcon}>{'\u{1F5F3}'}</Text>
            <Text style={styles.quickActionText}>{t('home.quickPolls')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Promises')}
          >
            <Text style={styles.quickActionIcon}>{'\u{1F91D}'}</Text>
            <Text style={styles.quickActionText}>{t('home.quickPromises')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('CHI', {})}
          >
            <Text style={styles.quickActionIcon}>{'\u{1F3E5}'}</Text>
            <Text style={styles.quickActionText}>{t('home.quickCHI')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Messages')}
          >
            <Text style={styles.quickActionIcon}>{'\u{1F4E9}'}</Text>
            <Text style={styles.quickActionText}>{t('home.quickMessages')}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Issues */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.recentIssues')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('IssuesList')}>
            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          issues?.slice(0, 3).map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
            />
          ))
        )}

        {/* Community Voices */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.communityVoices')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('VoicesList')}>
            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {(voices ?? []).map(voice => (
          <VoiceCard key={voice.id} voice={voice} />
        ))}

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
    paddingTop: spacing.lg,
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
