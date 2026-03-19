import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Poll } from '../types/poll';

/** Raw poll shape from Go backend (camelCase JSON). */
interface RawPoll {
  id: string;
  title: string;
  description: string;
  category: string;
  ward: string;
  constituency: string;
  options: Array<{ id: string; text: string; votes: number; percentage: number }>;
  totalVotes: number;
  hasVoted: boolean;
  selectedOptionId: string;
  createdBy: string;
  createdByName: string;
  expiresAt: string;
  createdAt: string;
  isActive: boolean;
}

function mapPoll(raw: RawPoll): Poll {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? '',
    category: raw.category,
    options: (raw.options ?? []).map(o => ({
      id: o.id,
      text: o.text,
      votes: o.votes,
      percentage: o.percentage,
    })),
    totalVotes: raw.totalVotes,
    hasVoted: raw.hasVoted ?? false,
    selectedOptionId: raw.selectedOptionId,
    createdBy: raw.createdBy,
    createdByName: raw.createdByName ?? '',
    expiresAt: raw.expiresAt,
    createdAt: raw.createdAt,
    isActive: raw.isActive,
  };
}

export function usePolls() {
  return useQuery({
    queryKey: ['polls'],
    queryFn: async () => {
      const res = await api.get<RawPoll[]>('/api/v1/polls');
      return (res ?? []).map(mapPoll);
    },
    staleTime: 30_000,
  });
}

export function usePoll(pollId: string) {
  return useQuery({
    queryKey: ['polls', pollId],
    queryFn: async () => {
      const raw = await api.get<RawPoll>(`/api/v1/polls/${pollId}`);
      return mapPoll(raw);
    },
    staleTime: 30_000,
    enabled: !!pollId,
  });
}

export function useVotePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      api.post(`/api/v1/polls/${pollId}/vote`, { option_id: optionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}

export function useRetractVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pollId: string) =>
      api.delete(`/api/v1/polls/${pollId}/vote`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}
