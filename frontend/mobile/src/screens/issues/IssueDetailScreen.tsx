import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  TextInput,
  Platform,
  Keyboard,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { TranslatedText } from '../../components/ui/TranslatedText';
import { LedgerTimeline } from '../../components/issues/LedgerTimeline';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { getCategoryColor, formatRelativeTime, formatNumber } from '../../lib/utils';
import { useIssue, useUpvoteIssue, useComments, useCreateComment, useLikeComment } from '../../hooks/useIssues';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import { ISSUE_CATEGORY_LABELS, ISSUE_STATUS_LABELS } from '../../types/issue';
import type { RootStackParamList } from '../../navigation/types';

type DetailRouteProp = RouteProp<RootStackParamList, 'IssueDetail'>;

export const IssueDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<DetailRouteProp>();
  const { data: issue, isLoading, error } = useIssue(route.params.issueId);
  const upvoteMutation = useUpvoteIssue();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [commentText, setCommentText] = useState('');
  const { data: comments } = useComments(route.params.issueId);
  const createComment = useCreateComment(route.params.issueId);
  const likeComment = useLikeComment(route.params.issueId);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const commentInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const commentsY = useRef(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Sync upvote state from backend
  useEffect(() => {
    if (issue?.hasUpvoted) setHasUpvoted(true);
  }, [issue?.hasUpvoted]);

  const confirmMutation = useMutation({
    mutationFn: (confirmed: boolean) =>
      api.post(`/api/v1/issues/${route.params.issueId}/confirm`, { confirmed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issues', route.params.issueId] });
      Alert.alert('Thank You', 'Your verification has been recorded.');
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message || 'Could not submit verification.');
    },
  });

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Failed to load issue</Text>
        <Text style={[styles.loadingText, { fontSize: 13, marginTop: 8 }]}>
          {error instanceof Error ? error.message : 'Network error'}
        </Text>
      </View>
    );
  }

  if (isLoading || !issue) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('issues.loadingIssue')}</Text>
      </View>
    );
  }

  const categoryColor = getCategoryColor(issue.category);
  const isResolved = issue.status === 'completed' || issue.status === 'citizen_verified';

  const reporterName = issue.reportedBy === currentUser?.id
    ? (currentUser?.name || 'You')
    : (issue.reportedByName || 'Citizen');

  const displayUpvotes = issue.upvotes;

  const handleUpvote = () => {
    const prev = hasUpvoted;
    setHasUpvoted(!prev);
    upvoteMutation.mutate(issue.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['issues'] });
        queryClient.invalidateQueries({ queryKey: ['issues', issue.id] });
      },
      onError: () => {
        setHasUpvoted(prev);
        Alert.alert('Error', 'Could not update upvote. Please try again.');
      },
    });
  };

  const handleShare = async () => {
    const shareUrl = `https://civitro.com/share/issue/${issue.id}`;
    try {
      await Share.share({
        title: `Issue: ${issue.title}`,
        message: `${issue.title} (${ISSUE_CATEGORY_LABELS[issue.category]}) — ${issue.address}\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // user cancelled
    }
  };

  const scrollToComments = () => {
    scrollViewRef.current?.scrollTo({ y: commentsY.current, animated: true });
  };

  const handlePostComment = () => {
    const text = commentText.trim();
    if (!text) return;
    Keyboard.dismiss();
    createComment.mutate(
      { content: text, parentId: replyTo?.id },
      {
        onSuccess: () => {
          setCommentText('');
          setReplyTo(null);
        },
        onError: (err) => Alert.alert('Error', err.message || 'Could not post comment.'),
      },
    );
  };

  const handleReply = (commentId: string, userName: string) => {
    setReplyTo({ id: commentId, name: userName });
    commentInputRef.current?.focus();
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Photo */}
      <View style={styles.photoContainer}>
        {issue.photoUrl ? (
          <Image
            source={{ uri: issue.photoUrl }}
            style={styles.photoImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoIcon}>{'\u{1F4F8}'}</Text>
            <Text style={styles.photoText}>{t('issues.noPhoto')}</Text>
          </View>
        )}
        <Badge
          text={ISSUE_STATUS_LABELS[issue.status]}
          backgroundColor={isResolved ? colors.success : colors.warning}
          color={colors.white}
          size="md"
          style={styles.statusBadge}
        />
      </View>

      {/* Title and Meta */}
      <View style={styles.titleSection}>
        <View style={styles.categoryRow}>
          <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
          <Badge
            text={ISSUE_CATEGORY_LABELS[issue.category]}
            backgroundColor={categoryColor + '15'}
            color={categoryColor}
            size="sm"
          />
          <Badge
            text={(issue.priority || 'medium').toUpperCase()}
            backgroundColor={
              issue.priority === 'critical'
                ? colors.error + '15'
                : issue.priority === 'high'
                ? colors.warning + '15'
                : colors.info + '15'
            }
            color={
              issue.priority === 'critical'
                ? colors.error
                : issue.priority === 'high'
                ? colors.warning
                : colors.info
            }
            size="sm"
          />
        </View>

        <TranslatedText text={issue.title} style={styles.title} />
        {issue.description ? (
          <TranslatedText text={issue.description} style={styles.description} />
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.locationIcon}>{'\u{1F4CD}'}</Text>
          <Text style={styles.locationText}>{issue.address}</Text>
        </View>

        <View style={styles.reporterRow}>
          <Avatar name={reporterName} size={28} />
          <Text style={styles.reporterText}>
            {t('issues.reportedBy')} <Text style={styles.reporterName}>{reporterName}</Text>
          </Text>
          <Text style={styles.timeText}>
            {formatRelativeTime(issue.createdAt)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            hasUpvoted && styles.actionButtonActive,
          ]}
          onPress={handleUpvote}
        >
          <Text
            style={[
              styles.actionIcon,
              hasUpvoted && styles.actionIconActive,
            ]}
          >
            {hasUpvoted ? '\u25B2' : '\u25B3'}
          </Text>
          <Text
            style={[
              styles.actionText,
              hasUpvoted && styles.actionTextActive,
            ]}
          >
            {hasUpvoted ? t('issues.upvoted') : t('issues.upvote')} ({formatNumber(displayUpvotes)})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={scrollToComments}>
          <Text style={styles.actionIcon}>{'\u{1F4AC}'}</Text>
          <Text style={styles.actionText}>{t('issues.comment')} ({comments?.length ?? 0})</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Text style={styles.actionIcon}>{'\u{1F4E4}'}</Text>
          <Text style={styles.actionText}>{t('issues.share')}</Text>
        </TouchableOpacity>
      </View>

      {/* Department Assignment */}
      <Card style={styles.departmentCard}>
        <View style={styles.departmentRow}>
          <View style={styles.departmentIcon}>
            <Text style={styles.departmentEmoji}>{'\u{1F3E2}'}</Text>
          </View>
          <View style={styles.departmentInfo}>
            <Text style={styles.departmentLabel}>{t('issues.routedTo')}</Text>
            <Text style={styles.departmentName}>
              {issue.department || t('issues.autoRouting')}
            </Text>
            {issue.assignedToName && (
              <Text style={styles.assignedTo}>
                {t('issues.assigned')}: {issue.assignedToName}
              </Text>
            )}
          </View>
        </View>
      </Card>

      {/* Ledger Timeline */}
      <Card style={styles.ledgerCard}>
        <Text style={styles.sectionTitle}>{t('issues.resolutionLedger')}</Text>
        <Text style={styles.sectionSubtitle}>
          {t('issues.blockchainVerified')}
        </Text>
        <LedgerTimeline ledger={issue.ledger} currentStatus={issue.status} />
      </Card>

      {/* Before / After */}
      <Card style={styles.comparisonCard}>
        <Text style={styles.sectionTitle}>{t('issues.beforeAfter')}</Text>
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonItem}>
            {issue.photoUrl ? (
              <Image
                source={{ uri: issue.photoUrl }}
                style={styles.comparisonImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.comparisonPlaceholder}>
                <Text style={styles.comparisonEmoji}>{'\u{1F4F7}'}</Text>
                <Text style={styles.comparisonLabel}>{t('issues.before')}</Text>
              </View>
            )}
          </View>
          <View style={styles.comparisonDivider} />
          <View style={styles.comparisonItem}>
            {issue.afterPhotoUrl ? (
              <Image
                source={{ uri: issue.afterPhotoUrl }}
                style={styles.comparisonImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.comparisonPlaceholder,
                  !isResolved && styles.comparisonPending,
                ]}
              >
                <Text style={styles.comparisonEmoji}>
                  {isResolved ? '\u{1F4F7}' : '\u23F3'}
                </Text>
                <Text style={styles.comparisonLabel}>
                  {isResolved ? t('issues.after') : t('issues.pendingResolution')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>

      {/* Verify button for completed issues */}
      {issue.status === 'completed' && (
        <Card style={styles.verifyCard}>
          <Text style={styles.verifyTitle}>{t('issues.verifyResolution')}</Text>
          <Text style={styles.verifyDesc}>
            {t('issues.verifyResolutionDesc')}
          </Text>
          <View style={styles.verifyButtons}>
            <Button
              title={t('issues.yesVerified')}
              onPress={() => confirmMutation.mutate(true)}
              variant="primary"
              size="md"
              loading={confirmMutation.isPending}
              style={styles.verifyButtonItem}
            />
            <Button
              title={t('issues.notResolved')}
              onPress={() => confirmMutation.mutate(false)}
              variant="outline"
              size="md"
              loading={confirmMutation.isPending}
              style={styles.verifyButtonItem}
            />
          </View>
        </Card>
      )}

      {/* Comments */}
      <View
        onLayout={(e) => {
          commentsY.current = e.nativeEvent.layout.y;
        }}
      >
      <Card style={styles.commentsCard}>
        <Text style={styles.sectionTitle}>
          {t('issues.comments')} ({comments?.length ?? 0})
        </Text>

        {comments && comments.length > 0 ? (
          <>
            {/* Top-level comments */}
            {comments.filter(c => !c.parent_id).map(c => {
              const replies = comments.filter(r => r.parent_id === c.id);
              return (
                <View key={c.id} style={styles.commentItem}>
                  <View style={styles.commentRow}>
                    <Avatar name={c.user_name || 'Citizen'} size={32} />
                    <View style={styles.commentBody}>
                      <Text style={styles.commentAuthor}>
                        {c.user_name || 'Citizen'}
                        <Text style={styles.commentTime}>  {formatRelativeTime(c.created_at)}</Text>
                      </Text>
                      <TranslatedText text={c.content} style={styles.commentContent} />
                      <View style={styles.commentActions}>
                        <TouchableOpacity
                          style={[styles.commentActionBtn, c.has_liked && styles.commentActionBtnActive]}
                          onPress={() => likeComment.mutate(c.id)}
                        >
                          <Text style={[styles.commentActionIcon, c.has_liked && styles.commentUpvoted]}>
                            {c.has_liked ? '\u25B2' : '\u25B3'}
                          </Text>
                          <Text style={[styles.commentActionText, c.has_liked && styles.commentUpvoted]}>
                            {c.has_liked ? t('issues.upvoted') : t('issues.upvote')}{c.likes_count > 0 ? ` (${c.likes_count})` : ''}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.commentActionBtn}
                          onPress={() => handleReply(c.id, c.user_name || 'Citizen')}
                        >
                          <Text style={styles.commentActionIcon}>{'\u21A9'}</Text>
                          <Text style={styles.commentActionText}>{t('issues.reply')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  {/* Replies */}
                  {replies.map(r => (
                    <View key={r.id} style={styles.replyItem}>
                      <View style={styles.commentRow}>
                        <Avatar name={r.user_name || 'Citizen'} size={24} />
                        <View style={styles.commentBody}>
                          <Text style={styles.commentAuthor}>
                            {r.user_name || 'Citizen'}
                            <Text style={styles.commentTime}>  {formatRelativeTime(r.created_at)}</Text>
                          </Text>
                          <TranslatedText text={r.content} style={styles.commentContent} />
                          <View style={styles.commentActions}>
                            <TouchableOpacity
                              style={[styles.commentActionBtn, r.has_liked && styles.commentActionBtnActive]}
                              onPress={() => likeComment.mutate(r.id)}
                            >
                              <Text style={[styles.commentActionIcon, r.has_liked && styles.commentUpvoted]}>
                                {r.has_liked ? '\u25B2' : '\u25B3'}
                              </Text>
                              <Text style={[styles.commentActionText, r.has_liked && styles.commentUpvoted]}>
                                {r.has_liked ? t('issues.upvoted') : t('issues.upvote')}{r.likes_count > 0 ? ` (${r.likes_count})` : ''}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        ) : (
          <Text style={styles.noComments}>{t('issues.noComments')}</Text>
        )}

        {/* Reply indicator */}
        {replyTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyIndicatorText}>
              {t('issues.replyingTo')} <Text style={styles.replyName}>{replyTo.name}</Text>
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={styles.replyCancelText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Comment input */}
        <View style={styles.commentInputRow}>
          <Avatar name={currentUser?.name || 'You'} size={28} />
          <TextInput
            ref={commentInputRef}
            style={styles.commentInput}
            placeholder={replyTo ? `${t('issues.replyTo')} ${replyTo.name}...` : t('issues.writeComment')}
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[styles.commentSendButton, !commentText.trim() && styles.commentSendDisabled]}
            onPress={handlePostComment}
            disabled={!commentText.trim() || createComment.isPending}
          >
            <Text style={styles.commentSendText}>{createComment.isPending ? '...' : t('issues.post')}</Text>
          </TouchableOpacity>
        </View>
      </Card>
      </View>

      {/* Extra space so keyboard doesn't cover input */}
      <View style={{ height: keyboardVisible ? keyboardHeight : 40 }} />
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
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  photoContainer: {
    height: 200,
    position: 'relative',
  },
  photoImage: {
    flex: 1,
    width: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: colors.navy + '08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  photoText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statusBadge: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
  },
  titleSection: {
    padding: spacing.lg,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 28,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  locationText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  reporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reporterText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  reporterName: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
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
  departmentCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  departmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  departmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.info + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  departmentEmoji: {
    fontSize: 22,
  },
  departmentInfo: {
    flex: 1,
  },
  departmentLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  departmentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 1,
  },
  assignedTo: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  ledgerCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  comparisonCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  comparisonItem: {
    flex: 1,
  },
  comparisonImage: {
    height: 120,
    borderRadius: borderRadius.lg,
    width: '100%',
  },
  comparisonPlaceholder: {
    height: 120,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonPending: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.white,
  },
  comparisonEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  comparisonLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  comparisonDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  verifyCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.success + '08',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  verifyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  verifyButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  verifyButtonItem: {
    flex: 1,
  },
  commentsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
    maxHeight: 80,
  },
  commentSendButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendDisabled: {
    backgroundColor: colors.border,
  },
  commentSendText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  commentItem: {
    paddingTop: spacing.md,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commentBody: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  commentTime: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textMuted,
  },
  commentContent: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginTop: 2,
  },
  commentActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 8,
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.backgroundGray,
    minHeight: 36,
  },
  commentActionBtnActive: {
    backgroundColor: colors.primary + '12',
  },
  commentActionIcon: {
    fontSize: 14,
    color: colors.textMuted,
  },
  commentActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  commentUpvoted: {
    color: colors.primary,
  },
  replyItem: {
    marginLeft: 40,
    marginTop: spacing.sm,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
  },
  replyIndicatorText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  replyName: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  replyCancelText: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
  },
  noComments: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  bottomSpacer: {
    height: 40,
  },
});
