import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface DashboardIssue {
  id: string;
  text: string;
  category: string;
  status: string;
  created_at: string;
}

export interface LeaderDashboardData {
  leader_id: string;
  leader_name: string;
  ward: string;
  boundary_id: string;
  party: string;
  designation: string;
  issues_in_ward: number;
  resolved_count: number;
  pending_count: number;
  avg_response_days: number;
  citizen_satisfaction: number;
  pending_actions: number;
  total_ratings: number;
  recent_issues: DashboardIssue[];
}

export function useLeaderDashboard(leaderId: string) {
  return useQuery({
    queryKey: ['leader-dashboard', leaderId],
    queryFn: async () => {
      const data = await api.get<LeaderDashboardData>(
        `/api/v1/representatives/${leaderId}/dashboard`,
      );
      return data;
    },
    staleTime: 60_000,
    enabled: !!leaderId,
  });
}

export interface ConstituencyIssue {
  id: string;
  text: string;
  category: string;
  status: string;
  severity: string;
  upvotes: number;
  created_at: string;
  photo_urls?: string[];
}

export function useConstituencyIssues(boundaryId: string) {
  return useQuery({
    queryKey: ['constituency-issues', boundaryId],
    queryFn: async () => {
      const data = await api.get<{ issues: ConstituencyIssue[] } | ConstituencyIssue[]>(
        `/api/v1/issues/boundary/${boundaryId}`,
      );
      if (Array.isArray(data)) return data;
      return data.issues ?? [];
    },
    staleTime: 30_000,
    enabled: !!boundaryId,
  });
}
