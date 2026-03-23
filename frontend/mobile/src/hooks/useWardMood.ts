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

// Raw API shape (flat fields, not nested trend)
interface RawWardMood {
  ward_id: string;
  mood: string;
  score: number;
  topics: WardMoodTopic[];
  trend_direction: string;
  trend_change_percent: number;
  trend_sparkline: number[];
}

export function useWardMood(wardId: string | undefined) {
  return useQuery({
    queryKey: ['ward-mood', wardId],
    queryFn: async () => {
      const raw = await api.get<RawWardMood>(`/api/v1/ward-mood/${wardId}`);
      // Map flat fields to nested trend object
      return {
        ward_id: raw.ward_id,
        mood: raw.mood,
        score: raw.score,
        topics: raw.topics ?? [],
        trend: {
          direction: (raw.trend_direction || 'stable') as WardMoodTrend['direction'],
          change_percent: raw.trend_change_percent ?? 0,
          sparkline: raw.trend_sparkline ?? [],
        },
      } as WardMoodData;
    },
    enabled: !!wardId,
    staleTime: 5 * 60_000,
  });
}
