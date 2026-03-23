import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

// ---------- Response types (matching backend API) ----------

export interface Pattern {
  id: string;
  ward_id: string;
  category: string;
  cluster_type: string;
  confidence: string;
  report_count: number;
  unique_locations: number;
  centroid_lat: number | null;
  centroid_lng: number | null;
  radius_meters: number | null;
  first_report_at: string | null;
  last_report_at: string | null;
  days_unresolved: number;
  economic_impact: number | null;
  evidence_package_json: Record<string, unknown> | null;
  community_action_id: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  // Computed for display
  description?: string;
}

// ---------- Hooks ----------

/** List patterns detected for a specific ward. */
export function usePatterns(wardId: string | undefined) {
  return useQuery({
    queryKey: ['patterns', wardId],
    queryFn: async () => {
      const res = await api.get<{ patterns: Pattern[] }>(`/api/v1/patterns/ward/${wardId}`);
      // Add description from evidence package or generate from data
      const patterns = (res.patterns ?? []).map(p => ({
        ...p,
        description: p.evidence_package_json?.ai_summary as string
          || `${p.report_count} ${p.category.replace('_', ' ')} reports in your ward — ${p.days_unresolved} days unresolved`,
      }));
      return { patterns };
    },
    enabled: !!wardId,
    staleTime: 60_000,
  });
}

/** Fetch a single pattern with its evidence package. */
export function usePattern(patternId: string) {
  return useQuery({
    queryKey: ['patterns', patternId],
    queryFn: () => api.get<{ pattern: Pattern }>(`/api/v1/patterns/${patternId}`),
    enabled: !!patternId,
    staleTime: 30_000,
  });
}
