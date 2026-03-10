"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IssueCard } from "@/components/issues/issue-card";
import { IssueFilters } from "@/components/issues/issue-filters";
import { useIssues } from "@/hooks/use-issues";
import type { IssueCategory, IssueStatus } from "@/types";

export default function IssuesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<IssueCategory | "">("");
  const [status, setStatus] = useState<IssueStatus | "">("");

  const { data: issues, isLoading } = useIssues({
    search: search || undefined,
    category: category || undefined,
    status: status || undefined,
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Issues</h1>
          <p className="page-subtitle">
            Track and manage civic issues in your community
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Report Issue
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <IssueFilters
          search={search}
          onSearchChange={setSearch}
          selectedCategory={category}
          onCategoryChange={setCategory}
          selectedStatus={status}
          onStatusChange={setStatus}
        />
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-500">
        {isLoading ? "Loading..." : `${issues?.length ?? 0} issues found`}
      </div>

      {/* Issues list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-card border border-gray-100 p-6 animate-pulse">
              <div className="flex gap-2 mb-3">
                <div className="h-5 bg-gray-200 rounded-full w-20" />
                <div className="h-5 bg-gray-200 rounded-full w-24" />
              </div>
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : issues && issues.length > 0 ? (
        <div className="space-y-4">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No issues found</h3>
          <p className="text-sm text-gray-500">
            Try adjusting your filters or report a new issue.
          </p>
        </div>
      )}
    </div>
  );
}
