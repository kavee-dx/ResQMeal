// frontend/src/screens/donation-flow/kaveesha-DetailsScreen.tsx
// Step 2 of 5 — Food Details + Photo
// Owner: Kaveesha

import React, { useState } from 'react';

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CreateDonationFlowParamList } from '../../navigation/kaveesha-createDonationFlow.types';

import {
  colors,
  radius,
  shadow,
  spacing,
  typography,
} from '../../styles/kaveesha-theme';

import KaveeshaStepProgress from '../../components/kaveesha-StepProgress';

import KaveeshaVoiceAssistantModal, {
  VoiceFieldKey,
} from '../../components/kaveesha-VoiceAssistantModal';

import { useCreateDonation } from '../../context/kaveesha-CreateDonationContext';

type Props = NativeStackScreenProps<
  CreateDonationFlowParamList,
  'Details'
>;

const QUANTITY_UNITS = [
  'kg',
  'g',
  'L',
  'mL',
  'items',
  'boxes',
  'trays',
  'packs',
  'other',
] as const;

const STORAGE_OPTIONS = [
  'Refrigerated',
  'Frozen',
  'Room Temperature',
  'Other',
] as const;

export default function DetailsScreen({ navigation }: Props) {
  const { state, update } = useCreateDonation();

  const [voiceVisible, setVoiceVisible] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  const quantityNumber = Number(state.quantity);
  const portionsNumber = Number(state.portions);

  const canContinue =
    state.foodType.trim().length > 0 &&
    state.quantity.trim().length > 0 &&
    Number.isFinite(quantityNumber) &&
    quantityNumber > 0 &&
    state.portions.trim().length > 0 &&
    Number.isFinite(portionsNumber) &&
    portionsNumber > 0 &&
    state.preparationTime.trim().length > 0 &&
    state.expiryTime.trim().length > 0 &&
    state.pickupLocation.trim().length > 0 &&
    !!state.photoBase64;

  const pickPhoto = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Please allow photo library access so you can add a food photo.',
      );
      return;
    }

    setPickingPhoto(true);

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.5,
          base64: true,
        });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];

        update('photoUri', asset.uri);
        update('photoBase64', asset.base64 ?? null);
        update(
          'photoMimeType',
          asset.mimeType ?? 'image/jpeg',
        );
      }
    } catch (error) {
      console.error('[DetailsScreen] Photo selection failed:', error);

      Alert.alert(
        'Photo error',
        'Could not select the photo. Please try again.',
      );
    } finally {
      setPickingPhoto(false);
    }
  };

  const handleVoiceComplete = (
    answers: Partial<Record<VoiceFieldKey, string>>,
  ) => {
    (
      Object.keys(answers) as VoiceFieldKey[]
    ).forEach((key) => {
      const value = answers[key];

      if (value) {
        update(key, value);
      }
    });

    setVoiceVisible(false);
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconCircleButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Food Details
        </Text>

        <TouchableOpacity
          style={styles.voiceCornerButton}
          onPress={() => setVoiceVisible(true)}
        >
          <Ionicons
            name="mic"
            size={18}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>

      <KaveeshaStepProgress
        step={2}
        total={5}
        label="Food Information"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <FormField
          label="Food Type"
          placeholder="e.g. Vegetable Fried Rice"
          value={state.foodType}
          onChangeText={(value: string) =>
            update('foodType', value)
          }
        />

        <FormField
          label="Category"
          placeholder="e.g. Cooked Meal, Bakery, Produce"
          value={state.category}
          onChangeText={(value: string) =>
            update('category', value)
          }
        />

        <View style={styles.rowFields}>
          <View style={styles.quantityField}>
            <FormField
              label="Quantity"
              placeholder="e.g. 250"
              value={state.quantity}
              onChangeText={(value: string) => {
                const cleaned = value.replace(/[^0-9.]/g, '');
                update('quantity', cleaned);
              }}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.unitField}>
            <Text style={styles.fieldLabel}>
              Unit
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.unitScroll}
            >
              {QUANTITY_UNITS.map((unit) => {
                const selected =
                  state.quantityUnit === unit;

                return (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitPill,
                      selected &&
                        styles.unitPillSelected,
                    ]}
                    onPress={() =>
                      update(
                        'quantityUnit',
                        unit,
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.unitPillText,
                        selected &&
                          styles.unitPillTextSelected,
                      ]}
                    >
                      {unit}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <FormField
          label="Portions"
          placeholder="e.g. 12"
          value={state.portions}
          onChangeText={(value: string) => {
            const cleaned = value.replace(/[^0-9]/g, '');
            update('portions', cleaned);
          }}
          keyboardType="numeric"
        />

        <View style={styles.rowFields}>
          <View style={styles.halfField}>
            <FormField
              label="Preparation Time"
              placeholder="e.g. 10:00 AM"
              value={state.preparationTime}
              onChangeText={(value: string) =>
                update(
                  'preparationTime',
                  value,
                )
              }
              icon="restaurant-outline"
            />
          </View>

          <View style={styles.halfField}>
            <FormField
              label="Expiry Time"
              placeholder="e.g. 8:00 PM"
              value={state.expiryTime}
              onChangeText={(value: string) =>
                update('expiryTime', value)
              }
              icon="hourglass-outline"
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>
          Storage Condition
        </Text>

        <View style={styles.storageOptions}>
          {STORAGE_OPTIONS.map((option) => {
            const selected =
              state.storageCondition === option;

            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.storagePill,
                  selected &&
                    styles.storagePillSelected,
                ]}
                onPress={() =>
                  update(
                    'storageCondition',
                    option,
                  )
                }
              >
                <Text
                  style={[
                    styles.storageText,
                    selected &&
                      styles.storageTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FormField
          label="Pickup Location"
          placeholder="Enter address or drop a pin"
          value={state.pickupLocation}
          onChangeText={(value: string) =>
            update('pickupLocation', value)
          }
          icon="location-outline"
        />

        <FormField
          label="Pickup District"
          placeholder="e.g. Colombo"
          value={state.pickupDistrict}
          onChangeText={(value: string) =>
            update('pickupDistrict', value)
          }
        />

        <FormField
          label="Additional Details"
          placeholder="Anything the recipient should know..."
          value={state.additionalDetails}
          onChangeText={(value: string) =>
            update(
              'additionalDetails',
              value,
            )
          }
          multiline
        />

        <Text style={styles.sectionTitle}>
          Food Photo
        </Text>

        <TouchableOpacity
          style={styles.photoUpload}
          onPress={pickPhoto}
          disabled={pickingPhoto}
          activeOpacity={0.85}
        >
          {state.photoUri ? (
            <Image
              source={{
                uri: state.photoUri,
              }}
              style={styles.photoPreview}
              resizeMode="cover"
            />
          ) : (
            <>
              <View
                style={styles.photoIconWrap}
              >
                <Ionicons
                  name="camera-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>

              <Text
                style={styles.photoUploadText}
              >
                {pickingPhoto
                  ? 'Opening gallery...'
                  : 'Tap to add a photo'}
              </Text>

              <Text
                style={styles.photoUploadHint}
              >
                AI will screen it on the next step
              </Text>
            </>
          )}
        </TouchableOpacity>

        {state.photoUri && (
          <TouchableOpacity
            onPress={pickPhoto}
            style={styles.retakeLink}
          >
            <Ionicons
              name="refresh-outline"
              size={14}
              color={colors.primary}
            />

            <Text
              style={styles.retakeLinkText}
            >
              Choose a different photo
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !canContinue &&
              styles.continueButtonDisabled,
          ]}
          disabled={!canContinue}
          onPress={() =>
            navigation.navigate('Analysis')
          }
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>
            Continue
          </Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>

      <KaveeshaVoiceAssistantModal
        visible={voiceVisible}
        onComplete={handleVoiceComplete}
      />
    </SafeAreaView>
  );
}

function FormField({
  label,
  half,
  icon,
  ...inputProps
}: any) {
  return (
    <View
      style={[
        styles.fieldWrap,
        half && { width: '48%' },
      ]}
    >
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <View
        style={[
          styles.fieldInputWrap,
          inputProps.multiline && {
            height: 92,
            alignItems: 'flex-start',
            paddingTop: 12,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={colors.textMuted}
            style={{ marginRight: 8 }}
          />
        )}

        <TextInput
          placeholderTextColor={
            colors.textMuted
          }
          style={styles.fieldInput}
          {...inputProps}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

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

  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },

  voiceCornerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  rowFields: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  quantityField: {
    width: '48%',
  },

  unitField: {
    width: '48%',
    marginBottom: spacing.md,
  },

  halfField: {
    width: '48%',
  },

  fieldWrap: {
    marginBottom: spacing.md,
  },

  fieldLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 6,
  },

  fieldInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 50,
  },

  fieldInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },

  unitScroll: {
    gap: 6,
    paddingVertical: 2,
  },

  unitPill: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  unitPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  unitPillText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  unitPillTextSelected: {
    color: colors.white,
  },

  storageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },

  storagePill: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  storagePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  storageText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  storageTextSelected: {
    color: colors.white,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

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

  photoPreview: {
    width: '100%',
    height: 200,
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

  photoUploadText: {
    ...typography.label,
    color: colors.primary,
  },

  photoUploadHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  retakeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },

  retakeLinkText: {
    ...typography.label,
    color: colors.primary,
  },

  footer: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },

  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 17,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },

  continueButtonDisabled: {
    opacity: 0.5,
  },

  continueText: {
    ...typography.button,
    color: colors.white,
  },
});