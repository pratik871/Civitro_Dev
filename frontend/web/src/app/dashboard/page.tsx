"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Users,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  ThumbsUp,
  MessageCircle,
  Clock,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHIGauge } from "@/components/charts/chi-gauge";
import { TrendSparkline } from "@/components/charts/trend-sparkline";
import { IssueCard } from "@/components/issues/issue-card";
import { useIssues } from "@/hooks/use-issues";

const recentActivity = [
  {
    id: 1,
    text: "Pothole on MG Road moved to 'Work Started'",
    time: "2 hours ago",
    type: "issue_update" as const,
  },
  {
    id: 2,
    text: "Councillor Sharma responded to garbage issue",
    time: "4 hours ago",
    type: "leader_response" as const,
  },
  {
    id: 3,
    text: "New poll: Should park fees be reduced?",
    time: "6 hours ago",
    type: "poll_result" as const,
  },
  {
    id: 4,
    text: "Water supply issue in JP Nagar resolved",
    time: "1 day ago",
    type: "issue_resolved" as const,
  },
  {
    id: 5,
    text: "Your voice post got 50 upvotes",
    time: "1 day ago",
    type: "upvote" as const,
  },
];

export default function DashboardPage() {
  const { data: issues, isLoading } = useIssues();
  const recentIssues = issues?.slice(0, 3) ?? [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Overview of civic activity in your area
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Active Issues"
          value="1,247"
          change="+12% this week"
          changeType="negative"
          icon={AlertTriangle}
          iconColor="text-warning"
        />
        <StatsCard
          title="Issues Resolved"
          value="892"
          change="+8% this month"
          changeType="positive"
          icon={CheckCircle}
          iconColor="text-success"
        />
        <StatsCard
          title="Active Citizens"
          value="45,230"
          change="+2.4K new"
          changeType="positive"
          icon={Users}
          iconColor="text-info"
        />
        <StatsCard
          title="Avg Resolution Time"
          value="4.2 days"
          change="-0.8 days"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-saffron"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Issues - 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle>Recent Issues</CardTitle>
            <Link
              href="/dashboard/issues"
              className="text-sm text-saffron font-medium flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-card border border-gray-100 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {recentIssues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* CHI Score */}
          <Card>
            <CardHeader>
              <CardTitle>Your Area&apos;s CHI</CardTitle>
              <Badge variant="info">Ward 113</Badge>
            </CardHeader>
            <div className="flex justify-center">
              <CHIGauge score={68} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">72</p>
                <p className="text-xs text-gray-500">Infrastructure</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">61</p>
                <p className="text-xs text-gray-500">Governance</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">74</p>
                <p className="text-xs text-gray-500">Services</p>
              </div>
            </div>
          </Card>

          {/* Issue Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Issue Trends</CardTitle>
              <span className="text-xs text-gray-400">Last 30 days</span>
            </CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Reported</p>
                  <p className="text-xs text-gray-400">342 issues</p>
                </div>
                <TrendSparkline data={[20, 25, 18, 30, 28, 35, 32, 40, 38, 42]} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Resolved</p>
                  <p className="text-xs text-gray-400">289 issues</p>
                </div>
                <TrendSparkline data={[15, 18, 22, 20, 25, 28, 30, 35, 33, 38]} color="#059669" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Pending</p>
                  <p className="text-xs text-gray-400">53 issues</p>
                </div>
                <TrendSparkline data={[12, 15, 10, 14, 8, 11, 9, 7, 10, 6]} color="#D97706" />
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.type === "issue_update" && <Clock className="w-4 h-4 text-info" />}
                    {item.type === "leader_response" && <MessageCircle className="w-4 h-4 text-saffron" />}
                    {item.type === "poll_result" && <ThumbsUp className="w-4 h-4 text-purple-500" />}
                    {item.type === "issue_resolved" && <CheckCircle className="w-4 h-4 text-success" />}
                    {item.type === "upvote" && <TrendingUp className="w-4 h-4 text-saffron" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 line-clamp-2">{item.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
