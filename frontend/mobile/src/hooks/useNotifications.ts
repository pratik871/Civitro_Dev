import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const userId = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => api.get<Notification[]>(`/api/v1/notifications/users/${userId}`),
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
