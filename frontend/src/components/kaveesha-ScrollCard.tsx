// frontend/src/components/kaveesha-ScrollCard.tsx
// One card design reused across every horizontal-scroll section
// (Your Donations, NGO Campaigns, Available Recipients, Community Posts)
// so the whole dashboard reads as a single, consistent system.
// Owner: Kaveesha

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../styles/kaveesha-theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  metaIcon?: keyof typeof Ionicons.glyphMap;
  metaText?: string;
  footerText?: string;
  badgeLabel?: string;
  badgeBg?: string;
  badgeColor?: string;
  onPress?: () => void;
}

export default function KaveeshaScrollCard({
  icon,
  title,
  subtitle,
  metaIcon,
  metaText,
  footerText,
  badgeLabel,
  badgeBg = colors.accentSoft,
  badgeColor = colors.primary,
  onPress,
}: Props) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.imageBlock}>
        <Ionicons name={icon} size={30} color={colors.primaryLight} />
        {badgeLabel ? (
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>

        {metaText ? (
          <View style={styles.metaRow}>
            {metaIcon && <Ionicons name={metaIcon} size={12} color={colors.textMuted} />}
            <Text style={styles.metaText} numberOfLines={1}>
              {metaText}
            </Text>
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={styles.footerText} numberOfLines={1}>
            {footerText}
          </Text>
          <View style={styles.arrowButton}>
            <Ionicons name="arrow-forward" size={13} color={colors.white} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const CARD_WIDTH = 168;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginRight: spacing.md,
    overflow: 'hidden',
    ...shadow.card,
  },
  imageBlock: {
    height: 96,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: { fontFamily: typography.kicker.fontFamily, fontSize: 8.5, letterSpacing: 0.6 },
  content: { padding: spacing.sm + 2 },
  title: { ...typography.cardTitle, color: colors.textPrimary },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { ...typography.bodySmall, fontSize: 10.5, color: colors.textMuted, flexShrink: 1 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  footerText: { fontFamily: typography.label.fontFamily, fontSize: 11, color: colors.primaryDark, flex: 1, marginRight: 6 },
  arrowButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});