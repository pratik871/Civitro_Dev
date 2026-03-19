import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime, formatNumber } from '../../lib/utils';
import type { Voice } from '../../types/voice';

interface VoiceCardProps {
  voice: Voice;
  onPress?: () => void;
  onLike?: () => void;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  onPress,
  onLike,
}) => {
  const tags = voice.tags ?? voice.hashtags ?? [];
  const likes = voice.likesCount ?? voice.upvotes ?? 0;
  const replies = voice.repliesCount ?? voice.commentCount ?? 0;
  const shares = voice.sharesCount ?? 0;
  const text = voice.text ?? voice.content ?? '';

  return (
    <Card onPress={onPress} style={styles.card}>
      {/* Header: avatar circle + time */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(voice.userName ?? 'C').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{voice.userName ?? 'Citizen'}</Text>
          <Text style={styles.time}>{formatRelativeTime(voice.createdAt)}</Text>
        </View>
        {voice.language && voice.language !== 'en' && (
          <View style={styles.langBadge}>
            <Text style={styles.langText}>{voice.language.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Voice text */}
      <Text style={styles.content}>{text}</Text>

      {/* Hashtags */}
      {tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer: like, comment, share counts */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onLike}
          style={styles.actionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.actionIcon}>{'\u2661'}</Text>
          <Text style={styles.actionText}>{formatNumber(likes)}</Text>
        </TouchableOpacity>

        <View style={styles.actionButton}>
          <Text style={styles.actionIcon}>{'\u{1F4AC}'}</Text>
          <Text style={styles.actionText}>{formatNumber(replies)}</Text>
        </View>

        <View style={styles.actionButton}>
          <Text style={styles.actionIcon}>{'\u{1F4E4}'}</Text>
          <Text style={styles.actionText}>{formatNumber(shares)}</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  langBadge: {
    backgroundColor: colors.info + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  langText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.info,
  },
  content: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    fontSize: 14,
    color: colors.textMuted,
  },
  actionText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
