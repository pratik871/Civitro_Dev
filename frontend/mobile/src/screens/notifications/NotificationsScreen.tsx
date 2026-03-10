import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime } from '../../lib/utils';

interface Notification {
  id: string;
  type: 'issue_update' | 'poll' | 'achievement' | 'system' | 'leader';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

const NOTIFICATION_ICONS: Record<string, string> = {
  issue_update: '\u{1F6E0}',
  poll: '\u{1F5F3}',
  achievement: '\u{1F3C6}',
  system: '\u{1F514}',
  leader: '\u{1F464}',
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    type: 'issue_update',
    title: 'Issue Update',
    body: 'Your pothole report on 4th Block Junction has been assigned to a maintenance crew.',
    timestamp: '2025-11-30T14:30:00Z',
    read: false,
  },
  {
    id: 'notif-2',
    type: 'poll',
    title: 'New Poll Available',
    body: 'Vote on preferred timing for weekly street cleaning in your ward.',
    timestamp: '2025-11-30T10:00:00Z',
    read: false,
  },
  {
    id: 'notif-3',
    type: 'achievement',
    title: 'Badge Earned!',
    body: 'You earned the "Active Reporter" badge for reporting 10+ issues. Civic score +5.',
    timestamp: '2025-11-29T18:00:00Z',
    read: false,
  },
  {
    id: 'notif-4',
    type: 'issue_update',
    title: 'Issue Resolved',
    body: 'The broken streetlight on 80ft Road has been repaired. Please verify the resolution.',
    timestamp: '2025-11-28T16:30:00Z',
    read: true,
  },
  {
    id: 'notif-5',
    type: 'leader',
    title: 'Leader Response',
    body: 'Ward Councillor Raghavendra Rao responded to the community petition on park renovation.',
    timestamp: '2025-11-27T12:00:00Z',
    read: true,
  },
  {
    id: 'notif-6',
    type: 'system',
    title: 'Water Supply Alert',
    body: 'Scheduled maintenance: Water supply will be disrupted on Dec 2-3 in Ward 15.',
    timestamp: '2025-11-26T09:00:00Z',
    read: true,
  },
];

export const NotificationsScreen: React.FC = () => {
  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notifRow, !item.read && styles.notifUnread]}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          !item.read && styles.iconContainerUnread,
        ]}
      >
        <Text style={styles.icon}>
          {NOTIFICATION_ICONS[item.type] || '\u{1F514}'}
        </Text>
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifHeader}>
          <Text style={[styles.notifTitle, !item.read && styles.unreadText]}>
            {item.title}
          </Text>
          <Text style={styles.notifTime}>
            {formatRelativeTime(item.timestamp)}
          </Text>
        </View>
        <Text style={styles.notifBody} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {unreadCount > 0 && (
        <View style={styles.unreadBar}>
          <Text style={styles.unreadBarText}>
            {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={MOCK_NOTIFICATIONS}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  unreadBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary + '08',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  unreadBarText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  markAllRead: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  notifRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  notifUnread: {
    backgroundColor: colors.primary + '04',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconContainerUnread: {
    backgroundColor: colors.primary + '12',
  },
  icon: {
    fontSize: 18,
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  unreadText: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  notifTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  notifBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 72,
  },
});
