import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formatRelativeTime, formatNumber } from '../../lib/utils';
import type { Voice } from '../../types/voice';

interface VoiceCardProps {
  voice: Voice;
  onPress?: () => void;
  onUpvote?: () => void;
}

const SENTIMENT_CONFIG = {
  positive: { color: colors.success, label: 'Positive', icon: '\u{1F44D}' },
  negative: { color: colors.error, label: 'Negative', icon: '\u{1F44E}' },
  neutral: { color: colors.info, label: 'Neutral', icon: '\u{1F4AD}' },
};

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  onPress,
  onUpvote,
}) => {
  const sentiment = SENTIMENT_CONFIG[voice.sentiment];

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Avatar name={voice.userName} size={36} />
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{voice.userName}</Text>
          <Text style={styles.time}>
            {formatRelativeTime(voice.createdAt)} · {voice.ward}
          </Text>
        </View>
        <Badge
          text={`${sentiment.icon} ${sentiment.label}`}
          backgroundColor={sentiment.color + '15'}
          color={sentiment.color}
          size="sm"
        />
      </View>

      <Text style={styles.content}>{voice.content}</Text>

      {voice.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {voice.tags.map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onUpvote}
          style={styles.actionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.actionIcon, voice.hasUpvoted && styles.upvoted]}>
            {voice.hasUpvoted ? '\u25B2' : '\u25B3'}
          </Text>
          <Text style={[styles.actionText, voice.hasUpvoted && styles.upvoted]}>
            {formatNumber(voice.upvotes)}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionButton}>
          <Text style={styles.actionIcon}>{'\u{1F4AC}'}</Text>
          <Text style={styles.actionText}>{voice.commentCount}</Text>
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
    backgroundColor: colors.info + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    color: colors.info,
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
  upvoted: {
    color: colors.primary,
  },
});
