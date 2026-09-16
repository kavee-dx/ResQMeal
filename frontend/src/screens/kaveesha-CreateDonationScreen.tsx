// frontend/src/screens/kaveesha-CreateDonationScreen.tsx
// This screen manages its own local form state and logs the payload on
// submit. Wire `handleSubmit` up to POST /api/donations once that endpoint
// exists.
// Owner: Kaveesha

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import { colors, radius, shadow, spacing, typography } from '../styles/kaveesha-theme';
import KaveeshaBottomTabBar, { TabKey } from '../components/kaveesha-BottomTabBar';
import {
  CreateDonationFormState,
  DonationTypeOption,
  InputMethod,
} from '../types/kaveesha-donation.types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateDonation'>;

const INITIAL_STATE: CreateDonationFormState = {
  donationType: 'NORMAL',
  inputMethod: 'MANUAL',
  foodType: '',
  category: '',
  quantity: '',
  portions: '',
  preparationTime: '',
  expiryTime: '',
  storageCondition: '',
  pickupLocation: '',
  additionalDetails: '',
  photoUri: null,
};

export default function KaveeshaCreateDonationScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('Create');
  const [form, setForm] = useState<CreateDonationFormState>(INITIAL_STATE);

  const update = <K extends keyof CreateDonationFormState>(
    key: K,
    value: CreateDonationFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTabPress = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'Home' && navigation.canGoBack()) navigation.goBack();
  };

  const handleSubmit = () => {
    // TODO: connect to POST /api/donations once the backend endpoint is ready.
    console.log('Donation form submitted:', form);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Donation</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Donation type */}
        <Text style={styles.label}>Donation Type</Text>
        <View style={styles.typeRow}>
          <TypeCard
            title="Normal"
            subtitle="Enough time before expiry"
            icon="time-outline"
            selected={form.donationType === 'NORMAL'}
            onPress={() => update('donationType', 'NORMAL' as DonationTypeOption)}
          />
          <TypeCard
            title="Urgent"
            subtitle="Rescue within 10 hours"
            icon="alert-circle-outline"
            selected={form.donationType === 'URGENT'}
            onPress={() => update('donationType', 'URGENT' as DonationTypeOption)}
            urgent
          />
        </View>

        {/* Input method */}
        <Text style={styles.label}>How would you like to add details?</Text>
        <View style={styles.methodRow}>
          <MethodButton
            title="Manual Entry"
            icon="create-outline"
            selected={form.inputMethod === 'MANUAL'}
            onPress={() => update('inputMethod', 'MANUAL' as InputMethod)}
          />
          <MethodButton
            title="Voice Entry"
            icon="mic-outline"
            selected={form.inputMethod === 'VOICE'}
            onPress={() => update('inputMethod', 'VOICE' as InputMethod)}
          />
        </View>

        {/* Photo upload */}
        <Text style={styles.label}>Food Photo</Text>
        <TouchableOpacity style={styles.photoUpload}>
          <View style={styles.photoIconWrap}>
            <Ionicons name="camera-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.photoUploadText}>Tap to add a photo</Text>
          <Text style={styles.photoUploadHint}>AI will screen it for visible quality issues</Text>
        </TouchableOpacity>

        {/* Food details form */}
        <Text style={styles.sectionTitle}>Food Information</Text>

        <FormField
          label="Food Type"
          placeholder="e.g. Vegetable Fried Rice"
          value={form.foodType}
          onChangeText={(v: string) => update('foodType', v)}
        />
        <FormField
          label="Category"
          placeholder="e.g. Cooked Meal, Bakery, Produce"
          value={form.category}
          onChangeText={(v: string) => update('category', v)}
        />

        <View style={styles.rowFields}>
          <FormField
            label="Quantity"
            placeholder="e.g. 5 kg"
            value={form.quantity}
            onChangeText={(v: string) => update('quantity', v)}
            half
          />
          <FormField
            label="Portions"
            placeholder="e.g. 12"
            value={form.portions}
            onChangeText={(v: string) => update('portions', v)}
            half
            keyboardType="numeric"
          />
        </View>

        <View style={styles.rowFields}>
          <FormField
            label="Preparation Time"
            placeholder="e.g. 10:00 AM"
            value={form.preparationTime}
            onChangeText={(v: string) => update('preparationTime', v)}
            half
            icon="restaurant-outline"
          />
          <FormField
            label="Expiry Time"
            placeholder="e.g. 8:00 PM"
            value={form.expiryTime}
            onChangeText={(v: string) => update('expiryTime', v)}
            half
            icon="hourglass-outline"
          />
        </View>

        <FormField
          label="Storage Condition"
          placeholder="e.g. Refrigerated, Room Temperature"
          value={form.storageCondition}
          onChangeText={(v: string) => update('storageCondition', v)}
          icon="snow-outline"
        />
        <FormField
          label="Pickup Location"
          placeholder="Enter address or drop a pin"
          value={form.pickupLocation}
          onChangeText={(v: string) => update('pickupLocation', v)}
          icon="location-outline"
        />
        <FormField
          label="Additional Details"
          placeholder="Anything the recipient should know..."
          value={form.additionalDetails}
          onChangeText={(v: string) => update('additionalDetails', v)}
          multiline
        />

        <View style={{ height: 140 }} />
      </ScrollView>

      <View style={styles.submitBar}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.submitButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      <KaveeshaBottomTabBar active={activeTab} onNavigate={handleTabPress} />
    </SafeAreaView>
  );
}

