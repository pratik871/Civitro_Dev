import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { usePromises } from '../../hooks/usePromises';
import type { Promise as PromiseItem, PromiseStatus } from '../../hooks/usePromises';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime } from '../../lib/utils';
import type { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<PromiseStatus, { color: string; label: string; icon: string }> = {
  detected: { color: colors.textMuted, label: 'Detected', icon: '\uD83D\uDD0D' },
  on_track: { color: colors.warning, label: 'On Track', icon: '\uD83C\uDFD7' },
  delayed: { color: '#EA580C', label: 'Delayed', icon: '\u26A0\uFE0F' },
  fulfilled: { color: colors.success, label: 'Fulfilled', icon: '\u2705' },
  broken: { color: colors.error, label: 'Broken', icon: '\u274C' },
};

const ALL_STATUSES: Array<'all' | PromiseStatus> = ['all', 'detected', 'on_track', 'delayed', 'fulfilled', 'broken'];

const SOURCE_LABELS: Record<string, string> = {
  speech: 'Speech',
  interview: 'Interview',
  manifesto: 'Manifesto',
  social_media: 'Social Media',
  news: 'News',
};

export const PromisesScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp>();
  const leaderIdFilter = (route.params as any)?.leaderId as string | undefined;

  const [filter, setFilter] = useState<'all' | PromiseStatus>('all');
  const [groupByLeader, setGroupByLeader] = useState(false);

  const { data: promises, isLoading, refetch } = usePromises(leaderIdFilter);

  const allPromises = promises ?? [];

  const filtered = useMemo(() => {
    if (filter === 'all') return allPromises;
    return allPromises.filter(p => p.status === filter);
  }, [allPromises, filter]);

  // Group by leader for SectionList
  const sections = useMemo(() => {
    if (!groupByLeader) return [];
    const map = new Map<string, PromiseItem[]>();
    for (const p of filtered) {
      const key = p.leader_name || p.leader_id || 'Unknown';
      const existing = map.get(key) ?? [];
      existing.push(p);
      map.set(key, existing);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [filtered, groupByLeader]);

  // Summary counts
  const total = allPromises.length;
  const fulfilled = allPromises.filter(p => p.status === 'fulfilled').length;
  const broken = allPromises.filter(p => p.status === 'broken').length;
  const onTrack = allPromises.filter(p => p.status === 'on_track').length;
  const fulfillmentRate = total > 0 ? Math.round((fulfilled / total) * 100) : 0;

  const renderPromiseCard = (promise: PromiseItem) => {
    const statusConfig = STATUS_CONFIG[promise.status] ?? STATUS_CONFIG.detected;
    const isAIDetected = promise.source_type === 'speech' || promise.source_type === 'news' || promise.source_type === 'interview';
    const confidencePct = Math.round(promise.confidence * 100);

    return (
      <Card
        key={promise.id}
        style={styles.promiseCard}
        onPress={() => navigation.navigate('PromiseDetail', { promiseId: promise.id })}
      >
        <View style={styles.promiseHeader}>
          <Avatar name={promise.leader_name || 'Leader'} size={36} />
          <View style={styles.promiseLeader}>
            <Text style={styles.leaderName} numberOfLines={1}>
              {promise.leader_name || 'Unknown Leader'}
            </Text>
            <Text style={styles.sourceText}>
              {SOURCE_LABELS[promise.source_type] || promise.source_type}
            </Text>
          </View>
          <Badge
            text={`${statusConfig.icon} ${statusConfig.label}`}
            backgroundColor={statusConfig.color + '15'}
            color={statusConfig.color}
            size="sm"
          />
        </View>

        <Text style={styles.promiseTitle} numberOfLines={2}>{promise.title}</Text>
        <Text style={styles.promiseDesc} numberOfLines={3}>{promise.description}</Text>

        {/* Confidence bar */}
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Confidence</Text>
          <View style={styles.confidenceBarBg}>
            <View
              style={[
                styles.confidenceBarFill,
                {
                  width: `${confidencePct}%`,
                  backgroundColor: confidencePct >= 75
                    ? colors.success
                    : confidencePct >= 50
                    ? colors.warning
                    : colors.error,
                },
              ]}
            />
          </View>
          <Text style={styles.confidenceValue}>{confidencePct}%</Text>
        </View>

        <View style={styles.promiseFooter}>
          <View style={styles.footerBadges}>
            {isAIDetected && (
              <Badge
                text="AI Detected"
                backgroundColor={colors.info + '15'}
                color={colors.info}
                size="sm"
              />
            )}
            <Badge
              text={SOURCE_LABELS[promise.source_type] || promise.source_type}
              backgroundColor={colors.navy + '08'}
              color={colors.navy}
              size="sm"
            />
          </View>
          <Text style={styles.timeText}>
            {formatRelativeTime(promise.updated_at || promise.created_at)}
          </Text>
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (allPromises.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyIcon}>{'\uD83D\uDD0D'}</Text>
        <Text style={styles.emptyText}>No promises tracked yet</Text>
        <Text style={styles.emptySubtext}>
          Promises made by leaders will appear here as they are detected.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {groupByLeader ? (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderPromiseCard(item)}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Avatar name={section.title} size={28} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length}</Text>
            </View>
          )}
          ListHeaderComponent={
            <>
              {renderSummary(total, fulfilled, broken, onTrack, fulfillmentRate)}
              {renderControls(filter, setFilter, groupByLeader, setGroupByLeader)}
            </>
          }
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderSummary(total, fulfilled, broken, onTrack, fulfillmentRate)}
          {renderControls(filter, setFilter, groupByLeader, setGroupByLeader)}
          {filtered.map(renderPromiseCard)}
        </ScrollView>
      )}
    </View>
  );
};

