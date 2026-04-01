import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationPreview {
  conversation_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  media_url?: string;
  created_at: string;
}

interface ConversationResponse {
  conversations: ConversationPreview[];
}

interface MessagesResponse {
  conversation_id: string;
  messages: ChatMessage[];
}

interface CreateConversationResponse {
  id: string;
  type: string;
  participants: string[];
  created_at: string;
}

// ---------------------------------------------------------------------------
// Legacy hook (used by the original MessagesScreen shape)
// ---------------------------------------------------------------------------

interface LegacyMessage {
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
    queryFn: async (): Promise<LegacyMessage[]> => {
      const res = await api.get<ConversationResponse>('/api/v1/conversations');
      const conversations = (res as any).conversations ?? res ?? [];
      return (Array.isArray(conversations) ? conversations : []).map(
        (c: ConversationPreview): LegacyMessage => ({
          id: c.conversation_id,
          sender_name: c.other_user_name,
          sender_role: c.other_user_role,
          preview: c.last_message,
          unread: c.unread_count > 0,
          created_at: c.last_message_at || '',
        }),
      );
    },
    staleTime: 15_000,
  });
}

// ---------------------------------------------------------------------------
// Conversations list
// ---------------------------------------------------------------------------

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async (): Promise<ConversationPreview[]> => {
      const res = await api.get<ConversationResponse>('/api/v1/conversations');
      const conversations = (res as any).conversations ?? res ?? [];
      return Array.isArray(conversations) ? conversations : [];
    },
    staleTime: 15_000,
  });
}

// ---------------------------------------------------------------------------
// Messages in a conversation
// ---------------------------------------------------------------------------

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!conversationId) return [];
      const res = await api.get<MessagesResponse>(
        `/api/v1/messages/${conversationId}`,
      );
      const messages = (res as any).messages ?? res ?? [];
      return Array.isArray(messages) ? messages : [];
    },
    enabled: !!conversationId,
    staleTime: 5_000,
    refetchInterval: 10_000, // poll for new messages
  });
}

// ---------------------------------------------------------------------------
// Send a message
// ---------------------------------------------------------------------------

export function useSendMessage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      conversationId,
      text,
    }: {
      conversationId: string;
      text: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const res = await api.post<ChatMessage>('/api/v1/messages', {
        conversation_id: conversationId,
        sender_id: user.id,
        text,
      });
      return res;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['conversation', variables.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Create or find a conversation with a specific user
// ---------------------------------------------------------------------------

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ recipientId }: { recipientId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const res = await api.post<CreateConversationResponse>(
        '/api/v1/conversations',
        {
          type: 'dm',
          participants: [user.id, recipientId],
        },
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
