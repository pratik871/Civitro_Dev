import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { TranslatedText } from '../../components/ui/TranslatedText';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime, formatNumber } from '../../lib/utils';
import { useActions, useTrendingActions, useSupportAction } from '../../hooks/useCommunityActions';
import { useAuthStore } from '../../stores/authStore';
import { ACTION_STATUS_LABELS, ACTION_STATUS_COLORS } from '../../types/action';
import type { CommunityAction } from '../../types/action';
import type { RootStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type FilterTab = 'all' | 'trending' | 'my_actions' | 'acknowledged';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: 'Trending' },
  { key: 'my_actions', label: 'My Actions' },
  { key: 'acknowledged', label: 'Acknowledged' },
];

export const ActionsListScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const currentUser = useAuthStore(s => s.user);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const { data: allActions, isLoading, refetch } = useActions(currentUser?.wardId);
  const { data: trendingActions } = useTrendingActions();
  const supportMutation = useSupportAction();

  const filteredActions = useMemo(() => {
    if (activeTab === 'trending') return trendingActions ?? [];
    const actions = allActions ?? [];
    switch (activeTab) {
      case 'my_actions':
        return actions.filter(a => a.creatorId === currentUser?.id);
      case 'acknowledged':
        return actions.filter(
          a => a.status === 'acknowledged' || a.status === 'committed' || a.status === 'in_progress',
        );
      default:
        return actions;
    }
  }, [allActions, trendingActions, activeTab, currentUser?.id]);

  const stats = useMemo(() => {
    const actions = allActions ?? [];
    const totalSupporters = actions.reduce((sum, a) => sum + a.supportCount, 0);
    const activeCount = actions.filter(
      a => a.status !== 'archived' && a.status !== 'verified',
    ).length;
    const resolvedCount = actions.filter(
      a => a.status === 'resolved' || a.status === 'verified',
    ).length;
    return { total: actions.length, active: activeCount, resolved: resolvedCount, supporters: totalSupporters };
  }, [allActions]);

  const handleSupport = (action: CommunityAction) => {
    supportMutation.mutate({
      actionId: action.id,
      support: !action.hasSupported,
    });
  };

  const renderHeader = () => (
    <View>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.saffron }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>{stats.resolved}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {formatNumber(stats.supporters)}
          </Text>
          <Text style={styles.statLabel}>Supporters</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsRow}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderProgressBar = (current: number, goal: number) => {
    const progress = Math.min(current / Math.max(goal, 1), 1);
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {formatNumber(current)} / {formatNumber(goal)} supporters
        </Text>
      </View>
    );
  };

  const renderAction = ({ item }: { item: CommunityAction }) => {
    const statusColor = ACTION_STATUS_COLORS[item.status];

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ActionDetail', { actionId: item.id })}
      >
        <Card style={styles.actionCard}>
          {/* Header row */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Avatar name={item.creatorName} size={28} />
              <View>
                <Text style={styles.creatorName}>{item.creatorName}</Text>
                <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
              </View>
            </View>
            <Badge
              text={ACTION_STATUS_LABELS[item.status]}
              backgroundColor={statusColor + '15'}
              color={statusColor}
              size="sm"
            />
          </View>

          {/* Title */}
          <TranslatedText text={item.title} style={styles.cardTitle} numberOfLines={2} />

          {/* Progress bar */}
          {renderProgressBar(item.supportCount, item.supportGoal)}

          {/* Bottom row: evidence count + support CTA */}
          <View style={styles.cardFooter}>
            <View style={styles.evidenceChip}>
              <Text style={styles.evidenceIcon}>{'\u{1F4CB}'}</Text>
              <Text style={styles.evidenceText}>
                {item.evidenceCount} issue{item.evidenceCount !== 1 ? 's' : ''} linked
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.supportButton,
                item.hasSupported && styles.supportButtonActive,
              ]}
              onPress={() => handleSupport(item)}
              disabled={supportMutation.isPending}
            >
              <Text style={[styles.supportButtonIcon, item.hasSupported && styles.supportButtonIconActive]}>
                {item.hasSupported ? '\u2714' : '\u270B'}
              </Text>
              <Text style={[styles.supportButtonText, item.hasSupported && styles.supportButtonTextActive]}>
                {item.hasSupported ? 'Supported' : 'Support'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.saffron} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <FlatList
        data={filteredActions}
        renderItem={renderAction}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={colors.saffron}
            colors={[colors.saffron]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{270A}'}</Text>
            <Text style={styles.emptyTitle}>No community actions yet</Text>
            <Text style={styles.emptyText}>
              Community actions help drive systemic change. Start one to rally your ward around an issue that matters.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateAction')}
            >
              <Text style={styles.createButtonText}>Start a Community Action</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      {(filteredActions.length > 0) && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateAction')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats
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

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundGray,
  },
  tabActive: {
    backgroundColor: colors.saffron,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.white,
  },

  // Action card
  actionCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  creatorName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },

  // Progress bar
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.saffron,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  evidenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  evidenceIcon: {
    fontSize: 12,
  },
  evidenceText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Support button
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron + '12',
    borderWidth: 1,
    borderColor: colors.saffron + '30',
  },
  supportButtonActive: {
    backgroundColor: colors.saffron,
    borderColor: colors.saffron,
    shadowColor: colors.saffron,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  supportButtonIcon: {
    fontSize: 14,
    color: colors.saffron,
  },
  supportButtonIconActive: {
    color: colors.white,
  },
  supportButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.saffron,
  },
  supportButtonTextActive: {
    color: colors.white,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing['3xl'],
    marginBottom: spacing.xl,
  },
  createButton: {
    backgroundColor: colors.saffron,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    shadowColor: colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing['3xl'],
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.white,
    marginTop: -2,
  },
});
