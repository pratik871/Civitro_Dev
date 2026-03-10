// ---------------------------------------------------------------------------
// Notification types — mirrors backend notifications model
// ---------------------------------------------------------------------------

/** Notification type classification. */
export type NotificationType =
  | 'issue_update'
  | 'resolution'
  | 'rating_prompt'
  | 'trending'
  | 'promise_update'
  | 'achievement'
  | 'system';

/** Maximum push notifications per user per day. */
export const MAX_PUSH_PER_DAY = 10;

/** A single notification for a user. */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Arbitrary payload data (e.g. issueId, voiceId). */
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

/** A user's notification delivery preferences. */
export interface NotificationPrefs {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  /** Start of quiet hours in HH:MM format. */
  quietHoursStart: string;
  /** End of quiet hours in HH:MM format. */
  quietHoursEnd: string;
}

/** Unread notification count for a user. */
export interface UnreadCount {
  userId: string;
  count: number;
}
