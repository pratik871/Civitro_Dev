import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Avatar } from '../../components/ui/Avatar';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime } from '../../lib/utils';

interface Message {
  id: string;
  senderName: string;
  senderRole: string;
  preview: string;
  timestamp: string;
  unread: boolean;
}

const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    senderName: 'BBMP Roads Division',
    senderRole: 'Government',
    preview: 'Your reported pothole on 4th Block Junction has been assigned to our maintenance team...',
    timestamp: '2025-11-30T14:30:00Z',
    unread: true,
  },
  {
    id: 'msg-2',
    senderName: 'Ward Councillor Office',
    senderRole: 'Ward 15',
    preview: 'Thank you for your participation in the recent budget allocation poll. Results will be...',
    timestamp: '2025-11-29T10:00:00Z',
    unread: true,
  },
  {
    id: 'msg-3',
    senderName: 'Civitro Community',
    senderRole: 'System',
    preview: 'Congratulations! Your civic score has increased to 72. Keep participating to earn more...',
    timestamp: '2025-11-28T16:00:00Z',
    unread: false,
  },
  {
    id: 'msg-4',
    senderName: 'BWSSB',
    senderRole: 'Government',
    preview: 'Water supply maintenance scheduled for Dec 2-3 in your area. Please store water...',
    timestamp: '2025-11-27T09:00:00Z',
    unread: false,
  },
  {
    id: 'msg-5',
    senderName: 'Kavitha Sharma',
    senderRole: 'MLA, Bangalore South',
    preview: 'Dear residents, I am happy to announce that the metro phase 3 work in our constituency...',
    timestamp: '2025-11-25T12:00:00Z',
    unread: false,
  },
];

export const MessagesScreen: React.FC = () => {
  const renderMessage = ({ item }: { item: Message }) => (
    <TouchableOpacity style={styles.messageRow} activeOpacity={0.7}>
      <Avatar
        name={item.senderName}
        size={48}
        backgroundColor={item.unread ? colors.primary : colors.navyLight}
      />
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.senderName, item.unread && styles.unreadText]}>
            {item.senderName}
          </Text>
          <Text style={styles.timestamp}>
            {formatRelativeTime(item.timestamp)}
          </Text>
        </View>
        <Text style={styles.senderRole}>{item.senderRole}</Text>
        <Text
          style={[styles.preview, item.unread && styles.unreadText]}
          numberOfLines={2}
        >
          {item.preview}
        </Text>
      </View>
      {item.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <FlatList
        data={MOCK_MESSAGES}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F4EC}'}</Text>
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
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
    paddingVertical: spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'flex-start',
  },
  messageContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  senderRole: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  preview: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  unreadText: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
