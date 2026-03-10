import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PollCard } from '../../components/polls/PollCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { Poll } from '../../types/poll';
import type { RootStackParamList } from '../../navigation/types';

type PollsNavProp = NativeStackNavigationProp<RootStackParamList>;

const MOCK_POLLS: Poll[] = [
  {
    id: 'poll-001',
    title: 'Should the ward prioritize road repairs or park development?',
    description: 'Help us decide how to allocate the Q1 2026 ward budget.',
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
  },
  {
    id: 'poll-002',
    title: 'Preferred timing for weekly street cleaning?',
    description: '',
    category: 'Maintenance',
    ward: 'Ward 15',
    options: [
      { id: 'opt-4', text: 'Early Morning (5-7 AM)', votes: 312, percentage: 45 },
      { id: 'opt-5', text: 'Morning (7-9 AM)', votes: 189, percentage: 27 },
      { id: 'opt-6', text: 'Evening (5-7 PM)', votes: 156, percentage: 22 },
      { id: 'opt-7', text: 'Late Evening (8-10 PM)', votes: 41, percentage: 6 },
    ],
    totalVotes: 698,
    hasVoted: false,
    createdBy: 'admin-001',
    createdByName: 'BBMP',
    expiresAt: '2025-12-10T23:59:00Z',
    createdAt: '2025-11-25T08:00:00Z',
    isActive: true,
  },
  {
    id: 'poll-003',
    title: 'Rate the recent pothole repair quality in your area',
    description: 'The BBMP completed road repair work last week. How would you rate the quality?',
    category: 'Feedback',
    options: [
      { id: 'opt-8', text: 'Excellent', votes: 45, percentage: 12 },
      { id: 'opt-9', text: 'Good', votes: 120, percentage: 32 },
      { id: 'opt-10', text: 'Average', votes: 134, percentage: 36 },
      { id: 'opt-11', text: 'Poor', votes: 75, percentage: 20 },
    ],
    totalVotes: 374,
    hasVoted: true,
    selectedOptionId: 'opt-10',
    createdBy: 'admin-002',
    createdByName: 'Civitro Community',
    expiresAt: '2025-12-01T23:59:00Z',
    createdAt: '2025-11-20T12:00:00Z',
    isActive: false,
  },
];

export const PollsScreen: React.FC = () => {
  const navigation = useNavigation<PollsNavProp>();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
  }, []);

  const renderPoll = ({ item }: { item: Poll }) => (
    <PollCard
      poll={item}
      onPress={() => navigation.navigate('PollDetail', { pollId: item.id })}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <FlatList
        data={MOCK_POLLS}
        renderItem={renderPoll}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.subtitle}>
            Participate in community decisions
          </Text>
        }
      />
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
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
});
