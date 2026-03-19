import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatDate } from '../../lib/utils';

interface PromiseItem {
  id: string;
  leaderName: string;
  leaderRole: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'fulfilled' | 'broken';
  progress: number;
  deadline: string;
  category: string;
}

const STATUS_CONFIG = {
  pending: { color: colors.textMuted, label: 'Pending', icon: '\u23F3' },
  in_progress: { color: colors.warning, label: 'In Progress', icon: '\u{1F3D7}' },
  fulfilled: { color: colors.success, label: 'Fulfilled', icon: '\u2705' },
  broken: { color: colors.error, label: 'Broken', icon: '\u274C' },
};

export const PromisesScreen: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');
  const { data: promises, isLoading } = useQuery<PromiseItem[]>({
    queryKey: ['promises'],
    queryFn: () => api.get('/api/v1/issues/promises'),
    staleTime: 60000,
  });

  const filters = ['all', 'in_progress', 'fulfilled', 'pending', 'broken'];

  const allPromises = promises ?? [];

  const filtered = filter === 'all'
    ? allPromises
    : allPromises.filter(p => p.status === filter);

  // Summary
  const total = allPromises.length;
  const fulfilled = allPromises.filter(p => p.status === 'fulfilled').length;
  const broken = allPromises.filter(p => p.status === 'broken').length;

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
        <Text style={styles.emptyText}>No promises tracked yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
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
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {Math.round((fulfilled / total) * 100)}%
              </Text>
              <Text style={styles.summaryLabel}>Rate</Text>
            </View>
          </View>
        </Card>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map(f => {
            const config = f === 'all' ? null : STATUS_CONFIG[f as keyof typeof STATUS_CONFIG];
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
                  {f === 'all' ? 'All' : config?.label || f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Promise List */}
        {filtered.map(promise => {
          const statusConfig = STATUS_CONFIG[promise.status];
          return (
            <Card key={promise.id} style={styles.promiseCard}>
              <View style={styles.promiseHeader}>
                <Avatar name={promise.leaderName} size={36} />
                <View style={styles.promiseLeader}>
                  <Text style={styles.leaderName}>{promise.leaderName}</Text>
                  <Text style={styles.leaderRole}>{promise.leaderRole}</Text>
                </View>
                <Badge
                  text={`${statusConfig.icon} ${statusConfig.label}`}
                  backgroundColor={statusConfig.color + '15'}
                  color={statusConfig.color}
                  size="sm"
                />
              </View>

              <Text style={styles.promiseTitle}>{promise.title}</Text>
              <Text style={styles.promiseDesc}>{promise.description}</Text>

              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${promise.progress}%`,
                        backgroundColor: statusConfig.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: statusConfig.color }]}>
                  {promise.progress}%
                </Text>
              </View>

              <View style={styles.promiseFooter}>
                <Badge
                  text={promise.category}
                  backgroundColor={colors.navy + '08'}
                  color={colors.navy}
                  size="sm"
                />
                <Text style={styles.deadlineText}>
                  Deadline: {formatDate(promise.deadline)}
                </Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  summaryCard: {
    marginBottom: spacing.lg,
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
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
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
  leaderRole: {
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  promiseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  deadlineText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
