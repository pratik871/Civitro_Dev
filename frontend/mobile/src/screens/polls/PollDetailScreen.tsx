import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { PollCard } from '../../components/polls/PollCard';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatDate, formatNumber } from '../../lib/utils';
import type { RootStackParamList } from '../../navigation/types';
import type { Poll } from '../../types/poll';

type PollDetailRouteProp = RouteProp<RootStackParamList, 'PollDetail'>;

const MOCK_POLL: Poll = {
  id: 'poll-001',
  title: 'Should the ward prioritize road repairs or park development?',
  description: 'Help us decide how to allocate the Q1 2026 ward budget. Your vote directly influences the spending priorities.',
  category: 'Budget',
  ward: 'Ward 15',
  options: [
    { id: 'opt-1', text: 'Road Repairs', votes: 234, percentage: 52 },
    { id: 'opt-2', text: 'Park Development', votes: 156, percentage: 35 },
    { id: 'opt-3', text: 'Both Equally', votes: 58, percentage: 13 },
  ],
  totalVotes: 448,
  hasVoted: true,
  selectedOptionId: 'opt-1',
  createdBy: 'leader-001',
  createdByName: 'Ward Councillor Office',
  expiresAt: '2025-12-15T23:59:00Z',
  createdAt: '2025-11-28T10:00:00Z',
  isActive: true,
};

export const PollDetailScreen: React.FC = () => {
  const route = useRoute<PollDetailRouteProp>();
  const [poll, setPoll] = useState(MOCK_POLL);

  const handleVote = (optionId: string) => {
    Alert.alert('Vote Cast', 'Your vote has been recorded!');
    setPoll(prev => ({
      ...prev,
      hasVoted: true,
      selectedOptionId: optionId,
    }));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <PollCard poll={poll} onVote={handleVote} />

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>Poll Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created By</Text>
          <Text style={styles.infoValue}>{poll.createdByName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created On</Text>
          <Text style={styles.infoValue}>{formatDate(poll.createdAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Expires On</Text>
          <Text style={styles.infoValue}>{formatDate(poll.expiresAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Votes</Text>
          <Text style={styles.infoValue}>{formatNumber(poll.totalVotes)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ward</Text>
          <Text style={styles.infoValue}>{poll.ward || 'All wards'}</Text>
        </View>
      </Card>

      <Card style={styles.disclaimerCard}>
        <Text style={styles.disclaimerIcon}>{'\u{1F512}'}</Text>
        <Text style={styles.disclaimerText}>
          All votes are anonymous and cannot be traced back to individual users.
          Results are verified on-chain for transparency.
        </Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  infoCard: {
    marginTop: spacing.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  disclaimerCard: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.info + '08',
  },
  disclaimerIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
    lineHeight: 18,
  },
});
