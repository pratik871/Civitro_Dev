import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path, Circle, Line, Polyline } from 'react-native-svg';

const SAFFRON = '#FF6B35';
const SAFFRON_LIGHT = '#FFF3ED';
const NAVY = '#0B1426';
const NAVY_SOFT = '#1E3A5F';

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

const ITEMS: MenuItem[] = [
  {
    key: 'community_action',
    label: 'Community Action',
    highlight: true,
    icon: (
      <Svg viewBox="0 0 24 24" width={18} height={18} fill="none">
        <Path d="M22 2L11 13" stroke={SAFFRON} strokeWidth={2} strokeLinecap="round" />
        <Path d="M22 2l-7 20-4-9-9-4z" stroke={SAFFRON} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    ),
  },
  {
    key: 'pin',
    label: 'Pin Location',
    icon: (
      <Svg viewBox="0 0 24 24" width={18} height={18} fill="none">
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={NAVY_SOFT} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={12} cy={10} r={3} stroke={NAVY_SOFT} strokeWidth={2} />
      </Svg>
    ),
  },
  {
    key: 'text',
    label: 'Text Report',
    icon: (
      <Svg viewBox="0 0 24 24" width={18} height={18} fill="none">
        <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={NAVY_SOFT} strokeWidth={2} strokeLinecap="round" />
        <Polyline points="14 2 14 8 20 8" stroke={NAVY_SOFT} strokeWidth={2} strokeLinecap="round" />
        <Line x1={16} y1={13} x2={8} y2={13} stroke={NAVY_SOFT} strokeWidth={2} strokeLinecap="round" />
        <Line x1={16} y1={17} x2={8} y2={17} stroke={NAVY_SOFT} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    ),
  },
  {
    key: 'voice',
    label: 'Voice Report',
    icon: (
      <Svg viewBox="0 0 24 24" width={18} height={18} fill="none">
        <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke={NAVY_SOFT} strokeWidth={2} strokeLinecap="round" />
        <Path d="M19 10v2a7 7 0 01-14 0v-2" stroke={NAVY_SOFT} strokeWidth={2} strokeLinecap="round" />
        <Line x1={12} y1={19} x2={12} y2={23} stroke={NAVY_SOFT} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    ),
  },
  {
    key: 'photo',
    label: 'Photo Report',
    icon: (
      <Svg viewBox="0 0 24 24" width={18} height={18} fill="none">
        <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={SAFFRON} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={12} cy={13} r={4} stroke={SAFFRON} strokeWidth={2} />
      </Svg>
    ),
  },
];

const ITEM_SPACING = 58; // vertical spacing between items

interface FABProps {
  onPress: (key: string) => void;
}

export const FAB: React.FC<FABProps> = ({ onPress }) => {
  const [open, setOpen] = useState(false);
  const breathe = useRef(new Animated.Value(1)).current;
  const anims = useRef(ITEMS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!open) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1.04, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [open, breathe]);

  const openMenu = () => {
    setOpen(true);
    anims.forEach((a, i) =>
      Animated.timing(a, { toValue: 1, duration: 250, delay: i * 40, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }).start(),
    );
  };

  const closeMenu = () => {
    anims.forEach(a => Animated.timing(a, { toValue: 0, duration: 150, useNativeDriver: true }).start());
    setTimeout(() => setOpen(false), 200);
  };

  const handleItem = (key: string) => {
    closeMenu();
    onPress(key);
  };

  return (
    <>
      {open && (
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      )}

      {/* Menu items — straight line going up from FAB */}
      {open && ITEMS.map((item, i) => {
        const a = anims[i];
        const bottom = 24 + 56 + 14 + i * ITEM_SPACING;
        return (
          <Animated.View
            key={item.key}
            style={[
              styles.menuRow,
              { bottom, opacity: a, transform: [{ scale: a }] },
            ]}
          >
            <View style={styles.labelWrap}>
              <Text style={styles.labelText} numberOfLines={1}>{item.label}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleItem(item.key)}
              activeOpacity={0.7}
              style={[styles.circle, item.highlight && styles.circleHL]}
            >
              {item.icon}
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* FAB — bottom right */}
      <Animated.View style={[styles.fabWrap, { transform: [{ scale: open ? 1 : breathe }] }]}>
        <TouchableOpacity onPress={open ? closeMenu : openMenu} activeOpacity={0.85} style={styles.fab}>
          <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
            <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={12} cy={13} r={4} stroke="white" strokeWidth={2} />
          </Svg>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 90,
  },
  fabWrap: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SAFFRON,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SAFFRON,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  menuRow: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 95,
  },
  labelWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: NAVY,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  circleHL: {
    backgroundColor: SAFFRON_LIGHT,
  },
});
