// frontend/src/screens/donation-flow/kaveesha-DetailsScreen.tsx
// Step 2 of 5 — Food Details + Photo. The corner mic button opens a full
// conversational voice assistant that asks each question aloud and
// auto-fills the form from the spoken answers.
//
// Requires: npx expo install expo-image-picker expo-speech expo-audio expo-file-system
// Owner: Kaveesha

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CreateDonationFlowParamList } from '../../navigation/kaveesha-createDonationFlow.types';
import { colors, radius, shadow, spacing, typography } from '../../styles/kaveesha-theme';
import KaveeshaStepProgress from '../../components/kaveesha-StepProgress';
import KaveeshaVoiceAssistantModal, { VoiceFieldKey } from '../../components/kaveesha-VoiceAssistantModal';
import { useCreateDonation } from '../../context/kaveesha-CreateDonationContext';

type Props = NativeStackScreenProps<CreateDonationFlowParamList, 'Details'>;

export default function DetailsScreen({ navigation }: Props) {
  const { state, update } = useCreateDonation();
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  const canContinue =
    state.foodType.trim().length > 0 && state.quantity.trim().length > 0 && !!state.photoBase64;

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Please allow photo library access so you can add a food photo.',
      );
      return;
    }

    setPickingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5, // compressed — keeps the base64 payload small and fast to upload
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        update('photoUri', asset.uri);
        update('photoBase64', asset.base64 ?? null);
        update('photoMimeType', asset.mimeType ?? 'image/jpeg');
      }
    } finally {
      setPickingPhoto(false);
    }
  };

  const handleVoiceComplete = (answers: Partial<Record<VoiceFieldKey, string>>) => {
    (Object.keys(answers) as VoiceFieldKey[]).forEach((key) => {
      const value = answers[key];
      if (value) update(key, value);
    });
    setVoiceVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconCircleButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food Details</Text>
        <TouchableOpacity style={styles.voiceCornerButton} onPress={() => setVoiceVisible(true)}>
          <Ionicons name="mic" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      <KaveeshaStepProgress step={2} total={5} label="Food Information" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FormField
          label="Food Type"
          placeholder="e.g. Vegetable Fried Rice"
          value={state.foodType}
          onChangeText={(v: string) => update('foodType', v)}
        />
        <FormField
          label="Category"
          placeholder="e.g. Cooked Meal, Bakery, Produce"
          value={state.category}
          onChangeText={(v: string) => update('category', v)}
        />

        <View style={styles.rowFields}>
          <FormField
            label="Quantity"
            placeholder="e.g. 5 kg"
            value={state.quantity}
            onChangeText={(v: string) => update('quantity', v)}
            half
          />
          <FormField
            label="Portions"
            placeholder="e.g. 12"
            value={state.portions}
            onChangeText={(v: string) => update('portions', v)}
            half
            keyboardType="numeric"
          />
        </View>

        <View style={styles.rowFields}>
          <FormField
            label="Preparation Time"
            placeholder="e.g. 10:00 AM"
            value={state.preparationTime}
            onChangeText={(v: string) => update('preparationTime', v)}
            half
            icon="restaurant-outline"
          />
          <FormField
            label="Expiry Time"
            placeholder="e.g. 8:00 PM"
            value={state.expiryTime}
            onChangeText={(v: string) => update('expiryTime', v)}
            half
            icon="hourglass-outline"
          />
        </View>

        <FormField
          label="Storage Condition"
          placeholder="e.g. Refrigerated, Room Temperature"
          value={state.storageCondition}
          onChangeText={(v: string) => update('storageCondition', v)}
          icon="snow-outline"
        />
        <FormField
          label="Pickup Location"
          placeholder="Enter address or drop a pin"
          value={state.pickupLocation}
          onChangeText={(v: string) => update('pickupLocation', v)}
          icon="location-outline"
        />
        <FormField
          label="Additional Details"
          placeholder="Anything the recipient should know..."
          value={state.additionalDetails}
          onChangeText={(v: string) => update('additionalDetails', v)}
          multiline
        />

        <Text style={styles.sectionTitle}>Food Photo</Text>
        <TouchableOpacity
          style={styles.photoUpload}
          onPress={pickPhoto}
          disabled={pickingPhoto}
          activeOpacity={0.85}
        >
          {state.photoUri ? (
            <Image source={{ uri: state.photoUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <>
              <View style={styles.photoIconWrap}>
                <Ionicons name="camera-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.photoUploadText}>
                {pickingPhoto ? 'Opening gallery...' : 'Tap to add a photo'}
              </Text>
              <Text style={styles.photoUploadHint}>AI will screen it on the next step</Text>
            </>
          )}
        </TouchableOpacity>
        {state.photoUri && (
          <TouchableOpacity onPress={pickPhoto} style={styles.retakeLink}>
            <Ionicons name="refresh-outline" size={14} color={colors.primary} />
            <Text style={styles.retakeLinkText}>Choose a different photo</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          disabled={!canContinue}
          onPress={() => navigation.navigate('Analysis')}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      <KaveeshaVoiceAssistantModal visible={voiceVisible} onComplete={handleVoiceComplete} />
    </SafeAreaView>
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
  voiceCornerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
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
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  photoUpload: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: 4,
    overflow: 'hidden',
    minHeight: 160,
  },
  photoPreview: { width: '100%', height: 200 },
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
  retakeLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: spacing.sm },
  retakeLinkText: { ...typography.label, color: colors.primary },
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
  continueButtonDisabled: { opacity: 0.5 },
  continueText: { ...typography.button, color: colors.white },
});