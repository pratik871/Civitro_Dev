// ---------------------------------------------------------------------------
// Messaging API functions — messaging service (port 8014)
// ---------------------------------------------------------------------------

import type { ApiClient } from './index';
import type {
  Conversation,
  Message,
  ConversationPreview,
  SendMessageRequest,
  CreateConversationRequest,
} from '../types';
import { MESSAGES } from './endpoints';

/** Create messaging API functions bound to the given client. */
export function createMessagesApi(client: ApiClient) {
  return {
    /** Send a message in an existing conversation. */
    send(data: SendMessageRequest): Promise<Message> {
      return client.post<Message>(MESSAGES.SEND, data);
    },

    /** Get messages for a conversation with optional cursor-based pagination. */
    getMessages(conversationId: string, params?: {
      cursor?: string;
    }): Promise<{ conversationId: string; messages: Message[] }> {
      return client.get<{ conversationId: string; messages: Message[] }>(
        MESSAGES.GET_MESSAGES(conversationId),
        { cursor: params?.cursor },
      );
    },

    /** List all conversations for a user (returns preview summaries). */
    listConversations(userId: string): Promise<{ conversations: ConversationPreview[] }> {
      return client.get<{ conversations: ConversationPreview[] }>(
        MESSAGES.LIST_CONVERSATIONS,
        { user_id: userId },
      );
    },

    /** Create a new DM or group conversation. */
    createConversation(data: CreateConversationRequest): Promise<Conversation> {
      return client.post<Conversation>(MESSAGES.CREATE_CONVERSATION, data);
    },

    /**
     * Get the WebSocket URL for real-time messaging.
     * Use this to construct the full WS connection URL.
     */
    getWebSocketUrl(baseWsUrl: string, userId: string): string {
      return `${baseWsUrl}${MESSAGES.WEBSOCKET}?user_id=${encodeURIComponent(userId)}`;
    },
  };
}
