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
  active_citizens_in_ward: number;
  active_citizens_trend: number;
  active_polls_count: number;
  unread_messages: number;
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
