import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors, Radius, Spacing, Typography, Shadows } from '@/constants/theme';
import { Donation } from '@/types/amasha-donation';
import DonationStatusBadge from './amasha-DonationStatusBadge';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DonationCard({ donation }: { donation: Donation }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.card]}>
      <View style={styles.headerRow}>
        <Text style={[Typography.labelStrong, { color: colors.text }]} numberOfLines={1}>
          {donation.foodType}
        </Text>
        <DonationStatusBadge status={donation.status} />
      </View>

      <Text style={[Typography.bodySmall, { color: colors.textSecondary, marginTop: Spacing.half }]}>
        {donation.quantity}
      </Text>

      <View style={styles.footerRow}>
        <Text style={[Typography.caption, { color: colors.textMuted }]}>
          {donation.donorName}
          {donation.distanceAway ? ` · ${donation.distanceAway}` : ''}
        </Text>
        <Text style={[Typography.caption, { color: colors.textMuted }]}>
          {timeAgo(donation.donatedAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
});