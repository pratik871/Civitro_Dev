"use client";

import { useState } from "react";
import { Shield, Check, X, Eye, Flag, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { cn, formatRelativeTime } from "@/lib/utils";

type ModerationItemType = "issue" | "voice" | "comment" | "review";
type ModerationStatus = "pending" | "approved" | "rejected";

interface ModerationItem {
  id: string;
  type: ModerationItemType;
  content: string;
  author: string;
  reason: string;
  flagCount: number;
  status: ModerationStatus;
  createdAt: string;
}

const MOCK_QUEUE: ModerationItem[] = [
  {
    id: "mod-1",
    type: "voice",
    content: "This is a completely biased review targeting the councillor unfairly. Contains personal attacks and unverified claims about corruption.",
    author: "Anonymous User",
    reason: "Personal attack / Unverified claims",
    flagCount: 8,
    status: "pending",
    createdAt: "2026-03-10T07:00:00Z",
  },
  {
    id: "mod-2",
    type: "comment",
    content: "Buy cheap products at www.spamsite.com! Best deals ever!!!",
    author: "newuser_2342",
    reason: "Spam",
    flagCount: 15,
    status: "pending",
    createdAt: "2026-03-10T06:30:00Z",
  },
  {
    id: "mod-3",
    type: "issue",
    content: "Testing testing 123 this is a fake issue report to test the system.",
    author: "testaccount",
    reason: "Fake / Test content",
    flagCount: 3,
    status: "pending",
    createdAt: "2026-03-10T05:00:00Z",
  },
  {
    id: "mod-4",
    type: "review",
    content: "The MLA is doing a fantastic job! 5 stars! (Submitted from the MLA's office IP address)",
    author: "citizen_real_123",
    reason: "Suspected astroturfing",
    flagCount: 12,
    status: "pending",
    createdAt: "2026-03-09T22:00:00Z",
  },
  {
    id: "mod-5",
    type: "voice",
    content: "We need to protest against the new road tax. Everyone gather at the town hall tomorrow at 10 AM!",
    author: "Vikram Singh",
    reason: "Potential call for unauthorized gathering",
    flagCount: 5,
    status: "pending",
    createdAt: "2026-03-09T20:00:00Z",
  },
];

const typeVariants: Record<ModerationItemType, "saffron" | "info" | "warning" | "success"> = {
  issue: "warning",
  voice: "saffron",
  comment: "info",
  review: "success",
};

export default function ModerationPage() {
  const [queue, setQueue] = useState(MOCK_QUEUE);
  const [filter, setFilter] = useState<ModerationStatus | "all">("pending");

  const filtered = queue.filter((item) =>
    filter === "all" ? true : item.status === filter,
  );

  const handleAction = (id: string, action: ModerationStatus) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action } : item)),
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Moderation Queue</h1>
        <p className="page-subtitle">
          Review and moderate flagged content ({queue.filter((i) => i.status === "pending").length} pending)
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {(["all", "pending", "approved", "rejected"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              "px-4 py-2 rounded-btn text-sm font-medium transition-colors capitalize",
              filter === status
                ? "bg-saffron text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-saffron-200",
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Queue */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <Card key={item.id} className={cn(
            item.status !== "pending" && "opacity-60",
          )}>
            <div className="flex items-start gap-4">
              <Avatar name={item.author} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={typeVariants[item.type]}>{item.type}</Badge>
                  <div className="flex items-center gap-1 text-xs text-error">
                    <Flag className="w-3 h-3" />
                    <span>{item.flagCount} flags</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-2">{item.content}</p>

                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  <span className="text-xs text-gray-500">
                    Flagged for: <span className="font-medium">{item.reason}</span>
                  </span>
                </div>

                <p className="text-xs text-gray-400">
                  Posted by: {item.author}
                </p>
              </div>

              {item.status === "pending" ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction(item.id, "approved")}
                    className="text-success hover:bg-emerald-50"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction(item.id, "rejected")}
                    className="text-error hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Badge variant={item.status === "approved" ? "success" : "error"}>
                  {item.status}
                </Badge>
              )}
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Queue is clear</h3>
            <p className="text-sm text-gray-500">No items matching this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
