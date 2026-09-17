import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
// Adjust this import if your theme file has a different name/location under constants/.
import { Colors, Spacing, Radius, Typography, Shadows } from '@/constants/theme';

export interface FoodItem {
  id: string;
  foodType: string;
  quantity: string;
  expiryDate: string; // ISO date string
  location: string;
  donorName?: string;
}

interface FoodCardProps {
  food: FoodItem;
  onPress?: (food: FoodItem) => void;
  /** Fixed width for grid layouts (Dashboard renders 2 per row). Omit for a full-width card. */
  width?: number;
}

const FOOD_ICONS: Record<string, string> = {
  Rice: '🍚',
  Fruits: '🍎',
  Veg: '🥦',
  Vegetables: '🥦',
  Water: '💧',
  Bread: '🍞',
  'Canned Goods': '🥫',
};

/**
 * Task 09 — Build Food Information Card
 * Matches Dash.png (variant A): an image-placeholder block on top with a
 * "Food Details" label bar underneath.
 */
export default function FoodCard({ food, onPress, width }: FoodCardProps) {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const isExpiringSoon = () => {
    const hoursLeft = (new Date(food.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursLeft <= 5 && hoursLeft > 0;
  };

  const icon = FOOD_ICONS[food.foodType] ?? '🍽️';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress?.(food)}
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border, width },
        Shadows.card,
      ]}
    >
      {/* Image placeholder block, standing in for a real donation photo */}
      <View style={[styles.imagePlaceholder, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}>
        <Text style={styles.imagePlaceholderIcon}>{icon}</Text>
        {isExpiringSoon() && (
          <View style={[styles.badge, { backgroundColor: theme.warningSoft }]}>
            <Text style={[styles.badgeText, { color: theme.warning }]}>Expiring soon</Text>
          </View>
        )}
      </View>

      {/* "Food Details" label bar, matching the wireframe's overlapping caption */}
      <View style={[styles.detailsBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.foodType, { color: theme.text }]} numberOfLines={1}>
          {food.foodType}
        </Text>
        <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
          {food.quantity} · {food.location}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  imagePlaceholder: {
    height: 90,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 32,
  },
  badge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  badgeText: {
    ...Typography.caption,
  },
  detailsBar: {
    padding: Spacing.two,
  },
  foodType: {
    ...Typography.labelStrong,
  },
  detailText: {
    ...Typography.caption,
    textTransform: 'none',
    marginTop: 2,
  },
});
