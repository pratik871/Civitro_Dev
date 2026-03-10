import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  showValue?: boolean;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  style?: ViewStyle;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  size = 16,
  showValue = true,
  interactive = false,
  onRate,
  style,
}) => {
  const renderStar = (index: number) => {
    const filled = index < Math.floor(rating);
    const halfFilled = !filled && index < rating;
    const starChar = filled ? '\u2605' : halfFilled ? '\u2605' : '\u2606';
    const starColor = filled || halfFilled ? '#F59E0B' : colors.border;

    const StarContent = (
      <Text
        key={index}
        style={[styles.star, { fontSize: size, color: starColor }]}
      >
        {starChar}
      </Text>
    );

    if (interactive && onRate) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => onRate(index + 1)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          {StarContent}
        </TouchableOpacity>
      );
    }

    return StarContent;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsRow}>
        {Array.from({ length: maxStars }, (_, i) => renderStar(i))}
      </View>
      {showValue && (
        <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 1,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});
