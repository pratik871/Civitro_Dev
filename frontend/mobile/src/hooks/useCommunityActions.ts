import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type {
  CommunityAction,
  ActionEvidence,
  ActionResponse,
  ActionTimelineEntry,
  ActionVerification,
  ActionStatus,
  EscalationLevel,
  ResponseType,
  EconomicImpact,
  TimelineEntryType,
  TimelineActorType,
} from '../types/action';

// ---------- Raw backend shapes (snake_case) ----------

interface RawAction {
  id: string;
  creator_id: string;
  creator_name: string;
  ward_id: string;
  ward_name: string;
  title: string;
  description: string;
  desired_outcome: string;
  target_authority_id: string;
  target_authority_name: string;
  escalation_level: EscalationLevel;
  status: ActionStatus;
  support_count: number;
  support_goal: number;
  evidence_count: number;
  category: string;
  economic_impact: RawEconomicImpact | null;
  pattern_id: string | null;
  has_supported: boolean;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  verified_at: string | null;
}

interface RawEconomicImpact {
  cost_of_inaction: number;
  cost_of_resolution: number;
  roi_ratio: number;
  currency: string;
  methodology: string;
  comparison: string | null;
}

interface RawEvidence {
  id: string;
  action_id: string;
  issue_id: string;
  issue_title: string;
  issue_category: string;
  issue_photo_url: string | null;
  issue_status: string;
  linked_by: string;
  linked_by_name: string;
  auto_linked: boolean;
  created_at: string;
}

interface RawResponse {
  id: string;
  action_id: string;
  responder_id: string;
  responder_name: string;
  responder_role: string;
  response_type: ResponseType;
  content: string;
  timeline_date: string | null;
  created_at: string;
}

