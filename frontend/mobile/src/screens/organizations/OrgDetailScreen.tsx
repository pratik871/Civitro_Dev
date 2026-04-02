import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime, formatNumber, toPercentage } from '../../lib/utils';
import {
  useOrganization,
  useOrgMembers,
  useBroadcasts,
  useOrgAnalytics,
} from '../../hooks/useOrganizations';
import type { OrgType, OrgMember, Broadcast } from '../../hooks/useOrganizations';
import type { RootStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'OrgDetail'>;

const ORG_TYPE_LABEL_KEYS: Record<OrgType, { key: string; fallback: string }> = {
  political_party: { key: 'organizations.politicalParty', fallback: 'Political Party' },
  ngo: { key: 'organizations.ngo', fallback: 'NGO' },
  rwa: { key: 'organizations.rwa', fallback: 'RWA' },
  club: { key: 'organizations.club', fallback: 'Club' },
};

const ORG_TYPE_COLORS: Record<OrgType, string> = {
  political_party: '#7C3AED',
  ngo: '#059669',
  rwa: '#2563EB',
  club: '#D97706',
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#DC2626',
  functionary: '#D97706',
  member: '#6B7280',
};

export const OrgDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { orgId } = route.params;

  const { data: org, isLoading: orgLoading, refetch: refetchOrg } = useOrganization(orgId);
  const { data: membersData } = useOrgMembers(orgId, 1, 5);
  const { data: broadcastsData } = useBroadcasts(orgId, 1, 5);
  const { data: analytics } = useOrgAnalytics(orgId);

  const isLoading = orgLoading;

  if (isLoading || !org) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.saffron} />
      </View>
    );
  }

  const typeColor = ORG_TYPE_COLORS[org.type] || colors.textMuted;
  const members = membersData?.members ?? [];
  const totalMembers = analytics?.totalMembers ?? membersData?.totalCount ?? 0;
  const broadcasts = broadcastsData?.broadcasts ?? [];
  const totalBroadcasts = analytics?.totalBroadcasts ?? broadcastsData?.totalCount ?? 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetchOrg}
            tintColor={colors.saffron}
            colors={[colors.saffron]}
          />
        }
      >
        {/* Org Header */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={[styles.orgIcon, { backgroundColor: typeColor + '15' }]}>
              <Text style={styles.orgIconText}>
                {org.type === 'political_party'
                  ? '\u{1F3DB}'
                  : org.type === 'ngo'
                  ? '\u{1F91D}'
                  : org.type === 'rwa'
                  ? '\u{1F3E0}'
                  : '\u{1F465}'}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.orgName}>{org.name}</Text>
              <Badge
                text={ORG_TYPE_LABEL_KEYS[org.type] ? t(ORG_TYPE_LABEL_KEYS[org.type].key, ORG_TYPE_LABEL_KEYS[org.type].fallback) : org.type}
                backgroundColor={typeColor + '15'}
                color={typeColor}
                size="sm"
              />
            </View>
          </View>
          {org.description ? (
            <Text style={styles.orgDescription}>{org.description}</Text>
          ) : null}
        </Card>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatNumber(totalMembers)}</Text>
            <Text style={styles.statLabel}>{t('organizations.members', 'Members')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.saffron }]}>
              {formatNumber(totalBroadcasts)}
            </Text>
            <Text style={styles.statLabel}>{t('organizations.broadcasts', 'Broadcasts')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {analytics
                ? toPercentage(analytics.avgReadRate * 100, 100)
                : '--'}
            </Text>
            <Text style={styles.statLabel}>{t('organizations.readRate', 'Read Rate')}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate('OrgMembers', { orgId: org.id })
            }
          >
            <Text style={styles.actionIcon}>{'\u{1F465}'}</Text>
            <Text style={styles.actionLabel}>{t('organizations.members', 'Members')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate('Broadcasts', { orgId: org.id })
            }
          >
            <Text style={styles.actionIcon}>{'\u{1F4E2}'}</Text>
            <Text style={styles.actionLabel}>{t('organizations.broadcasts', 'Broadcasts')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonMuted]}
            onPress={() => {
              // Analytics screen can be added later
            }}
          >
            <Text style={styles.actionIcon}>{'\u{1F4CA}'}</Text>
            <Text style={styles.actionLabel}>{t('organizations.analytics', 'Analytics')}</Text>
          </TouchableOpacity>
        </View>

        {/* Member Preview */}
        {members.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('organizations.members', 'Members')}</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('OrgMembers', { orgId: org.id })
                }
              >
                <Text style={styles.seeAllLink}>
                  {t('organizations.seeAll', 'See All')} ({totalMembers})
                </Text>
              </TouchableOpacity>
            </View>
            {members.slice(0, 5).map((member: OrgMember) => (
              <View key={member.id} style={styles.memberRow}>
                <Avatar
                  name={member.userName || member.userId}
                  imageUrl={member.userAvatar}
                  size={36}
                />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.userName || member.userId}
                  </Text>
                  <Text style={styles.memberJoined}>
                    {t('organizations.joined', 'Joined')} {formatRelativeTime(member.joinedAt)}
                  </Text>
                </View>
                <Badge
                  text={member.role}
                  backgroundColor={(ROLE_COLORS[member.role] || colors.textMuted) + '15'}
                  color={ROLE_COLORS[member.role] || colors.textMuted}
                  size="sm"
                />
              </View>
            ))}
          </Card>
        )}

        {/* Recent Broadcasts */}
        {broadcasts.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('organizations.recentBroadcasts', 'Recent Broadcasts')}</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Broadcasts', { orgId: org.id })
                }
              >
                <Text style={styles.seeAllLink}>
                  {t('organizations.seeAll', 'See All')} ({totalBroadcasts})
                </Text>
              </TouchableOpacity>
            </View>
            {broadcasts.slice(0, 3).map((broadcast: Broadcast) => (
              <View key={broadcast.id} style={styles.broadcastRow}>
                <View style={styles.broadcastContent}>
                  <Text style={styles.broadcastText} numberOfLines={2}>
                    {broadcast.text}
                  </Text>
                  <View style={styles.broadcastMeta}>
                    <Text style={styles.broadcastTime}>
                      {formatRelativeTime(broadcast.createdAt)}
                    </Text>
                    <Text style={styles.broadcastReach}>
                      {'\u{1F4E8}'} {broadcast.readCount}/{broadcast.totalCount} {t('organizations.read', 'read')}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: 40 }} />
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
    paddingBottom: spacing['3xl'],
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  headerCard: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orgIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  orgIconText: {
    fontSize: 28,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  orgName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  orgDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: spacing.xs,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
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
    letterSpacing: 0.5,
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.saffron + '10',
    borderWidth: 1,
    borderColor: colors.saffron + '25',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButtonMuted: {
    backgroundColor: colors.backgroundGray,
    borderColor: colors.border,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Section cards
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.saffron,
  },

  // Member row
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  memberJoined: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Broadcast row
  broadcastRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  broadcastContent: {
    gap: spacing.xs,
  },
  broadcastText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  broadcastMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  broadcastTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  broadcastReach: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
