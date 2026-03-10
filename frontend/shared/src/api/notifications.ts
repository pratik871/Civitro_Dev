// ---------------------------------------------------------------------------
// Notifications API functions — notifications service (port 8017)
// ---------------------------------------------------------------------------

import type { ApiClient } from './index';
import type {
  Notification,
  NotificationPrefs,
  UnreadCount,
} from '../types';
import { NOTIFICATIONS } from './endpoints';

/** Paginated notification list response. */
interface NotificationListResponse {
  notifications: Notification[];
  nextCursor?: string;
  total: number;
}

/** Create notification API functions bound to the given client. */
export function createNotificationsApi(client: ApiClient) {
  return {
    /** Get a paginated list of notifications for a user. */
    list(userId: string, params?: {
      cursor?: string;
      limit?: number;
    }): Promise<NotificationListResponse> {
      return client.get<NotificationListResponse>(NOTIFICATIONS.LIST(userId), {
        cursor: params?.cursor,
        limit: params?.limit,
      });
    },

    /** Mark a single notification as read. */
    markRead(notificationId: string): Promise<{ status: string }> {
      return client.put<{ status: string }>(NOTIFICATIONS.MARK_READ(notificationId));
    },

    /** Mark all notifications as read for a user. */
    markAllRead(userId: string): Promise<{ status: string }> {
      return client.put<{ status: string }>(NOTIFICATIONS.MARK_ALL_READ(userId));
    },

    /** Get a user's notification preferences. */
    getPrefs(userId: string): Promise<NotificationPrefs> {
      return client.get<NotificationPrefs>(NOTIFICATIONS.GET_PREFS(userId));
    },

    /** Update a user's notification preferences. */
    updatePrefs(userId: string, prefs: Partial<NotificationPrefs>): Promise<{ status: string }> {
      return client.put<{ status: string }>(NOTIFICATIONS.UPDATE_PREFS(userId), prefs);
    },

    /** Get the count of unread notifications for a user. */
    getUnreadCount(userId: string): Promise<UnreadCount> {
      return client.get<UnreadCount>(NOTIFICATIONS.UNREAD_COUNT(userId));
    },
  };
}
