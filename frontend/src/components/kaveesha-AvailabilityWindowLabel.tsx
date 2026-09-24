// frontend/src/components/kaveesha-AvailabilityWindowLabel.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radius, Typography } from '@/constants/theme';
import type { ThemeColor } from '@/constants/theme';

type Palette = Record<ThemeColor, string>;

type Props = {
  availabilityStart: string | Date;
  availabilityEnd: string | Date;
  compact?: boolean; // true = pill for list cards, false = fuller row for detail screen
};

type WindowState = 'open' | 'closingSoon' | 'expired';

const CLOSING_SOON_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours

function getWindowState(end: Date): WindowState {
  const msLeft = end.getTime() - Date.now();
  if (msLeft <= 0) return 'expired';
  if (msLeft <= CLOSING_SOON_THRESHOLD_MS) return 'closingSoon';
  return 'open';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRemaining(end: Date): string {
  const msLeft = end.getTime() - Date.now();
  if (msLeft <= 0) return 'Expired';
  const hours = Math.floor(msLeft / (1000 * 60 * 60));
  const mins = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 1) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export default function AvailabilityWindowLabel({
  availabilityStart,
  availabilityEnd,
  compact = false,
}: Props) {
  const c = Colors.light as Palette;
  const start = new Date(availabilityStart);
  const end = new Date(availabilityEnd);
  const state = getWindowState(end);

  const tone = {
    open: { bg: c.successSoft, fg: c.success, icon: 'time-outline' as const },
    closingSoon: { bg: c.warningSoft, fg: c.warning, icon: 'alert-circle-outline' as const },
    expired: { bg: c.errorSoft, fg: c.error, icon: 'close-circle-outline' as const },
  }[state];

  if (compact) {
    return (
      <View style={[styles.pill, { backgroundColor: tone.bg }]}>
        <Ionicons name={tone.icon} size={12} color={tone.fg} />
        <Text style={[styles.pillText, { color: tone.fg }]} numberOfLines={1}>
          {state === 'expired' ? 'Expired' : formatRemaining(end)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, { backgroundColor: tone.bg }]}>
      <Ionicons name={tone.icon} size={16} color={tone.fg} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: tone.fg }]}>
          {state === 'expired'
            ? 'Availability window closed'
            : `Available ${formatTime(start)} – ${formatTime(end)}`}
        </Text>
        {state !== 'expired' && (
          <Text style={[styles.rowSub, { color: tone.fg }]}>{formatRemaining(end)}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: { ...Typography.label, fontSize: 11 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: Radius.md,
  },
  rowLabel: { ...Typography.bodyMedium, fontSize: 13, fontWeight: '700' },
  rowSub: { ...Typography.bodySmall, fontSize: 12, marginTop: 1, opacity: 0.85 },
});