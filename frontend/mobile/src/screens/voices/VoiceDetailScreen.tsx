import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime, formatNumber } from '../../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useVoice, useLikeVoice, useShareVoice } from '../../hooks/useVoices';
import api from '../../lib/api';
import type { RootStackParamList } from '../../navigation/types';

type DetailRouteProp = RouteProp<RootStackParamList, 'VoiceDetail'>;

export const VoiceDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation();
  const { voiceId } = route.params;

  const { data: voice, isLoading, refetch } = useVoice(voiceId);
  const likeMutation = useLikeVoice();
  const shareMutation = useShareVoice();

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  // Fetch comments
  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['voice-comments', voiceId],
    queryFn: async () => {
      const res = await api.get<{ comments: any[] }>(`/api/v1/voices/${voiceId}/comments`);
      return res.comments ?? [];
    },
    enabled: !!voiceId,
  });

  const upvoted = voice?.hasUpvoted ?? false;
  const commentsList = commentsData ?? [];

  const handleUpvote = () => {
    likeMutation.mutate(voiceId, { onSuccess: () => refetch() });
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    const endpoint = replyTo
      ? `/api/v1/voices/${voiceId}/comments/${replyTo.id}/reply`
      : `/api/v1/voices/${voiceId}/comment`;
    api.post(endpoint, { text: commentText.trim() })
      .then(() => { setCommentText(''); setReplyTo(null); refetchComments(); refetch(); })
      .catch(() => Alert.alert('Error', 'Could not post comment'));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Community Voice',
        message: voice
          ? `"${voice.text}"\n\nhttps://civitro.com/share/voice/${voiceId}`
          : 'Check out this community voice on Civitro!',
      });
      shareMutation.mutate(voiceId);
    } catch {
      // user cancelled
    }
  };

  if (isLoading || !voice) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const tags = voice.tags ?? voice.hashtags ?? [];
  const likes = voice.likesCount ?? voice.upvotes ?? 0;
  const shares = voice.sharesCount ?? 0;
  const text = voice.text ?? voice.content ?? '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Voice</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Voice Content Card */}
      <Card style={styles.voiceCard}>
        {/* User info */}
        <View style={styles.userRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>C</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Citizen</Text>
            <Text style={styles.timeText}>{formatRelativeTime(voice.createdAt)}</Text>
          </View>
        </View>

        {/* Voice text */}
        <Text style={styles.voiceText}>{text}</Text>

        {/* Hashtags */}
        {tags.length > 0 && (
          <View style={styles.hashtagsRow}>
            {tags.map((tag, idx) => (
              <View key={idx} style={styles.hashtagPill}>
                <Text style={styles.hashtagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Action Bar */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, upvoted && styles.actionButtonUpvoted]}
          onPress={handleUpvote}
          disabled={likeMutation.isPending}
        >
          <Svg viewBox="0 0 16 16" width={18} height={18} fill="none">
            {upvoted ? (
              <Path d="M8 2l5 6H9v6H7V8H3l5-6z" fill="#FF6B35" />
            ) : (
              <Path d="M8 3v10M5 6l3-3 3 3" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            )}
          </Svg>
          <Text style={[styles.actionText, upvoted && styles.actionTextUpvoted]}>
            {upvoted ? 'Upvoted' : 'Upvote'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          disabled={shareMutation.isPending}
        >
          <Text style={styles.actionIcon}>{'\u{1F4E4}'}</Text>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <Card style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{formatNumber(likes)}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{formatNumber(shares)}</Text>
            <Text style={styles.statLabel}>Shares</Text>
          </View>
        </View>
      </Card>

      {/* Comments Section */}
      <View style={styles.commentsSection}>
        <Text style={styles.commentsTitle}>Comments ({commentsList.length})</Text>

        {/* Reply indicator */}
        {replyTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyIndicatorText}>
              Replying to <Text style={styles.replyName}>{replyTo.name}</Text>
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={styles.replyCancelText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Comment Input */}
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            style={[styles.commentSendBtn, !commentText.trim() && { opacity: 0.4 }]}
            onPress={handleComment}
            disabled={!commentText.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.commentSendText}>Post</Text>
          </TouchableOpacity>
        </View>

        {/* Comments list */}
        {commentsList.length === 0 ? (
          <Text style={styles.noComments}>No comments yet. Be the first!</Text>
        ) : (
          commentsList.filter((c: any) => !c.parent_id).map((c: any) => (
            <View key={c.id}>
              <View style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{(c.user_name || 'C').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUserName}>{c.user_name || 'Citizen'}</Text>
                    <Text style={styles.commentTime}>{formatRelativeTime(c.created_at)}</Text>
                  </View>
                  <Text style={styles.commentContent}>{c.content}</Text>
                  <View style={styles.commentActions}>
                    <TouchableOpacity
                      style={styles.commentActionBtn}
                      onPress={() => {
                        api.post(`/api/v1/voices/${voiceId}/comments/${c.id}/upvote`).then(() => refetchComments());
                      }}
                    >
                      <Svg viewBox="0 0 12 12" width={12} height={12} fill="none">
                        <Path d="M6 2v8M4 4l2-2 2 2" stroke={(c.upvotes_count || 0) > 0 ? '#FF6B35' : '#9CA3AF'} strokeWidth={1.5} strokeLinecap="round" />
                      </Svg>
                      <Text style={[styles.commentActionText, (c.upvotes_count || 0) > 0 && { color: '#FF6B35' }]}>{c.upvotes_count || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.commentActionBtn}
                      onPress={() => setReplyTo({ id: c.id, name: c.user_name || 'Citizen' })}
                    >
                      <Text style={styles.commentActionText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              {/* Replies */}
              {commentsList.filter((r: any) => r.parent_id === c.id).map((reply: any) => (
                <View key={reply.id} style={[styles.commentItem, { marginLeft: 42 }]}>
                  <View style={[styles.commentAvatar, { width: 26, height: 26, borderRadius: 13 }]}>
                    <Text style={[styles.commentAvatarText, { fontSize: 11 }]}>{(reply.user_name || 'C').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUserName}>{reply.user_name || 'Citizen'}</Text>
                      <Text style={styles.commentTime}>{formatRelativeTime(reply.created_at)}</Text>
                    </View>
                    <Text style={styles.commentContent}>{reply.content}</Text>
                    <View style={styles.commentActions}>
                      <TouchableOpacity
                        style={styles.commentActionBtn}
                        onPress={() => {
                          api.post(`/api/v1/voices/${voiceId}/comments/${reply.id}/upvote`).then(() => refetchComments());
                        }}
                      >
                        <Svg viewBox="0 0 12 12" width={12} height={12} fill="none">
                          <Path d="M6 2v8M4 4l2-2 2 2" stroke={(reply.upvotes_count || 0) > 0 ? '#FF6B35' : '#9CA3AF'} strokeWidth={1.5} strokeLinecap="round" />
                        </Svg>
                        <Text style={[styles.commentActionText, (reply.upvotes_count || 0) > 0 && { color: '#FF6B35' }]}>{reply.upvotes_count || 0}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.commentActionBtn}
                        onPress={() => setReplyTo({ id: c.id, name: reply.user_name || 'Citizen' })}
                      >
                        <Text style={styles.commentActionText}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: colors.textPrimary,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  voiceCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  voiceText: {
    fontSize: 17,
    color: colors.textPrimary,
    lineHeight: 26,
    marginBottom: spacing.md,
  },
  hashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hashtagPill: {
    backgroundColor: colors.primary + '12',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  hashtagText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundGray,
  },
  actionButtonActive: {
    backgroundColor: colors.primary + '12',
  },
  actionButtonUpvoted: {
    backgroundColor: '#FFF3ED',
    borderColor: '#FF6B35',
    borderWidth: 1,
  },
  actionTextUpvoted: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  actionIcon: {
    fontSize: 14,
    color: colors.textMuted,
  },
  actionIconActive: {
    color: colors.primary,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  actionTextActive: {
    color: colors.primary,
  },
  statsCard: {
    marginHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statCount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderLight,
  },
  commentsSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    maxHeight: 80,
  },
  commentSendBtn: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  commentSendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noComments: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35' + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  commentUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  commentTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  commentContent: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3ED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyIndicatorText: {
    fontSize: 12,
    color: '#6B7280',
  },
  replyName: {
    fontWeight: '700',
    color: '#FF6B35',
  },
  replyCancelText: {
    fontSize: 14,
    color: '#9CA3AF',
    padding: 4,
  },
});
