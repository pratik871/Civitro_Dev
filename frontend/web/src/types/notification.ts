export type NotificationType =
  | "issue_update"
  | "issue_assigned"
  | "issue_resolved"
  | "comment_reply"
  | "upvote"
  | "poll_result"
  | "leader_response"
  | "promise_update"
  | "system"
  | "moderation";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, string>;
  createdAt: string;
}
