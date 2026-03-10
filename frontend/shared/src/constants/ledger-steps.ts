import type { IssueStatus } from '../types';

export interface LedgerStepConfig {
  key: IssueStatus;
  label: string;
  description: string;
  /** Icon name from Feather Icons or Lucide. */
  icon: string;
  /** Step number in the issue lifecycle (1-based). */
  order: number;
  /** Hex color for timeline markers. */
  color: string;
}

/**
 * The 7 ledger steps that define the complete issue lifecycle.
 * Each transition creates an immutable ledger entry (like a git commit
 * for governance).
 */
export const LEDGER_STEPS: readonly LedgerStepConfig[] = [
  {
    key: 'reported',
    label: 'Reported',
    description: 'Issue reported by a citizen with photo and GPS evidence',
    icon: 'flag',
    order: 1,
    color: '#6B7280',
  },
  {
    key: 'acknowledged',
    label: 'Acknowledged',
    description: 'Local representative or authority acknowledged the issue',
    icon: 'eye',
    order: 2,
    color: '#3B82F6',
  },
  {
    key: 'assigned',
    label: 'Assigned',
    description: 'Issue assigned to a responsible department or contractor',
    icon: 'user-check',
    order: 3,
    color: '#8B5CF6',
  },
  {
    key: 'work_started',
    label: 'Work Started',
    description: 'Physical work or remediation has begun on the ground',
    icon: 'hard-hat',
    order: 4,
    color: '#F59E0B',
  },
  {
    key: 'completed',
    label: 'Completed',
    description: 'Authority marked the work as complete with evidence',
    icon: 'check-circle',
    order: 5,
    color: '#10B981',
  },
  {
    key: 'citizen_verified',
    label: 'Citizen Verified',
    description: 'Original reporter and community confirmed resolution',
    icon: 'shield-check',
    order: 6,
    color: '#059669',
  },
  {
    key: 'resolved',
    label: 'Resolved',
    description: 'Issue fully resolved and closed after citizen verification',
    icon: 'check-circle-2',
    order: 7,
    color: '#047857',
  },
] as const;

/** Lookup map from status key to step config. */
export const LEDGER_STEP_MAP: Record<IssueStatus, LedgerStepConfig> =
  LEDGER_STEPS.reduce(
    (acc, step) => {
      acc[step.key] = step;
      return acc;
    },
    {} as Record<IssueStatus, LedgerStepConfig>,
  );
