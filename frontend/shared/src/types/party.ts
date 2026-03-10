// ---------------------------------------------------------------------------
// Party / organization types — mirrors backend party model
// ---------------------------------------------------------------------------

/** Organization type. */
export type OrgType = 'political_party' | 'ngo' | 'rwa' | 'club';

/** Member role within an organization. */
export type PartyRole = 'admin' | 'functionary' | 'member';

/** A political party, NGO, RWA, or club. */
export interface Party {
  id: string;
  name: string;
  type: OrgType;
  logoUrl?: string;
  description?: string;
  /** Number of hierarchy levels within the organization. */
  hierarchyLevels: number;
  subscriptionTier: string;
  createdAt: string;
}

/** A member of an organization. */
export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: PartyRole;
  /** Hierarchy level within the organization (0 = top). */
  level: number;
  permissions?: string[];
  joinedAt: string;
}

/** A node in the organization hierarchy tree (for rendering org charts). */
export interface OrgNode {
  id: string;
  orgId: string;
  level: number;
  role: PartyRole;
  userId: string;
  userName?: string;
  children?: OrgNode[];
}

/** A broadcast message sent within an organization. */
export interface Broadcast {
  id: string;
  orgId: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  /** Target hierarchy level for the broadcast. */
  targetLevel: number;
  readCount: number;
  totalCount: number;
  createdAt: string;
}

/** Analytics data for an organization. */
export interface OrgAnalytics {
  orgId: string;
  totalMembers: number;
  activeMembers: number;
  totalBroadcasts: number;
  avgReadRate: number;
  membersByRole: Record<string, number>;
  membersByLevel: Record<number, number>;
}

// ---- Request DTOs ----

export interface CreateOrgRequest {
  name: string;
  type: OrgType;
  logoUrl?: string;
  description?: string;
  hierarchyLevels?: number;
  subscriptionTier?: string;
}

export interface AddMemberRequest {
  userId: string;
  role: PartyRole;
  level?: number;
  permissions?: string[];
}

export interface UpdateRoleRequest {
  role: PartyRole;
  level?: number;
  permissions?: string[];
}

export interface BroadcastRequest {
  text: string;
  mediaUrl?: string;
  targetLevel?: number;
}
