import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        <Text
          style={styles.text}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {t('home.celebrationResolved', { title: issueTitle, count: reportCount })}
        </Text>
      </View>

      {/* Time */}
      <Text
        style={styles.time}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {timeAgo}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: borderRadius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textWrap: {
    flex: 1,
  },
  text: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500',
    lineHeight: 17,
  },
  bold: {
    fontWeight: '700',
    color: '#047857',
  },
  time: {
    fontSize: 10,
    color: '#6EE7B7',
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
});
