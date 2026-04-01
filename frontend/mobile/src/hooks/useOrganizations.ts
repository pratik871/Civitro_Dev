import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ---------- TypeScript interfaces (camelCase) ----------

export type OrgType = 'political_party' | 'ngo' | 'rwa' | 'club';
export type MemberRole = 'admin' | 'functionary' | 'member';

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  logoUrl: string;
  description: string;
  hierarchyLevels: number;
  subscriptionTier: string;
  createdAt: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: MemberRole;
  level: number;
  permissions: string[];
  joinedAt: string;
  // Optional enriched fields (may come from joined user data)
  userName?: string;
  userAvatar?: string;
}

export interface Broadcast {
  id: string;
  orgId: string;
  senderId: string;
  text: string;
  mediaUrl: string;
  targetLevel: number;
  readCount: number;
  totalCount: number;
  createdAt: string;
  senderName?: string;
}

export interface OrgAnalytics {
  orgId: string;
  totalMembers: number;
  activeMembers: number;
  totalBroadcasts: number;
  avgReadRate: number;
  membersByRole: Record<string, number>;
  membersByLevel: Record<string, number>;
}

export interface MemberList {
  members: OrgMember[];
  page: number;
  limit: number;
  totalCount: number;
}

export interface BroadcastList {
  broadcasts: Broadcast[];
  page: number;
  limit: number;
  totalCount: number;
}

// ---------- Raw backend shapes (snake_case) ----------

interface RawOrganization {
  id: string;
  name: string;
  type: OrgType;
  logo_url: string;
  description: string;
  hierarchy_levels: number;
  subscription_tier: string;
  created_at: string;
}

interface RawOrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: MemberRole;
  level: number;
  permissions: string[];
  joined_at: string;
  user_name?: string;
  user_avatar?: string;
}

interface RawBroadcast {
  id: string;
  org_id: string;
  sender_id: string;
  text: string;
  media_url: string;
  target_level: number;
  read_count: number;
  total_count: number;
  created_at: string;
  sender_name?: string;
}

interface RawMemberList {
  members: RawOrgMember[];
  page: number;
  limit: number;
  total_count: number;
}

interface RawBroadcastList {
  broadcasts: RawBroadcast[];
  page: number;
  limit: number;
  total_count: number;
}

interface RawAnalytics {
  org_id: string;
  total_members: number;
  active_members: number;
  total_broadcasts: number;
  avg_read_rate: number;
  members_by_role: Record<string, number>;
  members_by_level: Record<string, number>;
}

// ---------- Mappers ----------

function mapOrg(raw: RawOrganization): Organization {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    logoUrl: raw.logo_url,
    description: raw.description,
    hierarchyLevels: raw.hierarchy_levels,
    subscriptionTier: raw.subscription_tier,
    createdAt: raw.created_at,
  };
}

function mapMember(raw: RawOrgMember): OrgMember {
  return {
    id: raw.id,
    orgId: raw.org_id,
    userId: raw.user_id,
    role: raw.role,
    level: raw.level,
    permissions: raw.permissions ?? [],
    joinedAt: raw.joined_at,
    userName: raw.user_name,
    userAvatar: raw.user_avatar,
  };
}

function mapBroadcast(raw: RawBroadcast): Broadcast {
  return {
    id: raw.id,
    orgId: raw.org_id,
    senderId: raw.sender_id,
    text: raw.text,
    mediaUrl: raw.media_url,
    targetLevel: raw.target_level,
    readCount: raw.read_count,
    totalCount: raw.total_count,
    createdAt: raw.created_at,
    senderName: raw.sender_name,
  };
}

function mapAnalytics(raw: RawAnalytics): OrgAnalytics {
  return {
    orgId: raw.org_id,
    totalMembers: raw.total_members,
    activeMembers: raw.active_members,
    totalBroadcasts: raw.total_broadcasts,
    avgReadRate: raw.avg_read_rate,
    membersByRole: raw.members_by_role ?? {},
    membersByLevel: raw.members_by_level ?? {},
  };
}

// ---------- API prefix ----------
// nginx routes /api/v1/party -> party service
// The party handler registers routes at /orgs, /orgs/:id, etc.
const BASE = '/api/v1/party/orgs';

// ---------- Query Hooks ----------

/**
 * Fetch the current user's organizations.
 * The backend doesn't have a dedicated my-orgs endpoint yet,
 * so we hit GET /orgs which returns orgs the authenticated user belongs to.
 */
