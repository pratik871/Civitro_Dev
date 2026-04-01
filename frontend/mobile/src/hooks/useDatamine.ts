import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ---------- Types matching backend models ----------

export interface IssueTrendPoint {
  date: string;
  category: string;
  count: number;
  resolution_rate: number;
}

export interface IssueTrendsData {
  boundary_id: string;
  trends: IssueTrendPoint[];
  period_days: number;
  generated_at: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  category: string | null;
}

export interface HeatmapData {
  boundary_id: string;
  points: HeatmapPoint[];
  total_points: number;
  generated_at: string;
}

export interface VerificationBreakdown {
  aadhaar_verified: number;
  phone_verified: number;
  unverified: number;
}

export interface ActivityMetrics {
  voices_last_30d: number;
  issues_last_30d: number;
  polls_participated_last_30d: number;
  avg_daily_active_users: number;
}

export interface DemographicSnapshot {
  boundary_id: string;
  total_users: number;
  verification_breakdown: VerificationBreakdown;
  activity_metrics: ActivityMetrics;
  generated_at: string;
}

export type ReportType =
  | 'heatmap'
  | 'demographic'
  | 'voice_traits'
  | 'issue_trends'
  | 'leader_comparison';

export type ReportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface AnalyticsReport {
  id: string;
  type: ReportType;
  boundary_id: string | null;
  parameters: Record<string, unknown>;
  status: ReportStatus;
  result_url: string | null;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface CreateReportRequest {
  type: ReportType;
  boundary_id?: string;
  parameters?: Record<string, unknown>;
}

// ---------- Hooks ----------

export function useIssueTrends(boundaryId: string | undefined) {
  return useQuery<IssueTrendsData>({
    queryKey: ['datamine', 'issue-trends', boundaryId],
    queryFn: () =>
      api.get<IssueTrendsData>(`/api/v1/datamine/issue-trends/${boundaryId}`),
    enabled: !!boundaryId,
    staleTime: 60_000,
  });
}

export function useHeatmap(boundaryId: string | undefined) {
  return useQuery<HeatmapData>({
    queryKey: ['datamine', 'heatmap', boundaryId],
    queryFn: () =>
      api.get<HeatmapData>(`/api/v1/datamine/heatmap/${boundaryId}`),
    enabled: !!boundaryId,
    staleTime: 60_000,
  });
}

export function useDemographics(boundaryId: string | undefined) {
  return useQuery<DemographicSnapshot>({
    queryKey: ['datamine', 'demographics', boundaryId],
    queryFn: () =>
      api.get<DemographicSnapshot>(
        `/api/v1/datamine/demographics/${boundaryId}`,
      ),
    enabled: !!boundaryId,
    staleTime: 60_000,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation<AnalyticsReport, Error, CreateReportRequest>({
    mutationFn: (req) =>
      api.post<AnalyticsReport>('/api/v1/datamine/reports', req as unknown as Record<string, unknown>),
    onSuccess: (report) => {
      queryClient.setQueryData(['datamine', 'report', report.id], report);
    },
  });
}

export function useReport(reportId: string | undefined) {
  return useQuery<AnalyticsReport>({
    queryKey: ['datamine', 'report', reportId],
    queryFn: () =>
      api.get<AnalyticsReport>(`/api/v1/datamine/reports/${reportId}`),
    enabled: !!reportId,
    // Poll every 3 seconds while the report is not in a terminal state
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return 3000;
    },
    staleTime: 0,
  });
}
