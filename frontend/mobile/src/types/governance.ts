// Governance tier levels matching the HTML mockup (T1–T8 + T2b)
export type TierLevel = 'municipal' | 'district' | 'state' | 'central';

export interface GovernanceTier {
  key: string;        // t1, t2, t2b, t3, t4, t5, t6, t7, t8
  label: string;      // Short label shown under avatar
  fullLabel: string;  // Full tag label shown in expanded card
  level: TierLevel;
  showActions?: boolean; // Show Message/Rate/View Issues buttons
}

export const GOVERNANCE_TIERS: GovernanceTier[] = [
  { key: 't1',  label: 'Ward',    fullLabel: 'T1 Ward Councillor',    level: 'municipal', showActions: true },
  { key: 't2',  label: 'Mayor',   fullLabel: 'T2 Mayor',             level: 'municipal', showActions: true },
  { key: 't2b', label: 'DC',      fullLabel: 'T2b District Collector', level: 'district', showActions: true },
  { key: 't3',  label: 'MLA',     fullLabel: 'T3 MLA',               level: 'state', showActions: true },
  { key: 't4',  label: 'State',   fullLabel: 'T4 State Minister',    level: 'state', showActions: true },
  { key: 't5',  label: 'CM',      fullLabel: 'T5 Chief Minister',    level: 'state', showActions: true },
  { key: 't6',  label: 'MP',      fullLabel: 'T6 MP (Lok Sabha)',    level: 'central', showActions: true },
  { key: 't7',  label: 'Central', fullLabel: 'T7 Central Minister',  level: 'central', showActions: true },
  { key: 't8',  label: 'PM',      fullLabel: 'T8 Prime Minister',    level: 'central', showActions: true },
];

export interface GovernanceRep {
  id: string;
  userId?: string;
  tierKey: string;
  name: string;
  title: string;
  initials: string;
  isElected: boolean;
  responseTimeDays: number | null; // null = no data
  rating: number | null;
  issuesLabel: string | null;
  isDepartmentRouted?: boolean;
  department?: string;
}

// Tier level → tag background/text colors
export const TIER_LEVEL_COLORS: Record<TierLevel, { bg: string; text: string }> = {
  municipal: { bg: '#FFF3ED', text: '#FF6B35' },
  district:  { bg: '#EFF6FF', text: '#3B82F6' },
  state:     { bg: '#ECFDF5', text: '#047857' },
  central:   { bg: '#F5F3FF', text: '#7C3AED' },
};

// Response time → ring color
export function getResponseRingColor(days: number | null): string {
  if (days === null) return '#9CA3AF'; // gray — no data
  if (days <= 3) return '#10B981';     // green
  if (days <= 7) return '#F59E0B';     // amber
  return '#EF4444';                    // red
}

// Response time → pill style variant
export function getResponsePillVariant(days: number | null): string {
  if (days === null) return 'none';
  if (days <= 3) return 'good';
  if (days <= 7) return 'mid';
  return 'slow';
}
