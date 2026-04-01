import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Poll } from '../types/poll';

/** Raw exit poll shape from the backend (same as PollListResponse). */
interface RawExitPoll {
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

function mapExitPoll(raw: RawExitPoll): Poll {
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

export function useExitPolls(boundaryId?: string) {
  return useQuery({
    queryKey: ['exit-polls', boundaryId],
    queryFn: async () => {
      const endpoint = boundaryId
        ? `/api/v1/polls/exit?boundary_id=${boundaryId}`
        : '/api/v1/polls/exit';
      const res = await api.get<RawExitPoll[]>(endpoint);
      return (res ?? []).map(mapExitPoll);
    },
    staleTime: 30_000,
  });
}

export interface PollResults {
  id: string;
  question: string;
  options: Array<{
    id: string;
    label: string;
    votes_count: number;
    percentage: number;
  }>;
  total_votes: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
}

export function usePollResults(pollId: string) {
  return useQuery({
    queryKey: ['poll-results', pollId],
    queryFn: async () => {
      const data = await api.get<PollResults>(`/api/v1/polls/${pollId}/results`);
      return data;
    },
    staleTime: 30_000,
    enabled: !!pollId,
  });
}
