import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Leader } from '../types/leader';

export function useLeaders() {
  return useQuery({
    queryKey: ['leaders'],
    queryFn: () => api.get<Leader[]>('/api/v1/registry/representatives'),
    staleTime: 60_000,
  });
}

export function useLeader(leaderId: string) {
  return useQuery({
    queryKey: ['leaders', leaderId],
    queryFn: () => api.get<Leader>(`/api/v1/registry/representatives/${leaderId}`),
    staleTime: 60_000,
    enabled: !!leaderId,
  });
}

export function useLeaderRating(repId: string) {
  return useQuery({
    queryKey: ['ratings', repId],
    queryFn: () => api.get(`/api/v1/ratings/representative/${repId}`),
    staleTime: 60_000,
    enabled: !!repId,
  });
}
