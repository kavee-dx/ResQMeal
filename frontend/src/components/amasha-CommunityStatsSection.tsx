import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/constants/theme'; 

interface CommunityStats {
  activeCampaigns: number;
  emergencyRequests: number;
  activeVolunteers: number;
  activeDonors: number;
  expiringSoon: number;
}


type Accent = 'primary' | 'success' | 'warning' | 'error' | 'info';

interface StatCardProps {
  label: string;
  value: number;
  accent: Accent;
  isUrgent?: boolean;
}

function StatCard({ label, value, accent, isUrgent }: StatCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const accentColor = colors[accent];
  const accentSoftKey = `${accent}Soft` as keyof typeof colors;
  const accentSoft = colors[accentSoftKey] ?? colors.backgroundElement;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isUrgent ? colors.error : colors.border,
        },
        Shadows.card,
      ]}
    >
      <View style={[styles.dotWrap, { backgroundColor: accentSoft }]}>
        <View style={[styles.dot, { backgroundColor: accentColor }]} />
      </View>

      <Text style={[Typography.h2, { color: colors.text, marginTop: Spacing.two }]}>
        {value}
      </Text>
      <Text style={[Typography.bodySmall, { color: colors.textSecondary, marginTop: Spacing.half }]}>
        {label}
      </Text>
    </View>
  );
}

interface CommunityStatsSectionProps {
  stats: CommunityStats | null;
  loading?: boolean;
}

export default function CommunityStatsSection({ stats, loading }: CommunityStatsSectionProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  if (loading || !stats) {
    return (
      <View style={[styles.section, { backgroundColor: colors.background, alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.section, { backgroundColor: colors.background }]}>
      <Text style={[Typography.h3, { color: colors.text }]}>Community Overview</Text>
      <Text style={[Typography.bodySmall, { color: colors.textSecondary, marginBottom: Spacing.three }]}>
        Live snapshot of campaigns, volunteers, and donors
      </Text>

      <View style={styles.grid}>
        <StatCard label="Active Campaigns" value={stats.activeCampaigns} accent="primary" />
        <StatCard
          label="Emergency Requests"
          value={stats.emergencyRequests}
          accent="error"
          isUrgent={stats.emergencyRequests > 0}
        />
        <StatCard label="Active Volunteers" value={stats.activeVolunteers} accent="success" />
        <StatCard label="Active Donors" value={stats.activeDonors} accent="info" />
        <StatCard label="Expiring Soon" value={stats.expiringSoon} accent="warning" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '47%',
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  dotWrap: {
    alignSelf: 'flex-start',
    padding: Spacing.two,
    borderRadius: Radius.pill,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
});