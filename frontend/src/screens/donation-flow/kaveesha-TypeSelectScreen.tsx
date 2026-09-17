// frontend/src/screens/donation-flow/kaveesha-TypeSelectScreen.tsx
// Step 1 of 5 — Donation Type
// Owner: Kaveesha

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CreateDonationFlowParamList } from '../../navigation/kaveesha-createDonationFlow.types';
import { colors, radius, shadow, spacing, typography } from '../../styles/kaveesha-theme';
import KaveeshaStepProgress from '../../components/kaveesha-StepProgress';
import { DonationTypeOption, useCreateDonation } from '../../context/kaveesha-CreateDonationContext';

type Props = NativeStackScreenProps<CreateDonationFlowParamList, 'TypeSelect'>;

export default function TypeSelectScreen({ navigation }: Props) {
  const { state, update } = useCreateDonation();

  const select = (type: DonationTypeOption) => update('donationType', type);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconCircleButton} onPress={() => navigation.getParent()?.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Donation</Text>
        <View style={{ width: 36 }} />
      </View>

      <KaveeshaStepProgress step={1} total={5} label="Donation Type" />

      <View style={styles.body}>
        <Text style={styles.heading}>What kind of donation is this?</Text>
        <Text style={styles.subheading}>This helps us prioritize pickup and matching.</Text>

        <TouchableOpacity
          style={[styles.card, state.donationType === 'NORMAL' && styles.cardSelectedNormal]}
          onPress={() => select('NORMAL')}
          activeOpacity={0.85}
        >
          <View style={[styles.iconWrap, state.donationType === 'NORMAL' && { backgroundColor: colors.white }]}>
            <Ionicons
              name="time-outline"
              size={26}
              color={state.donationType === 'NORMAL' ? colors.primary : colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, state.donationType === 'NORMAL' && { color: colors.primary }]}>
              Normal Donation
            </Text>
            <Text style={styles.cardSubtitle}>Enough time before expiry — standard matching flow.</Text>
          </View>
          {state.donationType === 'NORMAL' ? (
            <View style={[styles.radioSelected, { borderColor: colors.primary }]}>
              <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
            </View>
          ) : (
            <View style={styles.radioEmpty} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, state.donationType === 'URGENT' && styles.cardSelectedUrgent]}
          onPress={() => select('URGENT')}
          activeOpacity={0.85}
        >
          <View style={[styles.iconWrap, state.donationType === 'URGENT' && { backgroundColor: colors.white }]}>
            <Ionicons
              name="alert-circle-outline"
              size={26}
              color={state.donationType === 'URGENT' ? colors.urgent : colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, state.donationType === 'URGENT' && { color: colors.urgent }]}>
              Urgent Donation
            </Text>
            <Text style={styles.cardSubtitle}>Needs rescue within 10 hours — fast-tracked to volunteers.</Text>
          </View>
          {state.donationType === 'URGENT' ? (
            <View style={[styles.radioSelected, { borderColor: colors.urgent }]}>
              <View style={[styles.radioDot, { backgroundColor: colors.urgent }]} />
            </View>
          ) : (
            <View style={styles.radioEmpty} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate('Details')}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  body: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  heading: { ...typography.h1, fontSize: 22, color: colors.textPrimary },
  subheading: { ...typography.body, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  cardSelectedNormal: { borderColor: colors.primary, backgroundColor: colors.accentSoft },
  cardSelectedUrgent: { borderColor: colors.urgent, backgroundColor: colors.urgentSoft },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...typography.cardTitle, fontSize: 15, color: colors.textPrimary },
  cardSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 3 },
  radioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border },
  radioSelected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  footer: { position: 'absolute', bottom: spacing.lg, left: spacing.lg, right: spacing.lg },
  continueButton: {
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
  continueText: { ...typography.button, color: colors.white },
});