/* ---------- Small presentational sub-components ---------- */

function TypeCard({ title, subtitle, icon, selected, onPress, urgent }: any) {
  const accent = urgent ? colors.urgent : colors.primary;
  return (
    <TouchableOpacity
      style={[
        styles.typeCard,
        selected && { borderColor: accent, backgroundColor: urgent ? colors.urgentSoft : colors.accentSoft },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {selected && (
        <View style={[styles.checkBadge, { backgroundColor: accent }]}>
          <Ionicons name="checkmark" size={11} color={colors.white} />
        </View>
      )}
      <View style={[styles.typeIconWrap, selected && { backgroundColor: colors.white }]}>
        <Ionicons name={icon} size={20} color={selected ? accent : colors.textMuted} />
      </View>
      <Text style={[styles.typeCardTitle, selected && { color: accent }]}>{title}</Text>
      <Text style={styles.typeCardSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function MethodButton({ title, icon, selected, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.methodButton, selected && styles.methodButtonSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={18} color={selected ? colors.white : colors.primary} />
      <Text style={[styles.methodButtonText, selected && { color: colors.white }]}>{title}</Text>
    </TouchableOpacity>
  );
}

function FormField({ label, half, icon, ...inputProps }: any) {
  return (
    <View style={[styles.fieldWrap, half && { width: '48%' }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.fieldInputWrap,
          inputProps.multiline && { height: 92, alignItems: 'flex-start', paddingTop: 12 },
        ]}
      >
        {icon && <Ionicons name={icon} size={16} color={colors.textMuted} style={{ marginRight: 8 }} />}
        <TextInput placeholderTextColor={colors.textMuted} style={styles.fieldInput} {...inputProps} />
      </View>
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
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  scrollContent: { paddingHorizontal: spacing.lg },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  typeCardTitle: { ...typography.cardTitle, fontSize: 15, color: colors.textPrimary },
  typeCardSubtitle: { ...typography.bodySmall, color: colors.textSecondary },
  methodRow: { flexDirection: 'row', gap: 12 },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 13,
  },
  methodButtonSelected: { backgroundColor: colors.primary },
  methodButtonText: { ...typography.label, color: colors.primary },
  photoUpload: {
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: 4,
  },
  photoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...shadow.soft,
  },
  photoUploadText: { ...typography.label, color: colors.primary },
  photoUploadHint: { ...typography.bodySmall, color: colors.textSecondary },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  rowFields: { flexDirection: 'row', justifyContent: 'space-between' },
  fieldWrap: { marginBottom: spacing.md },
  fieldLabel: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 6 },
  fieldInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 50,
  },
  fieldInput: { flex: 1, ...typography.body, color: colors.textPrimary },
  submitBar: {
    position: 'absolute',
    bottom: 92,
    left: spacing.lg,
    right: spacing.lg,
  },
  submitButton: {
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
  submitButtonText: { ...typography.button, color: colors.white },
});