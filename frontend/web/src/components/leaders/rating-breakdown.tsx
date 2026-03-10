import type { LeaderRating } from "@/types";
import { cn } from "@/lib/utils";

interface RatingBreakdownProps {
  rating: LeaderRating;
  className?: string;
}

const categories = [
  { key: "accessibility" as const, label: "Accessibility" },
  { key: "responsiveness" as const, label: "Responsiveness" },
  { key: "transparency" as const, label: "Transparency" },
  { key: "delivery" as const, label: "Delivery" },
];

function getBarColor(value: number): string {
  if (value >= 4) return "bg-success";
  if (value >= 3) return "bg-info";
  if (value >= 2) return "bg-warning";
  return "bg-error";
}

export function RatingBreakdown({ rating, className }: RatingBreakdownProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {categories.map(({ key, label }) => {
        const value = rating[key];
        const pct = (value / 5) * 100;

        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">{label}</span>
              <span className="text-sm font-semibold text-gray-900">{value.toFixed(1)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={cn("h-2 rounded-full transition-all duration-500", getBarColor(value))}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
        Based on {rating.totalRatings.toLocaleString("en-IN")} citizen ratings
      </div>
    </div>
  );
}