export function useMyOrganizations() {
  return useQuery({
    queryKey: ['organizations', 'mine'],
    queryFn: async () => {
      const res = await api.get<
        RawOrganization[] | { organizations: RawOrganization[] }
      >(BASE);
      // Handle both array and wrapped response
      const raw = Array.isArray(res)
        ? res
        : (res as { organizations: RawOrganization[] }).organizations ?? [];
      return raw.map(mapOrg);
    },
    staleTime: 60_000,
  });
}

/**
 * Fetch a single organization by ID.
 */
export function useOrganization(orgId: string) {
  return useQuery({
    queryKey: ['organizations', orgId],
    queryFn: async () => {
      const raw = await api.get<RawOrganization>(`${BASE}/${orgId}`);
      return mapOrg(raw);
    },
    staleTime: 60_000,
    enabled: !!orgId,
  });
}

/**
 * Fetch members of an organization.
 */
export function useOrgMembers(orgId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['organizations', orgId, 'members', page],
    queryFn: async () => {
      const raw = await api.get<RawMemberList>(
        `${BASE}/${orgId}/members?page=${page}&limit=${limit}`,
      );
      return {
        members: (raw.members ?? []).map(mapMember),
        page: raw.page,
        limit: raw.limit,
        totalCount: raw.total_count,
      } as MemberList;
    },
    staleTime: 30_000,
    enabled: !!orgId,
  });
}

/**
 * Fetch broadcasts for an organization.
 */
export function useBroadcasts(orgId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['organizations', orgId, 'broadcasts', page],
    queryFn: async () => {
      const raw = await api.get<RawBroadcastList>(
        `${BASE}/${orgId}/broadcasts?page=${page}&limit=${limit}`,
      );
      return {
        broadcasts: (raw.broadcasts ?? []).map(mapBroadcast),
        page: raw.page,
        limit: raw.limit,
        totalCount: raw.total_count,
      } as BroadcastList;
    },
    staleTime: 30_000,
    enabled: !!orgId,
  });
}

/**
 * Fetch analytics for an organization.
 */
export function useOrgAnalytics(orgId: string) {
  return useQuery({
    queryKey: ['organizations', orgId, 'analytics'],
    queryFn: async () => {
      const raw = await api.get<RawAnalytics>(`${BASE}/${orgId}/analytics`);
      return mapAnalytics(raw);
    },
    staleTime: 60_000,
    enabled: !!orgId,
  });
}

// ---------- Mutation Hooks ----------

/**
 * Create a new organization.
 */
export function useCreateOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      type: OrgType;
      description?: string;
      logoUrl?: string;
      hierarchyLevels?: number;
    }) =>
      api.post<RawOrganization>(BASE, {
        name: data.name,
        type: data.type,
        description: data.description || '',
        logo_url: data.logoUrl || '',
        hierarchy_levels: data.hierarchyLevels || 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

/**
 * Add a member to an organization.
 */
export function useAddMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      orgId: string;
      userId: string;
      role: MemberRole;
      level?: number;
      permissions?: string[];
    }) =>
      api.post<RawOrgMember>(`${BASE}/${data.orgId}/members`, {
        user_id: data.userId,
        role: data.role,
        level: data.level || 0,
        permissions: data.permissions || [],
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', variables.orgId, 'members'],
      });
      queryClient.invalidateQueries({
        queryKey: ['organizations', variables.orgId, 'analytics'],
      });
    },
  });
}

/**
 * Remove a member from an organization.
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { orgId: string; userId: string }) =>
      api.delete(`${BASE}/${data.orgId}/members/${data.userId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', variables.orgId, 'members'],
      });
      queryClient.invalidateQueries({
        queryKey: ['organizations', variables.orgId, 'analytics'],
      });
    },
  });
}

/**
 * Update a member's role.
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      orgId: string;
      userId: string;
      role: MemberRole;
      level?: number;
      permissions?: string[];
    }) =>
      api.put(`${BASE}/${data.orgId}/members/${data.userId}/role`, {
        role: data.role,
        level: data.level || 0,
        permissions: data.permissions || [],
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', variables.orgId, 'members'],
      });
    },
  });
}

/**
 * Send a broadcast to organization members.
 */
export function useSendBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      orgId: string;
      text: string;
      mediaUrl?: string;
      targetLevel?: number;
    }) =>
      api.post<RawBroadcast>(`${BASE}/${data.orgId}/broadcast`, {
        text: data.text,
        media_url: data.mediaUrl || '',
        target_level: data.targetLevel || 0,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', variables.orgId, 'broadcasts'],
      });
    },
  });
}
