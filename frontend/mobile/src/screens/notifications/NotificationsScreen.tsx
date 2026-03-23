import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNotifications, useMarkAllRead } from '../../hooks/useNotifications';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import type { RootStackParamList } from '../../navigation/types';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime } from '../../lib/utils';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: string | Record<string, any> | null;
  read: boolean;
  created_at: string;
}

const NOTIFICATION_ICONS: Record<string, { emoji: string; bg: string }> = {
  issue_update:   { emoji: '\u{1F6E0}', bg: '#FFF3ED' },
  resolution:     { emoji: '\u2705',     bg: '#ECFDF5' },
  trending:       { emoji: '\u{1F525}', bg: '#FEF3C7' },
  rating_prompt:  { emoji: '\u2B50',     bg: '#FFFBEB' },
  achievement:    { emoji: '\u{1F3C6}', bg: '#F5F3FF' },
  promise_update: { emoji: '\u{1F4CB}', bg: '#EFF6FF' },
  system:         { emoji: '\u{1F514}', bg: '#F3F4F6' },
};

type NotifNavProp = NativeStackNavigationProp<RootStackParamList>;

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NotifNavProp>();
  const userId = useAuthStore(s => s.user?.id);
  const { data: notifications, isLoading, refetch } = useNotifications();
  const markAllRead = useMarkAllRead();

  const unreadCount = (notifications ?? []).filter(n => !n.read).length;

  const handleNotificationPress = (item: NotificationItem) => {
    // Mark as read
    if (!item.read) {
      api.put(`/api/v1/notifications/${item.id}/read`).catch(() => {});
      refetch();
    }

    // Navigate based on type and data
    try {
      const data = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
      switch (item.type) {
        case 'issue_update':
        case 'resolution':
          if (data.issue_id) navigation.navigate('IssueDetail', { issueId: data.issue_id });
          else navigation.navigate('IssuesList' as any);
          break;
        case 'trending':
          if (data.action_id) navigation.navigate('ActionDetail' as any, { actionId: data.action_id });
          else navigation.navigate('ActionsList' as any);
          break;
        case 'rating_prompt':
          // Navigate to leaders
          navigation.navigate('Main' as any, { screen: 'Leaders' });
          break;
        case 'promise_update':
          navigation.navigate('Promises' as any);
          break;
        case 'achievement':
          // Navigate to profile to see badges
          navigation.navigate('Profile' as any);
          break;
        default:
          break;
      }
    } catch {
      // Data parse failed — no navigation
    }
  };

  const deleteNotification = (id: string) => {
    api.delete(`/api/v1/notifications/${id}`).then(() => refetch()).catch(() => {});
  };

  const renderRightActions = (id: string) => (
    <TouchableOpacity style={styles.swipeDelete} onPress={() => deleteNotification(id)} activeOpacity={0.7}>
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderNotification = ({ item }: { item: NotificationItem }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)} overshootRight={false}>
      <TouchableOpacity
        style={[styles.notifRow, !item.read && styles.notifUnread]}
        activeOpacity={0.7}
        onPress={() => handleNotificationPress(item)}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: (NOTIFICATION_ICONS[item.type]?.bg || '#F3F4F6') },
          ]}
        >
          <Text style={styles.icon}>
            {NOTIFICATION_ICONS[item.type]?.emoji || '\u{1F514}'}
          </Text>
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, !item.read && styles.unreadText]}>
              {item.title}
            </Text>
            <Text style={styles.notifTime}>
              {formatRelativeTime(item.created_at)}
            </Text>
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {(notifications ?? []).length > 0 && (
        <View style={styles.unreadBar}>
          <Text style={styles.unreadBarText}>
            {unreadCount > 0 ? `${unreadCount} unread` : `${(notifications ?? []).length} notifications`}
          </Text>
          <View style={styles.unreadActions}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={() => markAllRead.mutate()}>
                <Text style={styles.markAllRead}>Mark all read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => {
              api.delete(`/api/v1/notifications/users/${userId}/clear`).then(() => refetch()).catch(() => {});
            }}>
              <Text style={[styles.markAllRead, { color: '#EF4444' }]}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={notifications ?? []}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F514}'}</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  unreadActions: {
    flexDirection: 'row',
    gap: 16,
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
  swipeDelete: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
