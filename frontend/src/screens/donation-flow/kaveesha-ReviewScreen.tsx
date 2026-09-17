// frontend/src/screens/donation-flow/kaveesha-ReviewScreen.tsx
// Step 5 of 5 — Review & Publish
// Owner: Kaveesha

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CreateDonationFlowParamList } from '../../navigation/kaveesha-createDonationFlow.types';
import { colors, radius, shadow, spacing, typography } from '../../styles/kaveesha-theme';
import KaveeshaStepProgress from '../../components/kaveesha-StepProgress';
import { useCreateDonation } from '../../context/kaveesha-CreateDonationContext';

type Props = NativeStackScreenProps<CreateDonationFlowParamList, 'Review'>;

const AI_LABEL: Record<string, string> = {
  GOOD: 'No visual concern',
  REVIEW: 'Reviewed manually',
  CONCERN: 'Flagged — resolved',
  PENDING: 'No visual concern',
};

export default function ReviewScreen({ navigation }: Props) {
  const { state, reset } = useCreateDonation();
  const [publishing, setPublishing] = useState(false);

  const handlePublish = () => {
    setPublishing(true);
    // TODO: connect to POST /api/donations with `state` as the payload.
    setTimeout(() => {
      setPublishing(false);
      reset();
      navigation.getParent()?.goBack();
    }, 1200);
  };

  const isUrgent = state.donationType === 'URGENT';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconCircleButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Publish</Text>
        <View style={{ width: 36 }} />
      </View>

      <KaveeshaStepProgress step={5} total={5} label="Final Review" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.photoPreview}>
          <Ionicons name="fast-food" size={34} color={colors.primaryLight} />
          <View style={[styles.typeBadge, { backgroundColor: isUrgent ? colors.urgentSoft : colors.accentSoft }]}>
            <Text style={[styles.typeBadgeText, { color: isUrgent ? colors.urgent : colors.primary }]}>
              {state.donationType}
            </Text>
          </View>
        </View>

        <Text style={styles.foodName}>{state.foodType || 'Untitled donation'}</Text>
        <Text style={styles.foodCategory}>{state.category || 'Uncategorized'}</Text>

        <View style={styles.card}>
          <ReviewRow icon="scale-outline" label="Quantity" value={state.quantity || '—'} />
          <ReviewRow icon="people-outline" label="Portions" value={state.portions || '—'} />
          <ReviewRow icon="restaurant-outline" label="Prepared" value={state.preparationTime || '—'} />
          <ReviewRow icon="hourglass-outline" label="Expires" value={state.expiryTime || '—'} />
          <ReviewRow icon="snow-outline" label="Storage" value={state.storageCondition || '—'} />
          <ReviewRow icon="location-outline" label="Pickup" value={state.pickupLocation || '—'} last />
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons name="scan-outline" size={16} color={colors.primary} />
            <Text style={styles.statusLabel}>AI Visual Screening</Text>
            <Text style={styles.statusValue}>{AI_LABEL[state.aiResult]}</Text>
          </View>
          <View style={styles.statusRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
            <Text style={styles.statusLabel}>Safety Checklist</Text>
            <Text style={styles.statusValue}>Complete</Text>
          </View>
        </View>
        {state.aiReason ? <Text style={styles.aiReasonText}>"{state.aiReason}"</Text> : null}

        <TouchableOpacity style={styles.editLink} onPress={() => navigation.navigate('Details')}>
          <Ionicons name="create-outline" size={14} color={colors.primary} />
          <Text style={styles.editLinkText}>Edit food details</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.publishButton} onPress={handlePublish} disabled={publishing} activeOpacity={0.85}>
          {publishing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.publishText}>Publish Donation</Text>
              <Ionicons name="leaf" size={18} color={colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ReviewRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.reviewRow, !last && styles.reviewRowBorder]}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  photoPreview: {
    height: 140,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
  typeBadgeText: { fontFamily: typography.kicker.fontFamily, fontSize: 10, letterSpacing: 0.6 },
  foodName: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md },
  foodCategory: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: spacing.lg, paddingHorizontal: spacing.md, ...shadow.soft },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  reviewRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewLabel: { ...typography.bodySmall, color: colors.textMuted, width: 80 },
  reviewValue: { ...typography.label, color: colors.textPrimary, flex: 1, textAlign: 'right' },
  statusCard: { backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, gap: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  statusValue: { ...typography.label, color: colors.primaryDark },
  aiReasonText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: spacing.lg },
  editLinkText: { ...typography.label, color: colors.primary },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 17,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  publishText: { ...typography.button, color: colors.white },
});