"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  ThumbsUp,
  MessageCircle,
  Share2,
  Flag,
  Calendar,
  User,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LedgerTimeline } from "@/components/issues/ledger-timeline";
import { useIssue } from "@/hooks/use-issues";
import {
  formatDate,
  formatRelativeTime,
  getStatusColor,
  getPriorityColor,
} from "@/lib/utils";
import { ISSUE_CATEGORY_LABELS, LEDGER_STEP_LABELS } from "@/types/issue";

export default function IssueDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: issue, isLoading } = useIssue(id);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-card p-6 h-48" />
            <div className="bg-white rounded-card p-6 h-64" />
          </div>
          <div className="bg-white rounded-card p-6 h-80" />
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Issue not found</h2>
        <p className="text-gray-500 mb-4">
          The issue you are looking for does not exist or has been removed.
        </p>
        <Link href="/dashboard/issues">
          <Button variant="outline">Back to Issues</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back nav */}
      <Link
        href="/dashboard/issues"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-saffron mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Issues
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="saffron">{ISSUE_CATEGORY_LABELS[issue.category]}</Badge>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}
          >
            {LEDGER_STEP_LABELS[issue.status]}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}
          >
            {issue.priority} priority
          </span>
          <span className="text-xs text-gray-400 font-mono">{issue.id}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{issue.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <p className="text-gray-700 leading-relaxed">{issue.description}</p>

            <div className="flex items-center gap-1 mt-4 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              <span>{issue.location.address}</span>
              {issue.location.ward && (
                <Badge className="ml-2">{issue.location.ward}</Badge>
              )}
            </div>
          </Card>

          {/* Transparency Ledger */}
          <Card>
            <CardHeader>
              <CardTitle>Transparency Ledger</CardTitle>
              <span className="text-xs text-gray-400">
                Immutable progress trail
              </span>
            </CardHeader>
            <LedgerTimeline
              entries={issue.ledger}
              currentStatus={issue.status}
            />
          </Card>

          {/* Actions */}
          <Card>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">
                <ThumbsUp className="w-4 h-4" />
                Upvote ({issue.upvotes})
              </Button>
              <Button variant="ghost">
                <MessageCircle className="w-4 h-4" />
                Comment ({issue.commentCount})
              </Button>
              <Button variant="ghost">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button variant="ghost">
                <Flag className="w-4 h-4" />
                Report
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reported by */}
          <Card>
            <CardHeader>
              <CardTitle>Reported By</CardTitle>
            </CardHeader>
            <div className="flex items-center gap-3">
              <Avatar
                name={issue.reportedBy.name}
                src={issue.reportedBy.avatar}
                size="lg"
              />
              <div>
                <p className="font-medium text-gray-900">{issue.reportedBy.name}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <User className="w-3 h-3" />
                  <span>Citizen</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Assigned to */}
          {issue.assignedTo && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned To</CardTitle>
              </CardHeader>
              <div className="flex items-center gap-3">
                <Avatar name={issue.assignedTo.name} size="lg" />
                <div>
                  <p className="font-medium text-gray-900">{issue.assignedTo.name}</p>
                  {issue.assignedTo.department && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Building2 className="w-3 h-3" />
                      <span>{issue.assignedTo.department}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Created</span>
                <div className="flex items-center gap-1 text-gray-700">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(issue.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-700">{formatRelativeTime(issue.updatedAt)}</span>
              </div>
              {issue.resolvedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Resolved</span>
                  <span className="text-gray-700">{formatDate(issue.resolvedAt)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Location</span>
                <span className="text-gray-700">{issue.location.pincode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Upvotes</span>
                <span className="text-gray-700 font-medium">{issue.upvotes}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
