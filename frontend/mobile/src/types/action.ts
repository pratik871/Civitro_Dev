import type { IssueCategory } from './issue';

export type ActionStatus =
  | 'draft'
  | 'open'
  | 'acknowledged'
  | 'committed'
  | 'in_progress'
  | 'resolved'
  | 'verified'
  | 'archived';

export type EscalationLevel =
  | 'ward'
  | 'mla'
  | 'mp'
  | 'city'
  | 'state';

export type ResponseType =
  | 'acknowledge'
  | 'respond'
  | 'commit'
  | 'reject'
  | 'update'
  | 'resolve';

export type EscalationReason =
  | 'no_response_7d'
  | 'no_response_14d'
  | 'rejection_appealed'
  | 'manual';

export interface CommunityAction {
  id: string;
  creatorId: string;
  creatorName: string;
  wardId: string;
  wardName: string;
  title: string;
  description: string;
  desiredOutcome: string;
  targetAuthorityId: string;
  targetAuthorityName: string;
  escalationLevel: EscalationLevel;
  status: ActionStatus;
  supportCount: number;
  supportGoal: number;
  evidenceCount: number;
  category: IssueCategory;
  economicImpact: EconomicImpact | null;
  patternId: string | null;
  hasSupported: boolean;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  verifiedAt: string | null;
}

export interface EconomicImpact {
  costOfInaction: number;
  costOfResolution: number;
  roiRatio: number;
  currency: string;
  methodology: string;
  comparison: string | null;
}

export interface ActionSupporter {
  id: string;
  actionId: string;
  userId: string;
  userName: string;
  civicScoreAtTime: number;
  wardVerified: boolean;
  createdAt: string;
}

export interface ActionEvidence {
  id: string;
  actionId: string;
  issueId: string;
  issueTitle: string;
  issueCategory: IssueCategory;
  issuePhotoUrl: string | null;
  issueStatus: string;
  linkedBy: string;
  linkedByName: string;
  autoLinked: boolean;
  createdAt: string;
}

export interface ActionResponse {
  id: string;
  actionId: string;
  responderId: string;
  responderName: string;
  responderRole: string;
  responseType: ResponseType;
  content: string;
  timelineDate: string | null;
  createdAt: string;
}

export interface ActionEscalation {
  id: string;
  actionId: string;
  fromLevel: EscalationLevel;
  toLevel: EscalationLevel;
  reason: EscalationReason;
  notifiedAuthorityId: string;
  notifiedAuthorityName: string;
  createdAt: string;
}

export interface ActionVerification {
  id: string;
  actionId: string;
  verifierId: string;
  verifierName: string;
  civicScoreAtTime: number;
  photoEvidenceUrls: string[];
  verified: boolean;
  createdAt: string;
}

export type TimelineEntryType =
  | 'created'
  | 'supported'
  | 'milestone'
  | 'evidence_linked'
  | 'stakeholder_notified'
  | 'acknowledged'
  | 'responded'
  | 'committed'
  | 'rejected'
  | 'updated'
  | 'escalated'
  | 'resolved'
  | 'verified'
  | 'archived';

export type TimelineActorType = 'citizen' | 'stakeholder' | 'system';

export interface ActionTimelineEntry {
  id: string;
  actionId: string;
  entryType: TimelineEntryType;
  actorType: TimelineActorType;
  actorId: string;
  actorName: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  acknowledged: 'Acknowledged',
  committed: 'Committed',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  verified: 'Verified',
  archived: 'Archived',
};

export const ACTION_STATUS_COLORS: Record<ActionStatus, string> = {
  draft: '#6B7280',
  open: '#FF6B35',
  acknowledged: '#2563EB',
  committed: '#7C3AED',
  in_progress: '#D97706',
  resolved: '#059669',
  verified: '#059669',
  archived: '#6B7280',
};

export const RESPONSE_TYPE_LABELS: Record<ResponseType, string> = {
  acknowledge: 'Acknowledged',
  respond: 'Responded',
  commit: 'Committed',
  reject: 'Rejected',
  update: 'Updated',
  resolve: 'Resolved',
};
