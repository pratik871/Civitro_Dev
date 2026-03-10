"use client";

import { useState } from "react";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  ThumbsUp,
  Vote,
  Shield,
  Megaphone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Notification } from "@/types";

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "issue_update",
    title: "Issue Updated",
    message: "Your issue 'Pothole on MG Road' has been moved to 'Work Started'. A repair crew has been dispatched.",
    read: false,
    actionUrl: "/dashboard/issues/ISS-001",
    createdAt: "2026-03-10T08:00:00Z",
  },
  {
    id: "n2",
    type: "leader_response",
    title: "Leader Response",
    message: "Councillor Rajesh Kumar Singh responded to your message about the water supply issue.",
    read: false,
    actionUrl: "/dashboard/messages",
    createdAt: "2026-03-09T16:30:00Z",
  },
  {
    id: "n3",
    type: "upvote",
    title: "New Upvotes",
    message: "Your voice post 'Rainwater harvesting mandate' received 50 new upvotes!",
    read: false,
    createdAt: "2026-03-09T14:00:00Z",
  },
  {
    id: "n4",
    type: "poll_result",
    title: "Poll Results",
    message: "The poll 'Should street vendors be allowed on weekends?' has closed. View results now.",
    read: true,
    actionUrl: "/dashboard/polls/p3",
    createdAt: "2026-03-08T10:00:00Z",
  },
  {
    id: "n5",
    type: "issue_resolved",
    title: "Issue Resolved",
    message: "The drainage overflow issue in HSR Layout has been marked as completed. Please verify!",
    read: true,
    actionUrl: "/dashboard/issues/ISS-005",
    createdAt: "2026-03-07T17:00:00Z",
  },
  {
    id: "n6",
    type: "promise_update",
    title: "Promise Update",
    message: "Councillor Amit Patel's promise about drainage system upgrade has been marked as 'Broken'.",
    read: true,
    createdAt: "2026-03-06T09:00:00Z",
  },
  {
    id: "n7",
    type: "comment_reply",
    title: "Comment Reply",
    message: "Rahul Verma replied to your comment on the garbage collection issue.",
    read: true,
    actionUrl: "/dashboard/issues/ISS-002",
    createdAt: "2026-03-05T12:00:00Z",
  },
  {
    id: "n8",
    type: "system",
    title: "System Update",
    message: "Civitro has been updated to version 2.1. Check out the new CHI dashboard features!",
    read: true,
    createdAt: "2026-03-04T08:00:00Z",
  },
];

const iconMap: Record<string, typeof Bell> = {
  issue_update: AlertTriangle,
  issue_assigned: AlertTriangle,
  issue_resolved: CheckCircle,
  comment_reply: MessageCircle,
  upvote: ThumbsUp,
  poll_result: Vote,
  leader_response: Megaphone,
  promise_update: Shield,
  system: Bell,
  moderation: Shield,
};

const iconColorMap: Record<string, string> = {
  issue_update: "text-warning bg-amber-50",
  issue_assigned: "text-info bg-blue-50",
  issue_resolved: "text-success bg-emerald-50",
  comment_reply: "text-info bg-blue-50",
  upvote: "text-saffron bg-saffron-50",
  poll_result: "text-purple-500 bg-purple-50",
  leader_response: "text-saffron bg-saffron-50",
  promise_update: "text-error bg-red-50",
  system: "text-gray-500 bg-gray-50",
  moderation: "text-error bg-red-50",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => {
          const Icon = iconMap[notification.type] ?? Bell;
          const colorClasses = iconColorMap[notification.type] ?? "text-gray-500 bg-gray-50";

          return (
            <Card
              key={notification.id}
              hoverable
              className={cn(
                "!p-4 transition-colors",
                !notification.read && "bg-saffron-50/30 border-l-2 border-l-saffron",
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", colorClasses)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-saffron flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
                {notification.actionUrl && (
                  <Badge variant="saffron" className="flex-shrink-0 cursor-pointer">
                    View
                  </Badge>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
