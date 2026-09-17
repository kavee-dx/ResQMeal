import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { DonationStatus } from '@/types/amasha-donation';

const STATUS_LABELS: Record<DonationStatus, string> = {
  available: 'Available',
  pending: 'Pending',
  accepted: 'Accepted',
  expired: 'Expired',
  delivered: 'Delivered',
};

function getStatusColors(
  status: DonationStatus,
  colors: typeof Colors.light | typeof Colors.dark
) {
  switch (status) {
    case 'available':
      return { fg: colors.success, bg: colors.successSoft };
    case 'pending':
      return { fg: colors.warning, bg: colors.warningSoft };
    case 'expired':
      return { fg: colors.error, bg: colors.errorSoft };
    case 'accepted':
      return { fg: colors.info, bg: colors.infoSoft };
    case 'delivered':
      return { fg: colors.primary, bg: colors.backgroundElement };
  }
}

export default function DonationStatusBadge({ status }: { status: DonationStatus }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { fg, bg } = getStatusColors(status, colors);

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[Typography.caption, { color: fg, fontWeight: '600' }]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
  },
});