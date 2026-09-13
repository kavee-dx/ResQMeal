// frontend/src/components/kaveesha-SectionHeader.tsx
// Owner: Kaveesha

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../styles/kaveesha-theme';

interface Props {
  kicker?: string;
  title: string;
  onViewAll?: () => void;
}

export default function KaveeshaSectionHeader({ kicker, title, onViewAll }: Props) {
  return (
    <View style={styles.row}>
      <View>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {onViewAll ? (
        <TouchableOpacity onPress={onViewAll} hitSlop={8}>
          <Text style={styles.viewAll}>View All →</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  kicker: { ...typography.kicker, color: colors.primaryLight, marginBottom: 2 },
  title: { ...typography.h2, color: colors.textPrimary },
  viewAll: { ...typography.label, color: colors.primary, marginBottom: 3 },
});