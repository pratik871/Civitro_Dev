import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

// ---------- Response types ----------

export interface RecentlyResolved {
  id: string;
  title: string;
  resolved_at: string;
  citizen_reports: number;
}

export interface DashboardStats {
  civic_score: number;
  civic_level: string;
  issues_reported: number;
  polls_voted: number;
  validations: number;
  actions_supported: number;
  actions_started: number;
  streak_days: number;
  ward_id: string;
  ward_name: string;
  ward_area: string;
  active_citizens_in_ward: number;
  active_citizens_trend: number;
  active_polls_count: number;
  active_actions_count: number;
  promises_tracked: number;
  chi_score: number;
  unread_messages: number;
  ward_rank: number;
  total_wards: number;
  resolution_trend: string;
  sparkline_data: number[];
  sparkline_trend: string;
  comparison_ward: string;
  comparison_count: number;
  your_resolved_count: number;
  citizen_initials: string[];
  recently_resolved: RecentlyResolved[];
}

// ---------- Hook ----------

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/api/v1/auth/dashboard-stats'),
    staleTime: 30_000,
  });
}
