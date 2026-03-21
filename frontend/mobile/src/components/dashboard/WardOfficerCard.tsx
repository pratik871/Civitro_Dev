import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

const SAFFRON = '#FF6B35';

interface WardOfficerCardProps {
  name: string;
  designation: string;
  party: string;
  responseRate?: string;
  onMessage?: () => void;
  onRate?: () => void;
}

export const WardOfficerCard: React.FC<WardOfficerCardProps> = ({
  name,
  designation,
  party,
  responseRate,
  onMessage,
  onRate,
}) => {
  const { t } = useTranslation();
  const displayResponseRate = responseRate || t('home.respondsIn', { days: '2.3' });
  return (
    <View style={styles.card}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Svg viewBox="0 0 28 28" width={28} height={28} fill="none">
          <Circle cx={14} cy={9} r={5} stroke={colors.navy} strokeWidth={2} />
          <Path
            d="M4 25c0-5.523 4.477-10 10-10s10 4.477 10 10"
            stroke={colors.navy}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d="M20 5l1 2.5H24l-2 1.8.7 2.7L20 10.5 17.3 12l.7-2.7-2-1.8h3L20 5z"
            fill="#FFD700"
            stroke="#FFD700"
            strokeWidth={0.5}
          />
        </Svg>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.designation}>
          {designation} · {party}
        </Text>
        <View style={styles.responseRow}>
          <View style={styles.responseDot} />
          <Text style={styles.responseText}>{displayResponseRate}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onMessage} activeOpacity={0.7}>
          <Svg viewBox="0 0 24 24" width={18} height={18} fill="none">
            <Path
              d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              stroke={SAFFRON}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onRate} activeOpacity={0.7}>
          <Svg viewBox="0 0 24 24" width={18} height={18} fill="none">
            <Path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              stroke={SAFFRON}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  designation: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  responseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  responseText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