// -- Helper renderers extracted for use in both list layouts --

function renderSummary(
  total: number,
  fulfilled: number,
  broken: number,
  onTrack: number,
  fulfillmentRate: number,
) {
  return (
    <Card style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Promise Tracker</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {total}
          </Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {fulfilled}
          </Text>
          <Text style={styles.summaryLabel}>Fulfilled</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.error }]}>
            {broken}
          </Text>
          <Text style={styles.summaryLabel}>Broken</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            {onTrack}
          </Text>
          <Text style={styles.summaryLabel}>On Track</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {fulfillmentRate}%
          </Text>
          <Text style={styles.summaryLabel}>Rate</Text>
        </View>
      </View>
    </Card>
  );
}

function renderControls(
  filter: 'all' | PromiseStatus,
  setFilter: (f: 'all' | PromiseStatus) => void,
  groupByLeader: boolean,
  setGroupByLeader: (v: boolean) => void,
) {
  return (
    <View>
      {/* Group toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !groupByLeader && styles.toggleBtnActive]}
          onPress={() => setGroupByLeader(false)}
        >
          <Text style={[styles.toggleText, !groupByLeader && styles.toggleTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, groupByLeader && styles.toggleBtnActive]}
          onPress={() => setGroupByLeader(true)}
        >
          <Text style={[styles.toggleText, groupByLeader && styles.toggleTextActive]}>
            By Leader
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {ALL_STATUSES.map(f => {
          const config = f === 'all' ? null : STATUS_CONFIG[f];
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                filter === f && styles.filterChipActive,
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === f && styles.filterChipTextActive,
                ]}
              >
                {f === 'all' ? 'All' : `${config?.icon} ${config?.label}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  // Summary
  summaryCard: {
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    padding: 3,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  toggleBtnActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  // Filter chips
  filterRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    backgroundColor: colors.backgroundGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  // Promise card
  promiseCard: {
    marginBottom: spacing.md,
  },
  promiseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  promiseLeader: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  leaderName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sourceText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  promiseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  promiseDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  // Confidence bar
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  confidenceLabel: {
    fontSize: 12,
    color: colors.textMuted,
    width: 72,
  },
  confidenceBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.backgroundGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 36,
    textAlign: 'right',
  },
  // Footer
  promiseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexShrink: 1,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
