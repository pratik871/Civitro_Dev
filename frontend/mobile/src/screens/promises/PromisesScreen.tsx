import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
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

const MOCK_PROMISES: PromiseItem[] = [
  {
    id: 'p1',
    leaderName: 'Raghavendra Rao',
    leaderRole: 'Ward Councillor',
    title: 'Complete road repairs in all blocks',
    description: 'Repair all potholes and damaged roads in Ward 15 within 6 months.',
    status: 'in_progress',
    progress: 65,
    deadline: '2026-03-31',
    category: 'Infrastructure',
  },
  {
    id: 'p2',
    leaderName: 'Raghavendra Rao',
    leaderRole: 'Ward Councillor',
    title: 'New public park in 3rd Block',
    description: 'Build a new public park with children\'s play area and walking track.',
    status: 'in_progress',
    progress: 90,
    deadline: '2026-01-15',
    category: 'Environment',
  },
  {
    id: 'p3',
    leaderName: 'Kavitha Sharma',
    leaderRole: 'MLA',
    title: 'Improve public transport connectivity',
    description: 'Add 5 new bus routes connecting Koramangala to outer ring road areas.',
    status: 'pending',
    progress: 10,
    deadline: '2026-06-30',
    category: 'Transport',
  },
  {
    id: 'p4',
    leaderName: 'Raghavendra Rao',
    leaderRole: 'Ward Councillor',
    title: 'Daily garbage collection',
    description: 'Ensure daily garbage collection in all residential areas.',
    status: 'fulfilled',
    progress: 100,
    deadline: '2025-09-30',
    category: 'Cleanliness',
  },
  {
    id: 'p5',
    leaderName: 'Kavitha Sharma',
    leaderRole: 'MLA',
    title: '24/7 water supply for all wards',
    description: 'Ensure uninterrupted water supply to all wards in the constituency.',
    status: 'broken',
    progress: 25,
    deadline: '2025-12-31',
    category: 'Water',
  },
];

const STATUS_CONFIG = {
  pending: { color: colors.textMuted, label: 'Pending', icon: '\u23F3' },
  in_progress: { color: colors.warning, label: 'In Progress', icon: '\u{1F3D7}' },
  fulfilled: { color: colors.success, label: 'Fulfilled', icon: '\u2705' },
  broken: { color: colors.error, label: 'Broken', icon: '\u274C' },
};

export const PromisesScreen: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');

  const filters = ['all', 'in_progress', 'fulfilled', 'pending', 'broken'];

  const filtered = filter === 'all'
    ? MOCK_PROMISES
    : MOCK_PROMISES.filter(p => p.status === filter);

  // Summary
  const total = MOCK_PROMISES.length;
  const fulfilled = MOCK_PROMISES.filter(p => p.status === 'fulfilled').length;
  const broken = MOCK_PROMISES.filter(p => p.status === 'broken').length;

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
