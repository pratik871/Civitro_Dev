import {
  Users,
  AlertTriangle,
  Shield,
  Activity,
  TrendingUp,
  FileWarning,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendSparkline } from "@/components/charts/trend-sparkline";
import { cn } from "@/lib/utils";

export default function AdminOverviewPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Overview</h1>
        <p className="page-subtitle">
          Platform health, moderation queue, and system metrics
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Users"
          value="45,230"
          change="+2.4K this month"
          changeType="positive"
          icon={Users}
          iconColor="text-info"
        />
        <StatsCard
          title="Active Issues"
          value="1,247"
          change="+12% this week"
          changeType="negative"
          icon={AlertTriangle}
          iconColor="text-warning"
        />
        <StatsCard
          title="Moderation Queue"
          value="23"
          change="5 flagged"
          changeType="negative"
          icon={Shield}
          iconColor="text-error"
        />
        <StatsCard
          title="System Uptime"
          value="99.9%"
          change="Last 30 days"
          changeType="positive"
          icon={Activity}
          iconColor="text-success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Metrics</CardTitle>
            <span className="text-xs text-gray-400">Last 30 days</span>
          </CardHeader>
          <div className="space-y-5">
            {[
              { label: "Daily Active Users", value: "8,420", data: [5200, 5800, 6400, 6800, 7200, 7800, 8420], color: "#2563EB" },
              { label: "Issues Reported", value: "342", data: [20, 25, 30, 28, 35, 38, 42], color: "#FF6B35" },
              { label: "Issues Resolved", value: "289", data: [15, 18, 22, 25, 28, 32, 38], color: "#059669" },
              { label: "API Response Time", value: "120ms", data: [150, 145, 138, 130, 125, 122, 120], color: "#7C3AED" },
            ].map((metric) => (
              <div key={metric.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{metric.label}</p>
                  <p className="text-lg font-bold text-gray-900">{metric.value}</p>
                </div>
                <TrendSparkline data={metric.data} color={metric.color} />
              </div>
            ))}
          </div>
        </Card>

        {/* Recent moderation actions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Moderation Actions</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {[
              { action: "Content removed", target: "Inappropriate voice post", by: "Auto-mod", time: "10 min ago", type: "auto" },
              { action: "User warned", target: "Spam comment on ISS-003", by: "Mod: Sita R.", time: "1 hour ago", type: "manual" },
              { action: "Content approved", target: "Flagged issue report", by: "Mod: Arjun K.", time: "2 hours ago", type: "manual" },
              { action: "User suspended", target: "Multiple policy violations", by: "Admin", time: "5 hours ago", type: "admin" },
              { action: "Content removed", target: "Fake leader review", by: "Auto-mod", time: "6 hours ago", type: "auto" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  item.type === "auto" ? "bg-purple-50 text-purple-500" :
                  item.type === "admin" ? "bg-red-50 text-error" :
                  "bg-blue-50 text-info",
                )}>
                  {item.type === "auto" ? <Activity className="w-4 h-4" /> :
                   item.type === "admin" ? <Shield className="w-4 h-4" /> :
                   <FileWarning className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.action}</p>
                  <p className="text-sm text-gray-500">{item.target}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.by} &middot; {item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}