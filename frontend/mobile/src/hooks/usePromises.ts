import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export type PromiseSourceType = 'speech' | 'interview' | 'manifesto' | 'social_media' | 'news';
export type PromiseStatus = 'detected' | 'on_track' | 'delayed' | 'fulfilled' | 'broken';

export interface Promise {
  id: string;
  leader_id: string;
  leader_name?: string;
  title: string;
  description: string;
  source_type: PromiseSourceType;
  status: PromiseStatus;
  confidence: number;
  evidence_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PromiseDetail extends Promise {
  status_history?: Array<{
    status: PromiseStatus;
    changed_at: string;
    note?: string;
  }>;
}

export function usePromises(leaderId?: string) {
  return useQuery({
    queryKey: ['promises', leaderId ?? 'all'],
    queryFn: async () => {
      const endpoint = leaderId
        ? `/api/v1/promises?leader_id=${leaderId}`
        : '/api/v1/promises';
      const res = await api.get<{ promises: Promise[] } | Promise[]>(endpoint);
      return Array.isArray(res) ? res : (res.promises ?? []);
    },
    staleTime: 60_000,
  });
}

export function usePromiseDetail(id: string) {
  return useQuery({
    queryKey: ['promises', 'detail', id],
    queryFn: async () => {
      const res = await api.get<PromiseDetail | { promise: PromiseDetail }>(`/api/v1/promises/${id}`);
      return 'promise' in res ? res.promise : res;
    },
    staleTime: 60_000,
    enabled: !!id,
  });
}
