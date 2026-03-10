"use client";

import { useState } from "react";
import { Search, AlertTriangle, Users, Megaphone, Vote, Handshake } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SearchScope = "all" | "issues" | "leaders" | "voices" | "polls" | "promises";

const SCOPES: { value: SearchScope; label: string; icon: typeof Search }[] = [
  { value: "all", label: "All", icon: Search },
  { value: "issues", label: "Issues", icon: AlertTriangle },
  { value: "leaders", label: "Leaders", icon: Users },
  { value: "voices", label: "Voices", icon: Megaphone },
  { value: "polls", label: "Polls", icon: Vote },
  { value: "promises", label: "Promises", icon: Handshake },
];

const MOCK_RESULTS = [
  { type: "issue", title: "Large pothole on MG Road near Central Mall", subtitle: "Ward 113 - Pothole - Work Started", id: "ISS-001" },
  { type: "issue", title: "Garbage not collected for 5 days in Koramangala", subtitle: "Ward 150 - Garbage - Acknowledged", id: "ISS-002" },
  { type: "leader", title: "Rajesh Kumar Singh", subtitle: "Municipal Corporator - Ward 113, Koramangala", id: "l1" },
  { type: "voice", title: "Rainwater harvesting mandate suggestion", subtitle: "445 upvotes - Suggestion", id: "v3" },
  { type: "poll", title: "Should Cubbon Park entry fee be reduced?", subtitle: "5,000 votes - Active", id: "p1" },
  { type: "promise", title: "Build new bus stop at 5th Cross", subtitle: "Rajesh Kumar Singh - Fulfilled", id: "pr1" },
];

const typeIcons: Record<string, typeof Search> = {
  issue: AlertTriangle,
  leader: Users,
  voice: Megaphone,
  poll: Vote,
  promise: Handshake,
};

const typeColors: Record<string, string> = {
  issue: "text-warning",
  leader: "text-info",
  voice: "text-purple-500",
  poll: "text-success",
  promise: "text-saffron",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");

  const filtered = MOCK_RESULTS.filter((result) => {
    if (scope !== "all" && result.type !== scope.replace(/s$/, "")) return false;
    if (!query) return true;
    return (
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.subtitle.toLowerCase().includes(query.toLowerCase())
    );
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Search</h1>
        <p className="page-subtitle">Find issues, leaders, voices, polls, and more</p>
      </div>

      {/* Search input */}
      <div className="flex items-center gap-3 bg-white rounded-card border border-gray-200 px-6 py-4 mb-6 shadow-sm">
        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across all of Civitro..."
          className="bg-transparent text-gray-700 placeholder:text-gray-400 outline-none w-full text-lg"
          autoFocus
        />
      </div>

      {/* Scope tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {SCOPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setScope(value)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-btn text-sm font-medium transition-colors",
              scope === value
                ? "bg-saffron text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-saffron-200",
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      {query ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-4">{filtered.length} results found</p>
          {filtered.map((result) => {
            const Icon = typeIcons[result.type] ?? Search;
            const color = typeColors[result.type] ?? "text-gray-500";

            return (
              <Card key={result.id} hoverable className="!p-4">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center", color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{result.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{result.subtitle}</p>
                  </div>
                  <Badge>{result.type}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Start searching</h3>
          <p className="text-sm text-gray-500">
            Type a keyword to search across issues, leaders, voices, and more.
          </p>
        </div>
      )}
    </div>
  );
}
