"use client";

import { cn } from "@/lib/utils";

interface CHIGaugeProps {
  score: number;
  label?: string;
  size?: number;
  className?: string;
}

function getGradeInfo(score: number): { grade: string; color: string; bgColor: string } {
  if (score >= 90) return { grade: "A+", color: "text-emerald-600", bgColor: "from-emerald-400 to-emerald-600" };
  if (score >= 80) return { grade: "A", color: "text-emerald-500", bgColor: "from-emerald-300 to-emerald-500" };
  if (score >= 70) return { grade: "B+", color: "text-blue-500", bgColor: "from-blue-300 to-blue-500" };
  if (score >= 60) return { grade: "B", color: "text-blue-400", bgColor: "from-blue-200 to-blue-400" };
  if (score >= 50) return { grade: "C", color: "text-amber-500", bgColor: "from-amber-300 to-amber-500" };
  if (score >= 40) return { grade: "D", color: "text-orange-500", bgColor: "from-orange-300 to-orange-500" };
  return { grade: "F", color: "text-red-500", bgColor: "from-red-400 to-red-600" };
}

export function CHIGauge({ score, label = "Civic Health Index", size = 160, className }: CHIGaugeProps) {
  const { grade, color } = getGradeInfo(score);
  const radius = (size - 16) / 2;
  const circumference = Math.PI * radius; // Half circle
  const pct = Math.min(score / 100, 1);
  const dashOffset = circumference * (1 - pct);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
        <svg width={size} height={size / 2 + 10} className="overflow-visible">
          {/* Background arc */}
          <path
            d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn("transition-all duration-1000 ease-out", color)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={cn("text-3xl font-bold", color)}>{Math.round(score)}</span>
          <span className={cn("text-sm font-semibold", color)}>Grade {grade}</span>
        </div>
      </div>
      <span className="text-sm text-gray-500 font-medium mt-1">{label}</span>
    </div>
  );
}
