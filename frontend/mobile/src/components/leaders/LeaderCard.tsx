import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { StarRating } from '../ui/StarRating';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { GOVERNANCE_LEVEL_LABELS } from '../../types/leader';
import type { Leader } from '../../types/leader';

interface LeaderCardProps {
  leader: Leader;
  onPress: () => void;
}

export const LeaderCard: React.FC<LeaderCardProps> = ({ leader, onPress }) => {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Avatar name={leader.name} imageUrl={leader.avatarUrl} size={56} />
        <View style={styles.info}>
          <Text style={styles.name}>{leader.name}</Text>
          <Text style={styles.role}>
            {GOVERNANCE_LEVEL_LABELS[leader.governanceLevel]}
          </Text>
          <Text style={styles.party}>
            {leader.party} ({leader.partyAbbr})
          </Text>
        </View>
        <View style={styles.metrics}>
          <View style={styles.chiContainer}>
            <Text style={styles.chiValue}>{leader.chiScore}</Text>
            <Text style={styles.chiLabel}>CHI</Text>
          </View>
        </View>
      </View>

      <View style={styles.ratingRow}>
        <StarRating rating={leader.overallRating} size={14} />
        <Text style={styles.ratingCount}>
          ({leader.totalRatings} ratings)
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {Math.round(leader.responseRate * 100)}%
          </Text>
          <Text style={styles.statLabel}>Response Rate</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {leader.promisesFulfilled}/{leader.promisesTotal}
          </Text>
          <Text style={styles.statLabel}>Promises Kept</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {leader.issuesResolved}/{leader.issuesTotal}
          </Text>
          <Text style={styles.statLabel}>Issues Resolved</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  role: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 1,
  },
  party: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  metrics: {
    alignItems: 'center',
  },
  chiContainer: {
    backgroundColor: colors.navy + '10',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  chiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
  },
  chiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  ratingCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.sm,
  },
});
