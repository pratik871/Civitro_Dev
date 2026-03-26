import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';

const SAFFRON = '#FF6B35';

interface CardConfig {
  key: string;
  label: string;
  badge: string;
  accent: string;
  accentLight: string;
  gradient: [string, string];
  renderIcon: (color: string) => React.ReactNode;
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

  const cards: CardConfig[] = [
    {
      key: 'report',
      label: t('home.reportIssue'),
      badge: t('home.quickReport'),
      accent: SAFFRON,
      accentLight: '#FFF3ED',
      gradient: ['#FF8F5E', '#E85D2A'],
      renderIcon: (c) => (
        <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
          <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={12} cy={13} r={4} stroke={c} strokeWidth={2} />
        </Svg>
      ),
    },
    {
      key: 'polls',
      label: t('home.quickPolls'),
      badge: `${pollCount} ${t('home.active')}`,
      accent: '#3B82F6',
      accentLight: '#EFF6FF',
      gradient: ['#60A5FA', '#2563EB'],
      renderIcon: (c) => (
        <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
          <Rect x={4} y={4} width={16} height={16} rx={2} stroke={c} strokeWidth={2} />
          <Path d="M9 9h6M9 13h6M9 17h3" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      ),
    },
    {
      key: 'promises',
      label: t('home.quickPromises'),
      badge: `${promiseCount} ${t('home.tracked')}`,
      accent: '#D97706',
      accentLight: '#FFFBEB',
      gradient: ['#FBBF24', '#B45309'],
      renderIcon: (c) => (
        <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
          <Path d="M4 19V5a2 2 0 012-2h8a2 2 0 012 2v14l-6-3-6 3z" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ),
    },
    {
      key: 'chi',
      label: t('home.quickCHI'),
      badge: `${chiScore}/100`,
      accent: '#059669',
      accentLight: '#ECFDF5',
      gradient: ['#34D399', '#047857'],
      renderIcon: (c) => (
        <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
          <Path d="M3 16h3l2-4 3 8 3-12 2 8h2l1-2h3" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ),
    },
    {
      key: 'messages',
      label: t('home.quickMessages'),
      badge: `${messageCount} ${t('home.new')}`,
      accent: '#7C3AED',
      accentLight: '#F5F3FF',
      gradient: ['#A78BFA', '#6D28D9'],
      renderIcon: (c) => (
        <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
          <Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ),
    },
    {
      key: 'actions',
      label: t('home.actions'),
      badge: `${actionCount} ${t('home.active')}`,
      accent: '#C2410C',
      accentLight: '#FFF7ED',
      gradient: ['#FB923C', '#9A3412'],
      renderIcon: (c) => (
        <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
          <Path d="M22 2L11 13" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M22 2l-7 20-4-9-9-4z" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ),
    },
  ];

  const loopCards = [...cards, ...cards, ...cards, ...cards, ...cards];
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);
  const CARD_W = 140; // tile width + gap
  const SET_W = cards.length * CARD_W;
  const initialOffset = SET_W * 2; // start in the middle

  // Start scroll at middle set
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: initialOffset, animated: false });
    scrollX.current = initialOffset;
  }, []);

  return (
    <View>
      <Text style={styles.sectionTitle}>{t('home.takeAction')}</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollX.current = e.nativeEvent.contentOffset.x;
          // Loop forward: past 3rd set → jump back one set
          if (scrollX.current >= SET_W * 3) {
            scrollX.current -= SET_W;
            scrollRef.current?.scrollTo({ x: scrollX.current, animated: false });
          }
          // Loop backward: before 1st set → jump forward one set
          if (scrollX.current <= SET_W * 0.5) {
            scrollX.current += SET_W;
            scrollRef.current?.scrollTo({ x: scrollX.current, animated: false });
          }
        }}
      >
        {loopCards.map((card, i) => (
          <ActionTile key={`${card.key}-${i}`} config={card} onPress={() => onPress?.(card.key)} />
        ))}
      </ScrollView>
    </View>
  );
};

// ---------------------------------------------------------------------------
// ActionTile — flips from light to gradient on press
// ---------------------------------------------------------------------------
const ActionTile: React.FC<{ config: CardConfig; onPress: () => void }> = ({
  config,
  onPress,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  const pressIn = () => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const pressOut = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  // Interpolations
  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [config.accentLight, config.accent],
  });

  const labelColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0B1426', '#FFFFFF'],
  });

  const badgeBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0.06)', 'rgba(255,255,255,0.25)'],
  });

  const badgeColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [config.accent, '#FFFFFF'],
  });

  const iconBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.2)'],
  });

  const shadowOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.4],
  });

  const shadowRadius = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 20],
  });

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F3F4F6', config.accent],
  });

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View
        style={[
          styles.tile,
          {
            backgroundColor: bgColor,
            borderColor: borderColor,
            transform: [{ scale }],
            shadowColor: config.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: shadowOpacity as unknown as number,
            shadowRadius: shadowRadius as unknown as number,
          },
        ]}
      >
        {/* Icon */}
        <Animated.View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <AnimatedIcon config={config} anim={anim} />
        </Animated.View>

        {/* Label */}
        <Animated.Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {config.label}
        </Animated.Text>

        {/* Badge */}
        <Animated.View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Animated.Text style={[styles.badgeText, { color: badgeColor }]}>
            {config.badge}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

// Icon that transitions from accent color to white on press
const AnimatedIcon: React.FC<{ config: CardConfig; anim: Animated.Value }> = ({
  config,
  anim,
}) => {
  // Can't animate SVG stroke directly with Animated,
  // so we layer both versions and cross-fade
  const normalOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const pressedOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View>
      <Animated.View style={{ opacity: normalOpacity, position: 'absolute' }}>
        {config.renderIcon(config.accent)}
      </Animated.View>
      <Animated.View style={{ opacity: pressedOpacity }}>
        {config.renderIcon('#FFFFFF')}
      </Animated.View>
    </View>
  );
};

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  scroll: {
    paddingRight: 20,
    gap: 10,
  },
  tile: {
    width: 130,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 15,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
