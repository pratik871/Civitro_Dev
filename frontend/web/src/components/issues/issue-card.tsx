import Link from "next/link";
import { MapPin, ThumbsUp, MessageCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatRelativeTime, getStatusColor, getPriorityColor } from "@/lib/utils";
import { ISSUE_CATEGORY_LABELS, LEDGER_STEP_LABELS } from "@/types/issue";
import type { Issue } from "@/types";

interface IssueCardProps {
  issue: Issue;
}

export function IssueCard({ issue }: IssueCardProps) {
  return (
    <Link href={`/dashboard/issues/${issue.id}`}>
      <Card hoverable className="group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Category + Status + Priority */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="saffron">{ISSUE_CATEGORY_LABELS[issue.category]}</Badge>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                {LEDGER_STEP_LABELS[issue.status]}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                {issue.priority}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-saffron transition-colors line-clamp-2">
              {issue.title}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{issue.location.address}</span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{issue.upvotes}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{issue.commentCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatRelativeTime(issue.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Reporter avatar */}
          <Avatar
            name={issue.reportedBy.name}
            src={issue.reportedBy.avatar}
            size="sm"
          />
        </div>
      </Card>
    </Link>
  );
}
