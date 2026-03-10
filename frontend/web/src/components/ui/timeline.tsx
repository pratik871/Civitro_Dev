import { Check, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineStep {
  label: string;
  description?: string;
  timestamp?: string;
  actor?: string;
  status: "completed" | "current" | "upcoming";
}

interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={index} className="flex gap-4">
            {/* Icon + line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2",
                  step.status === "completed" && "bg-success border-success text-white",
                  step.status === "current" && "bg-saffron border-saffron text-white",
                  step.status === "upcoming" && "bg-white border-gray-200 text-gray-400",
                )}
              >
                {step.status === "completed" && <Check className="w-4 h-4" />}
                {step.status === "current" && <Clock className="w-4 h-4" />}
                {step.status === "upcoming" && <Circle className="w-3 h-3" />}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[32px]",
                    step.status === "completed" ? "bg-success" : "bg-gray-200",
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn("pb-6", isLast && "pb-0")}>
              <p
                className={cn(
                  "font-medium text-sm",
                  step.status === "upcoming" ? "text-gray-400" : "text-gray-900",
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
              )}
              {step.timestamp && (
                <p className="text-xs text-gray-400 mt-1">{step.timestamp}</p>
              )}
              {step.actor && (
                <p className="text-xs text-gray-400">by {step.actor}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
