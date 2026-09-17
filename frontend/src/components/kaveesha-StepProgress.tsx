// frontend/src/components/kaveesha-StepProgress.tsx
// Owner: Kaveesha

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../styles/kaveesha-theme';

interface Props {
  step: number; // 1-based
  total: number;
  label: string;
}

export default function KaveeshaStepProgress({ step, total, label }: Props) {
  const percent = Math.round((step / total) * 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.stepText}>
          STEP {step} OF {total}
        </Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stepText: { ...typography.kicker, color: colors.primary },
  label: { ...typography.bodySmall, color: colors.textMuted },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
});