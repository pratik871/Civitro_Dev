import { Timeline, type TimelineStep } from "@/components/ui/timeline";
import { LEDGER_STEPS, LEDGER_STEP_LABELS } from "@/types/issue";
import type { LedgerEntry, IssueStatus } from "@/types";
import { formatDate } from "@/lib/utils";

interface LedgerTimelineProps {
  entries: LedgerEntry[];
  currentStatus: IssueStatus;
  className?: string;
}

export function LedgerTimeline({ entries, currentStatus, className }: LedgerTimelineProps) {
  const currentIndex = LEDGER_STEPS.indexOf(currentStatus);
  const entryMap = new Map(entries.map((e) => [e.step, e]));

  const steps: TimelineStep[] = LEDGER_STEPS.map((step, index) => {
    const entry = entryMap.get(step);
    let status: TimelineStep["status"];

    if (index < currentIndex) {
      status = "completed";
    } else if (index === currentIndex) {
      status = "current";
    } else {
      status = "upcoming";
    }

    return {
      label: LEDGER_STEP_LABELS[step],
      description: entry?.note,
      timestamp: entry?.timestamp ? formatDate(entry.timestamp, { hour: "numeric", minute: "numeric" }) : undefined,
      actor: entry?.actor,
      status,
    };
  });

  return <Timeline steps={steps} className={className} />;
}
