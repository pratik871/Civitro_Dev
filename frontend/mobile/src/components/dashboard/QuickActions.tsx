import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

const SAFFRON = '#FF6B35';

// ---------------------------------------------------------------------------
// Action card configuration
// ---------------------------------------------------------------------------
interface ActionItem {
  key: string;
  label: string;
  badge: string;
  iconColor: string;
  isHero?: boolean;
  renderIcon: () => React.ReactNode;
}

interface QuickActionsProps {
  pollCount?: number;
  promiseCount?: number;
  chiScore?: number;
  messageCount?: number;
  actionCount?: number;
  onPress?: (key: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  pollCount = 0,
  promiseCount = 0,
  chiScore = 0,
  messageCount = 0,
  actionCount = 0,
  onPress,
}) => {
  const { t } = useTranslation();
  const actions: ActionItem[] = [
    {
      key: 'report',
      label: t('home.reportIssue'),
      badge: t('home.quickReport'),
      iconColor: '#FFFFFF',
      isHero: true,
      renderIcon: () => (
        <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <Path
            d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={12} cy={13} r={4} stroke="white" strokeWidth={2} />
          <Line x1={12} y1={9} x2={12} y2={9.5} stroke="white" strokeWidth={1.5} />
          <Line x1={12} y1={16.5} x2={12} y2={17} stroke="white" strokeWidth={1.5} />
          <Line x1={8} y1={13} x2={8.5} y2={13} stroke="white" strokeWidth={1.5} />
          <Line x1={15.5} y1={13} x2={16} y2={13} stroke="white" strokeWidth={1.5} />
        </Svg>
      ),
    },
    {
      key: 'polls',
      label: t('home.quickPolls'),
      badge: `${pollCount} ${t('home.active')}`,
      iconColor: '#3B82F6',
      renderIcon: () => (
        <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <Path d="M5 3v18h14V3H5z" stroke="#3B82F6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M9 8h6M9 12h6M9 16h3" stroke="#3B82F6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={7} cy={8} r={0.5} fill="#3B82F6" />
          <Circle cx={7} cy={12} r={0.5} fill="#3B82F6" />
          <Circle cx={7} cy={16} r={0.5} fill="#3B82F6" />
        </Svg>
      ),
    },
    {
      key: 'promises',
      label: t('home.quickPromises'),
      badge: `${promiseCount} ${t('home.tracked')}`,
      iconColor: '#D97706',
      renderIcon: () => (
        <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <Path
            d="M4 19V5a2 2 0 012-2h8a2 2 0 012 2v14l-6-3-6 3z"
            stroke="#D97706"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M8 8h4M8 12h2" stroke="#D97706" strokeWidth={2} strokeLinecap="round" />
        </Svg>
      ),
    },
    {
      key: 'chi',
      label: t('home.quickCHI'),
      badge: `${chiScore}/100`,
      iconColor: '#059669',
      renderIcon: () => (
        <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <Path d="M2 16h3l2-4 3 8 3-12 2 8h2l1-2h4" stroke="#059669" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Rect x={3} y={18} width={3} height={4} rx={0.5} fill="#059669" opacity={0.3} />
          <Rect x={8} y={16} width={3} height={6} rx={0.5} fill="#059669" opacity={0.3} />
          <Rect x={13} y={14} width={3} height={8} rx={0.5} fill="#059669" opacity={0.3} />
          <Rect x={18} y={17} width={3} height={5} rx={0.5} fill="#059669" opacity={0.3} />
        </Svg>
      ),
    },
    {
      key: 'messages',
      label: t('home.quickMessages'),
      badge: `${messageCount} ${t('home.new')}`,
      iconColor: '#7C3AED',
      renderIcon: () => (
        <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <Path
            d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
            stroke="#7C3AED"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ),
    },
    {
      key: 'actions',
      label: t('home.actions'),
      badge: `${actionCount} ${t('home.active')}`,
      iconColor: '#C2410C',
      renderIcon: () => (
        <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <Path d="M22 2L11 13" stroke="#C2410C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M22 2l-7 20-4-9-9-4z" stroke="#C2410C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={15} cy={9} r={1.5} fill="#C2410C" opacity={0.3} />
        </Svg>
      ),
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('home.takeAction')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {actions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={[
              styles.card,
              action.isHero
                ? styles.heroCard
                : { backgroundColor: CARD_BG[action.key] || colors.borderLight },
            ]}
            onPress={() => onPress?.(action.key)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconWrap,
                action.isHero && styles.heroIconWrap,
              ]}
            >
              {action.renderIcon()}
            </View>
            <Text
              style={[styles.label, action.isHero && styles.heroLabel]}
              numberOfLines={1}
            >
              {action.label}
            </Text>
            <Text
              style={[styles.badge, action.isHero && styles.heroBadge]}
              numberOfLines={1}
            >
              {action.badge}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// Background colors for each action card (matching HTML gradients)
const CARD_BG: Record<string, string> = {
  polls: '#EFF6FF',
  promises: '#FFFBEB',
  chi: '#ECFDF5',
  messages: '#F5F3FF',
  actions: '#FFF7ED',
};

const styles = StyleSheet.create({
  section: {},
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  scroll: {
    paddingRight: 20,
    gap: 12,
  },
  card: {
    width: 120,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 10,
  },
  heroCard: {
    width: 140,
    backgroundColor: SAFFRON,
    shadowColor: SAFFRON,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  heroIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  heroLabel: {
    color: '#FFFFFF',
  },
  badge: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  heroBadge: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
