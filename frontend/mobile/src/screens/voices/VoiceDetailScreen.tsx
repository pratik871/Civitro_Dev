import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime, formatNumber } from '../../lib/utils';
import { useVoice, useLikeVoice, useShareVoice, useBookmarkVoice } from '../../hooks/useVoices';
import type { RootStackParamList } from '../../navigation/types';

type DetailRouteProp = RouteProp<RootStackParamList, 'VoiceDetail'>;

export const VoiceDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation();
  const { voiceId } = route.params;

  const { data: voice, isLoading } = useVoice(voiceId);
  const likeMutation = useLikeVoice();
  const shareMutation = useShareVoice();
  const bookmarkMutation = useBookmarkVoice();

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const handleLike = () => {
    setLiked(!liked);
    likeMutation.mutate(voiceId);
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    bookmarkMutation.mutate(voiceId);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Community Voice',
        message: voice
          ? `"${voice.text}" \u2014 shared from Civitro`
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
      <View style={styles.header}>
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
          style={[styles.actionButton, liked && styles.actionButtonActive]}
          onPress={handleLike}
          disabled={likeMutation.isPending}
        >
          <Text style={[styles.actionIcon, liked && styles.actionIconActive]}>
            {liked ? '\u2764' : '\u2661'}
          </Text>
          <Text style={[styles.actionText, liked && styles.actionTextActive]}>
            {liked ? 'Liked' : 'Like'}
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

        <TouchableOpacity
          style={[styles.actionButton, bookmarked && styles.actionButtonActive]}
          onPress={handleBookmark}
          disabled={bookmarkMutation.isPending}
        >
          <Text style={[styles.actionIcon, bookmarked && styles.actionIconActive]}>
            {bookmarked ? '\u{1F516}' : '\u{1F517}'}
          </Text>
          <Text style={[styles.actionText, bookmarked && styles.actionTextActive]}>
            {bookmarked ? 'Saved' : 'Save'}
          </Text>
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
});
