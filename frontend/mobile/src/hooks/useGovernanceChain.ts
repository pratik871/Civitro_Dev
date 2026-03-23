import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { GovernanceRep } from '../types/governance';

interface RawChainEntry {
  id: string;
  ward_id: string;
  tier: number;
  level: string;
  is_department_routed: boolean;
  department_category: string;
  name: string;
  title: string;
  initials: string;
  party: string;
  is_elected: boolean;
  response_time_days: number | null;
  rating: number | null;
  issues_label: string | null;
}

function mapEntry(raw: RawChainEntry): GovernanceRep {
  // Map backend level to frontend tierKey
  const levelToTierKey: Record<string, string> = {
    ward_councillor: 't1',
    mayor: 't2',
    district_collector: 't2b',
    mla: 't3',
    state_minister: 't4',
    chief_minister: 't5',
    mp_lok_sabha: 't6',
    central_minister: 't7',
    prime_minister: 't8',
  };

  return {
    id: raw.id,
    tierKey: levelToTierKey[raw.level] || raw.level,
    name: raw.name,
    title: raw.title,
    initials: raw.initials,
    isElected: raw.is_elected,
    responseTimeDays: raw.response_time_days,
    rating: raw.rating,
    issuesLabel: raw.issues_label,
    isDepartmentRouted: raw.is_department_routed,
    department: raw.department_category || undefined,
  };
}

export function useGovernanceChain(wardId: string | undefined) {
  return useQuery({
    queryKey: ['governance-chain', wardId],
    queryFn: async () => {
      const res = await api.get<{ chain: RawChainEntry[] }>(
        `/api/v1/governance/ward/${wardId}/chain`,
      );
      return (res.chain ?? []).map(mapEntry);
    },
    enabled: !!wardId,
    staleTime: 5 * 60_000, // 5 minutes
  });
}
