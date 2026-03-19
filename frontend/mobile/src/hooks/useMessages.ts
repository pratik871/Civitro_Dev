import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface Conversation {
  conversation_id: string;
  other_user_name: string;
  other_user_role: string;
  last_message: string;
  unread_count: number;
  online: boolean;
}

interface Message {
  id: string;
  sender_name: string;
  sender_role: string;
  preview: string;
  unread: boolean;
  created_at: string;
}

export function useMessages() {
  return useQuery({
    queryKey: ['messages'],
    queryFn: async (): Promise<Message[]> => {
      const res = await api.get<{ conversations: Conversation[] }>('/api/v1/conversations');
      const conversations = (res as any).conversations ?? res ?? [];
      return (Array.isArray(conversations) ? conversations : []).map(
        (c: Conversation): Message => ({
          id: c.conversation_id,
          sender_name: c.other_user_name,
          sender_role: c.other_user_role,
          preview: c.last_message,
          unread: c.unread_count > 0,
          created_at: '',
        }),
      );
    },
    staleTime: 15_000,
  });
}
