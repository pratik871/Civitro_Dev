import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { mediaUrl } from '../lib/api';
import type { Issue } from '../types/issue';

/** Raw issue shape returned by the Go backend (snake_case JSON). */
interface RawIssue {
  id: string;
  user_id: string;
  text: string;
  photo_urls: string[] | null;
  gps_lat: number;
  gps_lng: number;
  category: Issue['category'];
  severity: string;
  status: Issue['status'];
  assigned_to?: string;
  boundary_id?: string;
  upvotes_count: number;
  comment_count: number;
  has_upvoted: boolean;
  created_at: string;
  updated_at: string;
}

/** Map a backend issue to the frontend Issue type. */
function mapIssue(raw: RawIssue): Issue {
  return {
    id: raw.id,
    title: raw.text,
    description: '',
    category: raw.category,
    status: raw.status,
    priority: (raw.severity || 'medium') as Issue['priority'],
    photoUrl: mediaUrl(raw.photo_urls?.[0]),
    latitude: raw.gps_lat,
    longitude: raw.gps_lng,
    address: `${(raw.gps_lat ?? 0).toFixed(4)}, ${(raw.gps_lng ?? 0).toFixed(4)}`,
    ward: '',
    constituency: '',
    department: '',
    reportedBy: raw.user_id,
    reportedByName: '',
    assignedTo: raw.assigned_to || undefined,
    upvotes: raw.upvotes_count,
    commentCount: raw.comment_count ?? 0,
    hasUpvoted: raw.has_upvoted ?? false,
    ledger: [],
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function useIssues() {
  return useQuery({
    queryKey: ['issues'],
    queryFn: async () => {
      const res = await api.get<{ issues: RawIssue[]; count: number }>('/api/v1/issues');
      return (res.issues ?? []).map(mapIssue);
    },
    staleTime: 30_000,
  });
}

export function useIssue(issueId: string) {
  return useQuery({
    queryKey: ['issues', issueId],
    queryFn: async () => {
      const res = await api.get<{ issue: RawIssue }>(`/api/v1/issues/${issueId}`);
      return mapIssue(res.issue);
    },
    staleTime: 30_000,
    enabled: !!issueId,
  });
}

export function useNearbyIssues(lat?: number, lng?: number) {
  return useQuery({
    queryKey: ['issues', 'nearby', lat, lng],
    queryFn: async () => {
      const res = await api.get<{ issues: RawIssue[]; count: number }>(`/api/v1/issues/nearby?lat=${lat}&lng=${lng}`);
      return (res.issues ?? []).map(mapIssue);
    },
    enabled: !!lat && !!lng,
    staleTime: 60_000,
  });
}

export function useUpvoteIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (issueId: string) =>
      api.post(`/api/v1/issues/${issueId}/upvote`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<{ issue: RawIssue }>('/api/v1/issues', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
  });
}

export interface Comment {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  parent_id: string;
  content: string;
  likes_count: number;
  has_liked: boolean;
  created_at: string;
}

export function useComments(issueId: string) {
  return useQuery({
    queryKey: ['comments', issueId],
    queryFn: async () => {
      const res = await api.get<{ comments: Comment[]; count: number }>(`/api/v1/issues/${issueId}/comments`);
      return res.comments ?? [];
    },
    enabled: !!issueId,
    staleTime: 15_000,
  });
}

export function useCreateComment(issueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; parentId?: string }) =>
      api.post<{ comment: Comment }>(`/api/v1/issues/${issueId}/comments`, {
        content: data.content,
        parent_id: data.parentId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', issueId] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
  });
}

export function useLikeComment(issueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      api.post(`/api/v1/issues/${issueId}/comments/${commentId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', issueId] });
    },
  });
}
