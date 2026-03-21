import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';

import { Avatar } from '../../components/ui/Avatar';
import {
  useConversation,
  useSendMessage,
  useCreateConversation,
  type ChatMessage,
} from '../../hooks/useMessages';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------
type ChatNavProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;
type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SAFFRON = '#FF6B35';
const SAFFRON_DARK = '#E55A2B';

function formatMessageTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return time;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Yesterday ${time}`;

  return `${date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })} ${time}`;
}

// ---------------------------------------------------------------------------
// Message Bubble
// ---------------------------------------------------------------------------
interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMine }) => (
  <View
    style={[
      styles.bubbleRow,
      isMine ? styles.bubbleRowRight : styles.bubbleRowLeft,
    ]}
  >
    <View
      style={[
        styles.bubble,
        isMine ? styles.bubbleSent : styles.bubbleReceived,
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          isMine ? styles.bubbleTextSent : styles.bubbleTextReceived,
        ]}
      >
        {message.text}
      </Text>
      <Text
        style={[
          styles.bubbleTime,
          isMine ? styles.bubbleTimeSent : styles.bubbleTimeReceived,
        ]}
      >
        {formatMessageTime(message.created_at)}
      </Text>
    </View>
  </View>
);

// ---------------------------------------------------------------------------
// Main ChatScreen
// ---------------------------------------------------------------------------
export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<ChatNavProp>();
  const route = useRoute<ChatRouteProp>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const { conversationId: initialConvId, recipientId, recipientName } = route.params;

  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConvId,
  );
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Hooks
  const {
    data: messages,
    isLoading: messagesLoading,
  } = useConversation(conversationId);

  const sendMessageMutation = useSendMessage();
  const createConversationMutation = useCreateConversation();

  // If we have a recipientId but no conversationId, create/find the conversation
  useEffect(() => {
    if (!conversationId && recipientId) {
      createConversationMutation.mutate(
        { recipientId },
        {
          onSuccess: (data) => {
            setConversationId(data.id);
          },
        },
      );
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inverted FlatList means data is reversed (newest at index 0)
  const sortedMessages = React.useMemo(() => {
    if (!messages) return [];
    return [...messages].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    if (!conversationId) {
      // If conversation still hasn't been created, try again
      if (recipientId) {
        createConversationMutation.mutate(
          { recipientId },
          {
            onSuccess: (data) => {
              const convId = data.id || (data as any).conversation_id;
              setConversationId(convId);
              sendMessageMutation.mutate({
                conversationId: convId,
                text,
              });
              setInputText('');
            },
            onError: (err: any) => {
              console.error('Create conversation failed:', err?.message || err);
            },
          },
        );
      }
      return;
    }

    sendMessageMutation.mutate(
      { conversationId, text },
      {
        onSuccess: () => setInputText(''),
        onError: (err: any) => {
          console.error('Send message failed:', err?.message || err);
        },
      },
    );
    setInputText('');
  }, [
    inputText,
    conversationId,
    recipientId,
    sendMessageMutation,
    createConversationMutation,
  ]);

  const isInitializing =
    !conversationId && createConversationMutation.isPending;

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble message={item} isMine={item.sender_id === user?.id} />
    ),
    [user?.id],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* ============================================================== */}
      {/* HEADER                                                         */}
      {/* ============================================================== */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
            <Path
              d="M15 18l-6-6 6-6"
              stroke={colors.textPrimary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        <Avatar
          name={recipientName || 'Unknown'}
          size={36}
          backgroundColor={colors.primary}
        />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {recipientName || 'Conversation'}
          </Text>
          <Text style={styles.headerSubtitle}>Ward Corporator</Text>
        </View>
      </View>

      {/* ============================================================== */}
      {/* MESSAGES LIST                                                   */}
      {/* ============================================================== */}
      {isInitializing || messagesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={sortedMessages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Start the conversation {'\u2014'} your representative will see
                your message
              </Text>
            </View>
          }
        />
      )}

      {/* ============================================================== */}
      {/* INPUT BAR                                                       */}
      {/* ============================================================== */}
      <View
        style={[
          styles.inputBar,
          { paddingBottom: Math.max(insets.bottom, spacing.sm) },
        ]}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          activeOpacity={0.7}
          disabled={!inputText.trim() || sendMessageMutation.isPending}
        >
          {sendMessageMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
              <Path
                d="M22 2L11 13"
                stroke={colors.white}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                stroke={colors.white}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
  },

  // Messages list
  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  // Bubble
  bubbleRow: {
    marginBottom: spacing.sm,
    maxWidth: '80%',
  },
  bubbleRowRight: {
    alignSelf: 'flex-end',
  },
  bubbleRowLeft: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
  },
  bubbleSent: {
    backgroundColor: SAFFRON,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextSent: {
    color: colors.white,
  },
  bubbleTextReceived: {
    color: colors.textPrimary,
  },
  bubbleTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeSent: {
    color: 'rgba(255,255,255,0.7)',
  },
  bubbleTimeReceived: {
    color: colors.textMuted,
  },

  // Empty state (inverted FlatList flips content, so it appears at bottom)
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing['2xl'],
    // Inverted list: transform is flipped, so we counter-flip
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : 0,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SAFFRON,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
