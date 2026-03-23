import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: string | Record<string, any> | null;
  read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  cursor?: string;
}

export function useNotifications() {
  const userId = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const resp = await api.get<NotificationsResponse | Notification[]>(
        `/api/v1/notifications/users/${userId}`
      );
      // Handle both array and wrapped response
      if (Array.isArray(resp)) return resp;
      if (resp && 'notifications' in resp) return resp.notifications ?? [];
      return [];
    },
    staleTime: 15_000,
    enabled: !!userId,
  });
}

export function useUnreadCount() {
  const userId = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: ['notifications', 'unread', userId],
    queryFn: () => api.get<{ count: number }>(`/api/v1/notifications/users/${userId}/unread-count`),
    staleTime: 15_000,
    enabled: !!userId,
  });
}

export function useMarkAllRead() {
  const userId = useAuthStore(s => s.user?.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.put(`/api/v1/notifications/users/${userId}/read-all`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
