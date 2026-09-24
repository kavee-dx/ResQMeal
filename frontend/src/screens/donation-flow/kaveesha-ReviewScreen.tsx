// frontend/src/screens/donation-flow/kaveesha-ReviewScreen.tsx
// Step 5 of 5 — Review & Publish
// Owner: Kaveesha

import React, { useState } from 'react';

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

import { useCreateDonation } from '../../context/kaveesha-CreateDonationContext';

import {
  createDonation,
} from '../../services/kaveesha-donationApi';

type Props = NativeStackScreenProps<
  CreateDonationFlowParamList,
  'Review'
>;

const AI_LABEL: Record<string, string> = {
  GOOD: 'No obvious visual concern',
  REVIEW: 'Reviewed manually',
  CONCERN: 'Flagged — resolved',
  PENDING: 'Not available',
};

export default function ReviewScreen({
  navigation,
}: Props) {
  const { state, reset } =
    useCreateDonation();

  const [publishing, setPublishing] =
    useState(false);

  const handlePublish = async () => {
    if (publishing) {
      return;
    }

    setPublishing(true);

    try {
      const donation =
        await createDonation(state);

      Alert.alert(
        'Donation Published',
        `Your donation ${
          donation.donationCode
            ? `(${donation.donationCode}) `
            : ''
        }has been published successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              reset();

              navigation
                .getParent()
                ?.goBack();
            },
          },
        ],
      );
    } catch (error: any) {
      console.error(
        '[ReviewScreen] Publish failed:',
        error,
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Could not publish the donation. Please try again.';

      Alert.alert(
        'Publication Failed',
        message,
      );
    } finally {
      setPublishing(false);
    }
  };

  const isUrgent =
    state.donationType === 'URGENT';

  const quantityDisplay =
    state.quantity
      ? `${state.quantity} ${state.quantityUnit}`
      : '—';

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconCircleButton}
          onPress={() =>
            navigation.goBack()
          }
          disabled={publishing}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Review & Publish
        </Text>

        <View style={{ width: 36 }} />
      </View>

      <KaveeshaStepProgress
        step={5}
        total={5}
        label="Final Review"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <View style={styles.photoPreview}>
          {state.photoUri ? (
            <Image
              source={{
                uri: state.photoUri,
              }}
              style={styles.photoImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="fast-food"
              size={34}
              color={colors.primaryLight}
            />
          )}

          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: isUrgent
                  ? colors.urgentSoft
                  : colors.accentSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                {
                  color: isUrgent
                    ? colors.urgent
                    : colors.primary,
                },
              ]}
            >
              {state.donationType}
            </Text>
          </View>
        </View>

        <Text style={styles.foodName}>
          {state.foodType ||
            'Untitled donation'}
        </Text>

        <Text style={styles.foodCategory}>
          {state.category ||
            'Uncategorized'}
        </Text>

        <View style={styles.card}>
          <ReviewRow
            icon="scale-outline"
            label="Quantity"
            value={quantityDisplay}
          />

          <ReviewRow
            icon="people-outline"
            label="Portions"
            value={
              state.portions || '—'
            }
          />

          <ReviewRow
            icon="restaurant-outline"
            label="Prepared"
            value={
              state.preparationTime ||
              '—'
            }
          />

          <ReviewRow
            icon="hourglass-outline"
            label="Expires"
            value={
              state.expiryTime || '—'
            }
          />

          <ReviewRow
            icon="snow-outline"
            label="Storage"
            value={
              state.storageCondition ||
              '—'
            }
          />

          <ReviewRow
            icon="location-outline"
            label="Pickup"
            value={
              state.pickupLocation ||
              '—'
            }
            last
          />
        </View>

        {state.additionalDetails ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>
              Additional Details
            </Text>

            <Text style={styles.detailsText}>
              {state.additionalDetails}
            </Text>
          </View>
        ) : null}

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons
              name="scan-outline"
              size={16}
              color={colors.primary}
            />

            <Text style={styles.statusLabel}>
              AI Visual Screening
            </Text>

            <Text style={styles.statusValue}>
              {
                AI_LABEL[
                  state.aiResult
                ]
              }
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={colors.primary}
            />

            <Text style={styles.statusLabel}>
              Safety Checklist
            </Text>

            <Text style={styles.statusValue}>
              Complete
            </Text>
          </View>
        </View>

        {state.aiReason ? (
          <Text
            style={styles.aiReasonText}
          >
            "{state.aiReason}"
          </Text>
        ) : null}

        <View style={styles.safetySummary}>
          <Text style={styles.safetySummaryTitle}>
            Safety Information
          </Text>

          <SafetyRow
            label="Storage"
            value={state.safety.storage}
          />

          <SafetyRow
            label="Temperature"
            value={
              state.safety.temperature
            }
          />

          <SafetyRow
            label="Handling"
            value={
              state.safety.handling
            }
          />

          <SafetyRow
            label="Packaging"
            value={
              state.safety.packaging
            }
          />

          <SafetyRow
            label="Allergens"
            value={
              state.safety.allergens
            }
          />
        </View>

        <TouchableOpacity
          style={styles.editLink}
          onPress={() =>
            navigation.navigate(
              'Details',
            )
          }
          disabled={publishing}
        >
          <Ionicons
            name="create-outline"
            size={14}
            color={colors.primary}
          />

          <Text
            style={styles.editLinkText}
          >
            Edit food details
          </Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.publishButton,
            publishing &&
              styles.publishButtonDisabled,
          ]}
          onPress={handlePublish}
          disabled={publishing}
          activeOpacity={0.85}
        >
          {publishing ? (
            <>
              <ActivityIndicator
                color={colors.white}
              />

              <Text
                style={styles.publishText}
              >
                Publishing...
              </Text>
            </>
          ) : (
            <>
              <Text
                style={styles.publishText}
              >
                Publish Donation
              </Text>

              <Ionicons
                name="leaf"
                size={18}
                color={colors.white}
              />
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
    <View
      style={[
        styles.reviewRow,
        !last &&
          styles.reviewRowBorder,
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={colors.textMuted}
      />

      <Text style={styles.reviewLabel}>
        {label}
      </Text>

      <Text
        style={styles.reviewValue}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function SafetyRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <View style={styles.safetyRow}>
      <Text style={styles.safetyLabel}>
        {label}
      </Text>

      <Text style={styles.safetyValue}>
        {value || '—'}
      </Text>
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

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  photoPreview: {
    height: 170,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  photoImage: {
    width: '100%',
    height: '100%',
  },

  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },

  typeBadgeText: {
    fontFamily:
      typography.kicker.fontFamily,
    fontSize: 10,
    letterSpacing: 0.6,
  },

  foodName: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },

  foodCategory: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    ...shadow.soft,
  },

  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },

  reviewRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  reviewLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
    width: 80,
  },

  reviewValue: {
    ...typography.label,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },

  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.soft,
  },

  detailsTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: 5,
  },

  detailsText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  statusCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: 10,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  statusLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },

  statusValue: {
    ...typography.label,
    color: colors.primaryDark,
  },

  aiReasonText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },

  safetySummary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.soft,
  },

  safetySummaryTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: 8,
  },

  safetyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },

  safetyLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },

  safetyValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },

  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: spacing.lg,
  },

  editLinkText: {
    ...typography.label,
    color: colors.primary,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  publishButton: {
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

  publishButtonDisabled: {
    opacity: 0.7,
  },

  publishText: {
    ...typography.button,
    color: colors.white,
  },
});