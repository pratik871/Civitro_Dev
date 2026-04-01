import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetProposal {
  id: string;
  title: string;
  description: string;
  category: string;
  requestedAmount: number; // paisa
  fiscalYear: string;
  status: string;
  createdBy: string;
  createdAt: string;
  userAllocation: number; // 0-100, user's existing vote
}

export interface BudgetAllocation {
  proposal_id: string;
  allocation_pct: number;
}

export interface BudgetProposalResult {
  proposal_id: string;
  title: string;
  category: string;
  requested_amount: number;
  avg_allocation: number;
  total_voters: number;
}

export interface BudgetResults {
  boundary_id: string;
  fiscal_year: string;
  total_voters: number;
  proposals: BudgetProposalResult[];
}

interface ProposalsResponse {
  boundary_id: string;
  proposals: BudgetProposal[];
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useBudgetProposals(boundaryId: string) {
  return useQuery({
    queryKey: ['budgets', 'proposals', boundaryId],
    queryFn: async () => {
      const res = await api.get<ProposalsResponse>(
        `/api/v1/polls/budgets/${boundaryId}`,
      );
      return res.proposals ?? [];
    },
    staleTime: 30_000,
    enabled: !!boundaryId,
  });
}

export function useSubmitBudgetVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      boundaryId,
      allocations,
    }: {
      boundaryId: string;
      allocations: BudgetAllocation[];
    }) =>
      api.post(`/api/v1/polls/budgets/${boundaryId}/vote`, {
        allocations,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['budgets', 'proposals', variables.boundaryId],
      });
      queryClient.invalidateQueries({
        queryKey: ['budgets', 'results', variables.boundaryId],
      });
    },
  });
}

export function useBudgetResults(boundaryId: string) {
  return useQuery({
    queryKey: ['budgets', 'results', boundaryId],
    queryFn: async () => {
      return api.get<BudgetResults>(
        `/api/v1/polls/budgets/${boundaryId}/results`,
      );
    },
    staleTime: 30_000,
    enabled: !!boundaryId,
  });
}
