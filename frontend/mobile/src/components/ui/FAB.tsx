import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface FABProps {
  onPress: () => void;
  icon?: string;
  label?: string;
  style?: ViewStyle;
  size?: number;
}

export const FAB: React.FC<FABProps> = ({
  onPress,
  icon = '+',
  label,
  style,
  size = 56,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.fab,
        {
          width: label ? undefined : size,
          height: size,
          borderRadius: label ? size / 2 : size / 2,
          paddingHorizontal: label ? 20 : 0,
        },
        style,
      ]}
    >
      <Text style={[styles.icon, { fontSize: size * 0.45 }]}>{icon}</Text>
      {label && <Text style={styles.label}>{label}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  icon: {
    color: colors.white,
    fontWeight: '300',
  },
  label: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
});
