import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { DonationStatus } from '@/types/amasha-donation';

export type FilterValue = DonationStatus | 'all';

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'expired', label: 'Expired' },
  { value: 'delivered', label: 'Delivered' },
];

interface Props {
  active: FilterValue;
  onChange: (value: FilterValue) => void;
}

export default function DonationFilterTabs({ active, onChange }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {FILTERS.map((f) => {
        const isActive = f.value === active;
        return (
          <TouchableOpacity
            key={f.value}
            onPress={() => onChange(f.value)}
            style={[
              styles.pill,
              {
                backgroundColor: isActive ? colors.primary : colors.backgroundElement,
              },
            ]}
          >
            <Text
              style={[
                Typography.label,
                { color: isActive ? colors.textOnPrimary : colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});