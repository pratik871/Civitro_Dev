import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

// ---------- Response types ----------

export interface PatternEvidence {
  id: string;
  issue_id: string;
  issue_title: string;
  issue_category: string;
  created_at: string;
}

export interface Pattern {
  id: string;
  ward_id: string;
  ward_name: string;
  description: string;
  category: string;
  issue_count: number;
  resolved_count: number;
  locations: number;
  estimated_damage: string;
  days_unresolved: number;
  created_at: string;
  evidence?: PatternEvidence[];
}

// ---------- Hooks ----------

/** List patterns detected for a specific ward. */
export function usePatterns(wardId: string | undefined) {
  return useQuery({
    queryKey: ['patterns', wardId],
    queryFn: () => api.get<{ patterns: Pattern[] }>(`/api/v1/patterns/ward/${wardId}`),
    enabled: !!wardId,
    staleTime: 60_000,
  });
}

/** Fetch a single pattern with its evidence chain. */
export function usePattern(patternId: string) {
  return useQuery({
    queryKey: ['patterns', patternId],
    queryFn: () => api.get<{ pattern: Pattern }>(`/api/v1/patterns/${patternId}`),
    enabled: !!patternId,
    staleTime: 30_000,
  });
}
