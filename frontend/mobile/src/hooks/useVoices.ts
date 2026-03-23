import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Voice } from '../types/voice';

interface RawVoice {
  id: string;
  user_id: string;
  text: string;
  media_urls?: string[];
  hashtags?: string[];
  mentions?: string[];
  language?: string;
  likes_count?: number;
  replies_count?: number;
  shares_count?: number;
  has_liked?: boolean;
  created_at: string;
}

function mapVoice(raw: RawVoice): Voice {
  return {
    id: raw.id,
    userId: raw.user_id,
    userName: 'Citizen',
    content: raw.text,
    text: raw.text,
    category: 'general',
    sentiment: 'neutral',
    ward: '',
    constituency: '',
    upvotes: raw.likes_count ?? 0,
    commentCount: raw.replies_count ?? 0,
    hasUpvoted: raw.has_liked ?? false,
    tags: raw.hashtags ?? [],
    hashtags: raw.hashtags ?? [],
    mediaUrls: raw.media_urls ?? [],
    language: raw.language ?? 'en',
    likesCount: raw.likes_count ?? 0,
    repliesCount: raw.replies_count ?? 0,
    sharesCount: raw.shares_count ?? 0,
    createdAt: raw.created_at,
  };
}

export function useVoices() {
  return useQuery({
    queryKey: ['voices'],
    queryFn: async (): Promise<Voice[]> => {
      const res: any = await api.get('/api/v1/voices/feed');
      const voices: RawVoice[] = res.voices ?? (Array.isArray(res) ? res : []);
      return voices.map(mapVoice);
    },
    staleTime: 30_000,
  });
}

export function useVoice(voiceId: string) {
  return useQuery({
    queryKey: ['voice', voiceId],
    queryFn: async (): Promise<Voice> => {
      const res: any = await api.get('/api/v1/voices/' + voiceId);
      const raw: RawVoice = res.voice ?? res;
      return mapVoice(raw);
    },
    staleTime: 30_000,
    enabled: Boolean(voiceId),
  });
}

export function useCreateVoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { text: string; hashtags?: string[]; language?: string }) =>
      api.post('/api/v1/voices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voices'] });
    },
  });
}

export function useLikeVoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (voiceId: string) =>
      api.post('/api/v1/voices/' + voiceId + '/like'),
    onSuccess: (_data, voiceId) => {
      queryClient.invalidateQueries({ queryKey: ['voice', voiceId] });
      queryClient.invalidateQueries({ queryKey: ['voices'] });
    },
  });
}

export function useShareVoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (voiceId: string) =>
      api.post('/api/v1/voices/' + voiceId + '/share'),
    onSuccess: (_data, voiceId) => {
      queryClient.invalidateQueries({ queryKey: ['voice', voiceId] });
    },
  });
}

export function useBookmarkVoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (voiceId: string) =>
      api.post('/api/v1/voices/' + voiceId + '/bookmark'),
    onSuccess: (_data, voiceId) => {
      queryClient.invalidateQueries({ queryKey: ['voice', voiceId] });
    },
  });
}
