"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { LeaderCard } from "@/components/leaders/leader-card";
import type { Leader } from "@/types";

const MOCK_LEADERS: Leader[] = [
  {
    id: "l1",
    name: "Rajesh Kumar Singh",
    designation: "Municipal Corporator",
    level: "municipal",
    constituency: "Ward 113, Koramangala",
    state: "Karnataka",
    party: "BJP",
    chi: 82,
    rating: { overall: 4.2, accessibility: 4.5, responsiveness: 4.0, transparency: 4.1, delivery: 4.2, totalRatings: 1847 },
    issuesResolved: 156,
    issuesTotal: 198,
    promisesKept: 12,
    promisesTotal: 18,
    responseTime: "< 24 hours",
    isVerified: true,
    createdAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "l2",
    name: "Dr. Priya Nair",
    designation: "MLA",
    level: "state",
    constituency: "BTM Layout",
    state: "Karnataka",
    party: "INC",
    chi: 71,
    rating: { overall: 3.8, accessibility: 3.5, responsiveness: 4.0, transparency: 3.9, delivery: 3.8, totalRatings: 3241 },
    issuesResolved: 89,
    issuesTotal: 145,
    promisesKept: 8,
    promisesTotal: 15,
    responseTime: "1-3 days",
    isVerified: true,
    createdAt: "2024-02-20T00:00:00Z",
  },
  {
    id: "l3",
    name: "Amit Patel",
    designation: "Ward Councillor",
    level: "ward",
    constituency: "Ward 150, HSR Layout",
    state: "Karnataka",
    party: "JDS",
    chi: 65,
    rating: { overall: 3.5, accessibility: 4.0, responsiveness: 3.2, transparency: 3.3, delivery: 3.5, totalRatings: 956 },
    issuesResolved: 67,
    issuesTotal: 120,
    promisesKept: 5,
    promisesTotal: 10,
    responseTime: "2-4 days",
    isVerified: true,
    createdAt: "2024-03-10T00:00:00Z",
  },
  {
    id: "l4",
    name: "Sunita Devi",
    designation: "MP",
    level: "national",
    constituency: "Bangalore South",
    state: "Karnataka",
    party: "BJP",
    chi: 74,
    rating: { overall: 3.9, accessibility: 3.2, responsiveness: 3.8, transparency: 4.2, delivery: 4.4, totalRatings: 8920 },
    issuesResolved: 210,
    issuesTotal: 340,
    promisesKept: 18,
    promisesTotal: 25,
    responseTime: "3-7 days",
    isVerified: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
];

export default function LeadersPage() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("");

  const filtered = MOCK_LEADERS.filter((leader) => {
    const matchesSearch =
      !search ||
      leader.name.toLowerCase().includes(search.toLowerCase()) ||
      leader.constituency.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = !levelFilter || leader.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Leaders</h1>
        <p className="page-subtitle">
          Rate and review your elected representatives
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
            placeholder="Search leaders by name or constituency..."
            className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-sm rounded-btn border border-gray-200 px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-saffron/50"
          >
            <option value="">All Levels</option>
            <option value="ward">Ward</option>
            <option value="municipal">Municipal</option>
            <option value="state">State</option>
            <option value="national">National</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {filtered.map((leader) => (
          <LeaderCard key={leader.id} leader={leader} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No leaders found</h3>
            <p className="text-sm text-gray-500">Try adjusting your search or filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