interface RawTimelineEntry {
  id: string;
  action_id: string;
  entry_type: TimelineEntryType;
  actor_type: TimelineActorType;
  actor_id: string;
  actor_name: string;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface RawVerification {
  id: string;
  action_id: string;
  verifier_id: string;
  verifier_name: string;
  civic_score_at_time: number;
  photo_evidence_urls: string[];
  verified: boolean;
  created_at: string;
}

// ---------- Mappers ----------

function mapEconomicImpact(raw: RawEconomicImpact | null): EconomicImpact | null {
  if (!raw) return null;
  return {
    costOfInaction: raw.cost_of_inaction,
    costOfResolution: raw.cost_of_resolution,
    roiRatio: raw.roi_ratio,
    currency: raw.currency,
    methodology: raw.methodology,
    comparison: raw.comparison,
  };
}

function mapAction(raw: RawAction): CommunityAction {
  return {
    id: raw.id,
    creatorId: raw.creator_id,
    creatorName: raw.creator_name,
    wardId: raw.ward_id,
    wardName: raw.ward_name,
    title: raw.title,
    description: raw.description,
    desiredOutcome: raw.desired_outcome,
    targetAuthorityId: raw.target_authority_id,
    targetAuthorityName: raw.target_authority_name,
    escalationLevel: raw.escalation_level,
    status: raw.status,
    supportCount: raw.support_count,
    supportGoal: raw.support_goal,
    evidenceCount: raw.evidence_count,
    category: raw.category as CommunityAction['category'],
    economicImpact: mapEconomicImpact(raw.economic_impact),
    patternId: raw.pattern_id,
    hasSupported: raw.has_supported,
    createdAt: raw.created_at,
    acknowledgedAt: raw.acknowledged_at,
    resolvedAt: raw.resolved_at,
    verifiedAt: raw.verified_at,
  };
}

function mapEvidence(raw: RawEvidence): ActionEvidence {
  return {
    id: raw.id,
    actionId: raw.action_id,
    issueId: raw.issue_id,
    issueTitle: raw.issue_title,
    issueCategory: raw.issue_category as ActionEvidence['issueCategory'],
    issuePhotoUrl: raw.issue_photo_url,
    issueStatus: raw.issue_status,
    linkedBy: raw.linked_by,
    linkedByName: raw.linked_by_name,
    autoLinked: raw.auto_linked,
    createdAt: raw.created_at,
  };
}

function mapResponse(raw: RawResponse): ActionResponse {
  return {
    id: raw.id,
    actionId: raw.action_id,
    responderId: raw.responder_id,
    responderName: raw.responder_name,
    responderRole: raw.responder_role,
    responseType: raw.response_type,
    content: raw.content,
    timelineDate: raw.timeline_date,
    createdAt: raw.created_at,
  };
}

function mapTimelineEntry(raw: RawTimelineEntry): ActionTimelineEntry {
  return {
    id: raw.id,
    actionId: raw.action_id,
    entryType: raw.entry_type,
    actorType: raw.actor_type,
    actorId: raw.actor_id,
    actorName: raw.actor_name,
    content: raw.content,
    metadata: raw.metadata,
    createdAt: raw.created_at,
  };
}

function mapVerification(raw: RawVerification): ActionVerification {
  return {
    id: raw.id,
    actionId: raw.action_id,
    verifierId: raw.verifier_id,
    verifierName: raw.verifier_name,
    civicScoreAtTime: raw.civic_score_at_time,
    photoEvidenceUrls: raw.photo_evidence_urls ?? [],
    verified: raw.verified,
    createdAt: raw.created_at,
  };
}

// ---------- Query Hooks ----------

export function useActions(wardId?: string) {
  return useQuery({
    queryKey: ['actions', wardId || 'trending'],
    queryFn: async () => {
      // Use single action detail endpoint which correctly returns has_supported
      const endpoint = wardId
        ? `/api/v1/actions/ward/${wardId}`
        : '/api/v1/actions/trending';
      const res = await api.get<{ actions: RawAction[]; count: number }>(endpoint);
      console.log('=== RAW ACTIONS ===', JSON.stringify((res.actions ?? []).slice(0, 2).map(a => ({ title: a.title?.substring(0, 20), has_supported: a.has_supported }))));
      return (res.actions ?? []).map(mapAction);
    },
    staleTime: 30_000,
  });
}

export function useAction(actionId: string) {
  return useQuery({
    queryKey: ['actions', actionId],
    queryFn: async () => {
      const res = await api.get<{
        action: RawAction;
        evidence: RawEvidence[];
        responses: RawResponse[];
        verifications: RawVerification[];
      }>(`/api/v1/actions/${actionId}`);
      return {
        action: mapAction(res.action),
        evidence: (res.evidence ?? []).map(mapEvidence),
        responses: (res.responses ?? []).map(mapResponse),
        verifications: (res.verifications ?? []).map(mapVerification),
      };
    },
    staleTime: 30_000,
    enabled: !!actionId,
  });
}

export function useActionTimeline(actionId: string) {
  return useQuery({
    queryKey: ['actions', actionId, 'timeline'],
    queryFn: async () => {
      const res = await api.get<{ timeline: RawTimelineEntry[] }>(
        `/api/v1/actions/${actionId}/timeline`,
      );
      return (res.timeline ?? []).map(mapTimelineEntry);
    },
    staleTime: 15_000,
    enabled: !!actionId,
  });
}

export function useTrendingActions() {
  return useQuery({
    queryKey: ['actions', 'trending'],
    queryFn: async () => {
      const res = await api.get<{ actions: RawAction[]; count: number }>(
        '/api/v1/actions/trending',
      );
      return (res.actions ?? []).map(mapAction);
    },
    staleTime: 60_000,
  });
}

// ---------- Mutation Hooks ----------

export function useSupportAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ actionId, support }: { actionId: string; support: boolean }) => {
      if (support) {
        return api.post(`/api/v1/actions/${actionId}/support`);
      }
      return api.delete(`/api/v1/actions/${actionId}/support`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actions', variables.actionId] });
    },
  });
}

export function useCreateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      desiredOutcome: string;
      targetAuthorityId: string;
      linkedIssueIds: string[];
      patternId?: string;
    }) =>
      api.post<{ action: RawAction }>('/api/v1/actions', {
        title: data.title,
        description: data.description,
        desired_outcome: data.desiredOutcome,
        target_authority_id: data.targetAuthorityId,
        linked_issue_ids: data.linkedIssueIds,
        pattern_id: data.patternId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}

export function useVerifyAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { actionId: string; verified: boolean; photoUris?: string[] }) =>
      api.post(`/api/v1/actions/${data.actionId}/verify`, {
        verified: data.verified,
        photo_evidence_urls: data.photoUris ?? [],
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actions', variables.actionId] });
    },
  });
}
