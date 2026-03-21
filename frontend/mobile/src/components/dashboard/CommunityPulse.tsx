import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

const AVATAR_SIZE = 28;
const AVATAR_COLORS = ['#FF6B35', '#3B82F6', '#10B981', '#7C3AED', '#F59E0B'];

interface CommunityPulseProps {
  activeCitizens?: number;
  weeklyTrendPercent?: number;
  initials?: string[];
}

export const CommunityPulse: React.FC<CommunityPulseProps> = ({
  activeCitizens = 423,
  weeklyTrendPercent = 18,
  initials = ['A', 'R', 'P', 'S', '+'],
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        {/* Avatar stack */}
        <View style={styles.avatarStack}>
          {initials.slice(0, 5).map((initial, i) => (
            <View
              key={i}
              style={[
                styles.miniAvatar,
                {
                  backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                  marginLeft: i === 0 ? 0 : -8,
                  zIndex: 5 - i,
                },
              ]}
            >
              <Text style={styles.miniAvatarText}>{initial}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.communityText}>
          {t('home.activeCitizens', { count: activeCitizens })}
        </Text>
      </View>

      <View style={styles.trendBadge}>
        <Svg viewBox="0 0 12 12" width={12} height={12} fill="none">
          <Path
            d="M1 9l3-3 2 2 5-5M8 3h3v3"
            stroke="#10B981"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </Svg>
        <Text style={styles.trendText}>+{weeklyTrendPercent}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarStack: {
    flexDirection: 'row',
    marginRight: spacing.sm,
  },
  miniAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  miniAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  communityText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  communityBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98118',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
});
