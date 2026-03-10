"use client";

import Link from "next/link";
import { Users, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber, cn } from "@/lib/utils";
import type { Poll } from "@/types";

interface PollCardProps {
  poll: Poll;
}

const statusVariant: Record<string, "default" | "success" | "error" | "warning" | "info" | "saffron"> = {
  draft: "default",
  active: "success",
  closed: "default",
  results_published: "info",
};

export function PollCard({ poll }: PollCardProps) {
  const maxVotes = Math.max(...poll.options.map((o) => o.votes), 1);

  return (
    <Card className="group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={statusVariant[poll.status] ?? "default"}>
              {poll.status.replace("_", " ")}
            </Badge>
            <Badge>{poll.scope}</Badge>
          </div>
          <Link href={`/dashboard/polls/${poll.id}`}>
            <h3 className="font-semibold text-gray-900 group-hover:text-saffron transition-colors">
              {poll.title}
            </h3>
          </Link>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{poll.description}</p>

      {/* Options / Results */}
      <div className="space-y-2 mb-4">
        {poll.options.map((option) => (
          <div key={option.id}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700">{option.text}</span>
              <span className="font-medium text-gray-900">{option.percentage}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  option.votes === maxVotes ? "bg-saffron" : "bg-saffron-200",
                )}
                style={{ width: `${option.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{formatNumber(poll.totalVotes)} votes</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Ends {formatDate(poll.endDate)}</span>
          </div>
        </div>
        {poll.status === "active" && !poll.hasVoted && (
          <Button size="sm" variant="outline">Vote</Button>
        )}
      </div>
    </Card>
  );
}
