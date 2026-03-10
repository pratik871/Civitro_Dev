"use client";

import { useState } from "react";
import { Search, MoreHorizontal, CheckCircle, XCircle, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { formatDate, cn } from "@/lib/utils";

const MOCK_USERS = [
  {
    id: "u1",
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    role: "citizen" as const,
    city: "Bengaluru",
    state: "Karnataka",
    civicScore: 85,
    isVerified: true,
    isActive: true,
    issuesReported: 12,
    voicesPosted: 8,
    createdAt: "2025-06-15T00:00:00Z",
  },
  {
    id: "u2",
    name: "Rahul Verma",
    email: "rahul.verma@example.com",
    role: "citizen" as const,
    city: "Bengaluru",
    state: "Karnataka",
    civicScore: 72,
    isVerified: true,
    isActive: true,
    issuesReported: 5,
    voicesPosted: 15,
    createdAt: "2025-08-20T00:00:00Z",
  },
  {
    id: "u3",
    name: "Ananya Patel",
    email: "ananya.p@example.com",
    role: "citizen" as const,
    city: "Bengaluru",
    state: "Karnataka",
    civicScore: 45,
    isVerified: false,
    isActive: true,
    issuesReported: 2,
    voicesPosted: 1,
    createdAt: "2026-01-10T00:00:00Z",
  },
  {
    id: "u4",
    name: "Meena Kumari",
    email: "meena.k@example.com",
    role: "citizen" as const,
    city: "Bengaluru",
    state: "Karnataka",
    civicScore: 91,
    isVerified: true,
    isActive: true,
    issuesReported: 28,
    voicesPosted: 34,
    createdAt: "2024-12-01T00:00:00Z",
  },
  {
    id: "u5",
    name: "spammer_account",
    email: "spam@fake.com",
    role: "citizen" as const,
    city: "Unknown",
    state: "Unknown",
    civicScore: 5,
    isVerified: false,
    isActive: false,
    issuesReported: 0,
    voicesPosted: 50,
    createdAt: "2026-03-08T00:00:00Z",
  },
  {
    id: "mod1",
    name: "Sita Ramaswamy",
    email: "sita.r@civitro.in",
    role: "moderator" as const,
    city: "Bengaluru",
    state: "Karnataka",
    civicScore: 95,
    isVerified: true,
    isActive: true,
    issuesReported: 0,
    voicesPosted: 0,
    createdAt: "2024-06-01T00:00:00Z",
  },
];

const roleVariants: Record<string, "default" | "saffron" | "success" | "error" | "warning" | "info"> = {
  citizen: "default",
  leader: "saffron",
  official: "info",
  admin: "error",
  moderator: "warning",
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const filtered = MOCK_USERS.filter((user) => {
    const matchesSearch =
      !search ||
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">
          View and manage all registered users ({MOCK_USERS.length} total)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-btn border border-gray-200 px-4 py-2.5 flex-1">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name or email..."
            className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-sm rounded-btn border border-gray-200 px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-saffron/50"
        >
          <option value="">All Roles</option>
          <option value="citizen">Citizen</option>
          <option value="leader">Leader</option>
          <option value="official">Official</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Users table/list */}
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Civic Score</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          {user.isVerified && <CheckCircle className="w-3.5 h-3.5 text-info" />}
                        </div>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={roleVariants[user.role]}>{user.role}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.city}, {user.state}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <ScoreRing score={user.civicScore} size={40} strokeWidth={3} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="error">Suspended</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
