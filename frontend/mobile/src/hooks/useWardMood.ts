import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface WardMoodTopic {
  name: string;
  sentiment: number;
  percentage: number;
}

export interface WardMoodTrend {
  direction: 'improving' | 'declining' | 'stable';
  change_percent: number;
  sparkline: number[];
}

export interface WardMoodData {
  ward_id: string;
  mood: string;
  score: number;
  topics: WardMoodTopic[];
  trend: WardMoodTrend;
}

export function useWardMood(wardId: string | undefined) {
  return useQuery({
    queryKey: ['ward-mood', wardId],
    queryFn: async () => {
      return api.get<WardMoodData>(`/api/v1/sentiment/ward-mood/${wardId}`);
    },
    enabled: !!wardId,
    staleTime: 5 * 60_000, // 5 minutes — matches Redis TTL on the backend
  });
}
