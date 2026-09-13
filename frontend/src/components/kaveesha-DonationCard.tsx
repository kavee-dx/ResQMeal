// frontend/src/components/kaveesha-DonationCard.tsx
// Donation list item used on the donor dashboard.
// Owner: Kaveesha

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadow, spacing } from '../styles/kaveesha-theme';
import { Donation } from '../types/kaveesha-donation.types';

const URGENCY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  HIGH: { label: 'URGENT', bg: colors.urgentSoft, text: colors.urgent },
  MEDIUM: { label: 'EXPIRING SOON', bg: colors.mediumSoft, text: colors.medium },
  NORMAL: { label: 'NORMAL', bg: colors.accentSoft, text: colors.primary },
};

interface Props {
  donation: Donation;
  onPress?: () => void;
}

export default function KaveeshaDonationCard({ donation, onPress }: Props) {
  const urgency = URGENCY_CONFIG[donation.urgency];

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.imagePlaceholder}>
        <Ionicons name="fast-food" size={28} color={colors.primaryLight} />
        <View style={[styles.badge, { backgroundColor: urgency.bg }]}>
          <Text style={[styles.badgeText, { color: urgency.text }]}>{urgency.label}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {donation.foodName}
        </Text>
        <Text style={styles.subtitle}>
          {donation.category} · {donation.quantity}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{donation.pickupLocation}</Text>
          <Ionicons
            name="time-outline"
            size={13}
            color={colors.textMuted}
            style={{ marginLeft: 10 }}
          />
          <Text style={styles.metaText}>{donation.expiresInHours}h left</Text>
        </View>
      </View>

      <View style={styles.statusPill}>
        <Text style={styles.statusText}>{donation.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadow.card,
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  badge: {
    position: 'absolute',
    top: -6,
    left: -6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 8 },
  info: { flex: 1 },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginLeft: 3 },
  statusPill: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: { fontFamily: fonts.bodySemiBold, fontSize: 9, color: colors.primary },
});