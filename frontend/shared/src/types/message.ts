// ---------------------------------------------------------------------------
// Messaging types — mirrors backend messaging model
// ---------------------------------------------------------------------------

/** The kind of conversation thread. */
export type ConversationType = 'dm' | 'group' | 'broadcast';

/** WebSocket message event types. */
export type MessageType = 'message' | 'typing' | 'read' | 'online';

/** A messaging thread between participants. */
export interface Conversation {
  id: string;
  type: ConversationType;
  participants: string[];
  createdAt: string;
}

/** A single message within a conversation. */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  readBy: string[];
  createdAt: string;
}

/** Summary view of a conversation for list screens. */
export interface ConversationPreview {
  conversationId: string;
  otherUserName: string;
  otherUserRole: string;
  lastMessage: string;
  unreadCount: number;
  online: boolean;
}

/** Envelope for messages sent over WebSocket. */
export interface WebSocketMessage {
  type: MessageType;
  payload: unknown;
}

// ---- Request DTOs ----

export interface SendMessageRequest {
  conversationId: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
}

export interface CreateConversationRequest {
  type: ConversationType;
  /** At least 2 participant user IDs. */
  participants: string[];
}
