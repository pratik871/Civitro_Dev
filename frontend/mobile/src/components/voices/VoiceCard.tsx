import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Card } from '../ui/Card';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime, formatNumber } from '../../lib/utils';
import type { Voice } from '../../types/voice';

interface VoiceCardProps {
  voice: Voice;
  onPress?: () => void;
  onUpvote?: () => void;
  onComment?: () => void;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  onPress,
  onUpvote,
  onComment,
}) => {
  const tags = voice.tags ?? voice.hashtags ?? [];
  const upvotes = voice.likesCount ?? voice.upvotes ?? 0;
  const comments = voice.repliesCount ?? voice.commentCount ?? 0;
  const text = voice.text ?? voice.content ?? '';

  const handleShare = () => {
    Share.share({
      message: `${text}${tags.length > 0 ? '\n\n' + tags.map(t => '#' + t).join(' ') : ''}\n\n— via Civitro`,
    });
  };

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

      {/* Footer: upvote, comment, share */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onUpvote}
          style={[styles.actionButton, voice.hasUpvoted && styles.actionButtonUpvoted]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Svg viewBox="0 0 16 16" width={16} height={16} fill="none">
            {voice.hasUpvoted ? (
              <Path d="M8 2l5 6H9v6H7V8H3l5-6z" fill="#FF6B35" />
            ) : (
              <Path d="M8 3v10M5 6l3-3 3 3" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            )}
          </Svg>
          <Text style={[styles.actionText, voice.hasUpvoted && styles.actionTextUpvoted]}>{formatNumber(upvotes)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onComment}
          style={styles.actionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Svg viewBox="0 0 16 16" width={16} height={16} fill="none">
            <Path d="M14 10a1.5 1.5 0 01-1.5 1.5H5l-3 3V3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5V10z" stroke="#9CA3AF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.actionText}>{formatNumber(comments)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          style={styles.actionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Svg viewBox="0 0 16 16" width={16} height={16} fill="none">
            <Path d="M4 8v5a1 1 0 001 1h6a1 1 0 001-1V8M11 4L8 1 5 4M8 1v9" stroke="#9CA3AF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
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
  actionButtonUpvoted: {
    backgroundColor: '#FFF3ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: -8,
    marginVertical: -4,
  },
  actionTextUpvoted: {
    color: '#FF6B35',
    fontWeight: '700',
  },
});
