"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { getStatusColor, formatDate } from "@/lib/utils";
import type { Promise } from "@/types";

const MOCK_PROMISES: Promise[] = [
  {
    id: "pr1",
    leaderId: "l1",
    leaderName: "Rajesh Kumar Singh",
    title: "Build new bus stop at 5th Cross, Koramangala",
    description: "Promised during ward visit that a new bus stop with shelter will be constructed at 5th Cross Road to serve commuters.",
    category: "Infrastructure",
    status: "fulfilled",
    deadline: "2026-03-01T00:00:00Z",
    citizenVerifications: 145,
    createdAt: "2025-09-15T00:00:00Z",
    updatedAt: "2026-02-20T00:00:00Z",
  },
  {
    id: "pr2",
    leaderId: "l1",
    leaderName: "Rajesh Kumar Singh",
    title: "Install 50 new LED streetlights in Ward 113",
    description: "Committed to replacing all old sodium vapor streetlights with energy-efficient LEDs within 6 months.",
    category: "Infrastructure",
    status: "in_progress",
    deadline: "2026-06-30T00:00:00Z",
    citizenVerifications: 0,
    createdAt: "2026-01-10T00:00:00Z",
    updatedAt: "2026-03-05T00:00:00Z",
  },
  {
    id: "pr3",
    leaderId: "l2",
    leaderName: "Dr. Priya Nair",
    title: "Free health camp every month in BTM Layout",
    description: "Promised monthly free health check-up camps in all 4 sectors of BTM Layout constituency.",
    category: "Healthcare",
    status: "partially_fulfilled",
    deadline: "2026-12-31T00:00:00Z",
    citizenVerifications: 67,
    createdAt: "2025-06-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "pr4",
    leaderId: "l4",
    leaderName: "Sunita Devi",
    title: "New government college for Bangalore South",
    description: "Pledged to establish a new government degree college to serve students in Bangalore South constituency.",
    category: "Education",
    status: "pending",
    deadline: "2027-06-30T00:00:00Z",
    citizenVerifications: 0,
    createdAt: "2025-03-15T00:00:00Z",
    updatedAt: "2025-03-15T00:00:00Z",
  },
  {
    id: "pr5",
    leaderId: "l3",
    leaderName: "Amit Patel",
    title: "Complete drainage system upgrade in HSR Layout",
    description: "Promised complete overhaul of the storm water drain system to prevent annual flooding in HSR Layout.",
    category: "Infrastructure",
    status: "broken",
    deadline: "2025-12-31T00:00:00Z",
    citizenVerifications: 23,
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
  },
];

const statusVariant: Record<string, "default" | "success" | "error" | "warning" | "info" | "saffron"> = {
  pending: "default",
  in_progress: "info",
  fulfilled: "success",
  broken: "error",
  partially_fulfilled: "warning",
};

export default function PromisesPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Promise Tracker</h1>
        <p className="page-subtitle">
          Track promises made by leaders and verify their delivery
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total", count: 5, color: "text-gray-900" },
          { label: "Fulfilled", count: 1, color: "text-success" },
          { label: "In Progress", count: 1, color: "text-info" },
          { label: "Pending", count: 1, color: "text-gray-500" },
          { label: "Broken", count: 1, color: "text-error" },
        ].map((item) => (
          <Card key={item.label} className="text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
          </Card>
        ))}
      </div>

      {/* Promises list */}
      <div className="space-y-4">
        {MOCK_PROMISES.map((promise) => (
          <Card key={promise.id} hoverable>
            <div className="flex items-start gap-4">
              <Avatar name={promise.leaderName} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={statusVariant[promise.status] ?? "default"}>
                    {promise.status.replace("_", " ")}
                  </Badge>
                  <Badge>{promise.category}</Badge>
                </div>
                <h3 className="font-semibold text-gray-900">{promise.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{promise.leaderName}</p>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {promise.description}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span>Made {formatDate(promise.createdAt)}</span>
                  {promise.deadline && <span>Deadline: {formatDate(promise.deadline)}</span>}
                  {promise.citizenVerifications > 0 && (
                    <span>{promise.citizenVerifications} verifications</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
