import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

interface CelebrationBannerProps {
  issueTitle: string;
  reportCount?: number;
  timeAgo?: string;
  onPress?: () => void;
}

export const CelebrationBanner: React.FC<CelebrationBannerProps> = ({
  issueTitle,
  reportCount = 12,
  timeAgo = '2h ago',
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Checkmark icon */}
      <View style={styles.iconWrap}>
        <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
          <Path
            d="M20 6L9 17l-5-5"
            stroke="#FFFFFF"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      {/* Text */}
      <View style={styles.textWrap}>
        <Text style={styles.text}>
          <Text style={styles.bold}>{issueTitle}</Text> resolved — thanks to {reportCount} citizen reports!
        </Text>
      </View>

      {/* Time */}
      <Text style={styles.time}>{timeAgo}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textWrap: {
    flex: 1,
  },
  text: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  time: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: spacing.sm,
  },
});
