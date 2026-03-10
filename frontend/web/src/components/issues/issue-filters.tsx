"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import type { IssueCategory, IssueStatus } from "@/types";
import { ISSUE_CATEGORY_LABELS, LEDGER_STEP_LABELS } from "@/types/issue";
import { cn } from "@/lib/utils";

interface IssueFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: IssueCategory | "";
  onCategoryChange: (value: IssueCategory | "") => void;
  selectedStatus: IssueStatus | "";
  onStatusChange: (value: IssueStatus | "") => void;
}

export function IssueFilters({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
}: IssueFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2 bg-white rounded-btn border border-gray-200 px-4 py-2.5">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search issues by title or description..."
          className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="font-medium">Filters:</span>
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as IssueCategory | "")}
          className={cn(
            "text-sm rounded-btn border border-gray-200 px-3 py-1.5 bg-white text-gray-700",
            "focus:outline-none focus:ring-2 focus:ring-saffron/50 focus:border-saffron",
          )}
        >
          <option value="">All Categories</option>
          {Object.entries(ISSUE_CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as IssueStatus | "")}
          className={cn(
            "text-sm rounded-btn border border-gray-200 px-3 py-1.5 bg-white text-gray-700",
            "focus:outline-none focus:ring-2 focus:ring-saffron/50 focus:border-saffron",
          )}
        >
          <option value="">All Statuses</option>
          {Object.entries(LEDGER_STEP_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
