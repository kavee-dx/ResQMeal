// frontend/src/screens/donation-flow/kaveesha-ReviewScreen.tsx
// Step 5 of 5 — Review & Publish
// Owner: Kaveesha
//
// AI wording intentionally describes visual screening only.
// It does not confirm that food is safe or unsafe.

import React, { useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { CreateDonationFlowParamList } from '../../navigation/kaveesha-createDonationFlow.types';

import {
  colors,
  radius,
  shadow,
  spacing,
  typography,
} from '../../styles/kaveesha-theme';

import KaveeshaStepProgress from '../../components/kaveesha-StepProgress';

import { useCreateDonation } from '../../context/kaveesha-CreateDonationContext';

import { createDonation } from '../../services/kaveesha-donationApi';

type Props = NativeStackScreenProps<
  CreateDonationFlowParamList,
  'Review'
>;

type AiResultConfig = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  background: string;
};

const AI_RESULT_CONFIG: Record<string, AiResultConfig> = {
  GOOD: {
    icon: 'checkmark-circle-outline',
    title: 'No obvious visual concern',
    description:
      'The AI visual screening did not identify an obvious visible concern in the submitted photo.',
    color: colors.success,
    background: colors.accentSoft,
  },

  REVIEW: {
    icon: 'alert-circle-outline',
    title: 'Manual review recommended',
    description:
      'The AI visual screening identified something that may need closer attention.',
    color: colors.accent,
    background: colors.accentSoft,
  },

  CONCERN: {
    icon: 'close-circle-outline',
    title: 'Visible concern identified',
    description:
      'The AI visual screening identified a visible indicator that should be considered before donation.',
    color: colors.urgent,
    background: colors.urgentSoft,
  },

  PENDING: {
    icon: 'information-circle-outline',
    title: 'AI screening not performed',
    description:
      'AI visual screening was optional and was not performed for this donation.',
    color: colors.info,
    background: colors.primaryLight,
  },
};

export default function ReviewScreen({
  navigation,
}: Props) {
  const { state, reset } = useCreateDonation();

  const [publishing, setPublishing] = useState(false);

  const isUrgent = state.donationType === 'URGENT';

  const quantityDisplay = state.quantity
    ? `${state.quantity} ${state.quantityUnit}`
    : '—';

  const aiConfig = useMemo(
    () =>
      AI_RESULT_CONFIG[state.aiResult] ??
      AI_RESULT_CONFIG.PENDING,
    [state.aiResult],
  );

  const safetyComplete =
    state.safety.storage !== null &&
    state.safety.temperature !== null &&
    state.safety.handling !== null &&
    state.safety.packaging !== null &&
    state.safety.allergens !== null;

  const handlePublish = async () => {
    if (publishing) {
      return;
    }

    setPublishing(true);

    try {
      const donation = await createDonation(state);

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

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconCircleButton}
          onPress={() => navigation.goBack()}
          disabled={publishing}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>
            STEP 5 OF 5
          </Text>

          <Text style={styles.headerTitle}>
            Review & Publish
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <KaveeshaStepProgress
        step={5}
        total={5}
        label="Final Review"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Final review intro */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons
              name="checkmark-done-outline"
              size={24}
              color={colors.primary}
            />
          </View>

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              Everything looks ready
            </Text>

            <Text style={styles.introText}>
              Review your donation details before publishing it
              for recipients to discover.
            </Text>
          </View>
        </View>

        {/* Food photo */}
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
            <View style={styles.noPhotoContent}>
              <View style={styles.noPhotoIcon}>
                <Ionicons
                  name="fast-food-outline"
                  size={30}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.noPhotoText}>
                No food photo added
              </Text>
            </View>
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
            <Ionicons
              name={
                isUrgent
                  ? 'flash'
                  : 'time-outline'
              }
              size={12}
              color={
                isUrgent
                  ? colors.urgent
                  : colors.primary
              }
            />

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
              {isUrgent
                ? 'URGENT RESCUE'
                : 'STANDARD DONATION'}
            </Text>
          </View>
        </View>

        {/* Food title */}
        <View style={styles.foodHeader}>
          <Text style={styles.foodName}>
            {state.foodType ||
              'Untitled donation'}
          </Text>

          <Text style={styles.foodCategory}>
            {state.category ||
              'Uncategorized'}
          </Text>
        </View>

        {/* Food information */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>
              DONATION DETAILS
            </Text>

            <Text style={styles.sectionTitle}>
              Food information
            </Text>
          </View>
        </View>

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

        {/* Pickup district */}
        {state.pickupDistrict ? (
          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <Ionicons
                name="map-outline"
                size={20}
                color={colors.info}
              />
            </View>

            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>
                Pickup District
              </Text>

              <Text style={styles.locationValue}>
                {state.pickupDistrict}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Additional details */}
        {state.additionalDetails ? (
          <View style={styles.detailsCard}>
            <View style={styles.cardSectionHeader}>
              <View style={styles.smallIconWrap}>
                <Ionicons
                  name="document-text-outline"
                  size={17}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.detailsTitle}>
                Additional Details
              </Text>
            </View>

            <Text style={styles.detailsText}>
              {state.additionalDetails}
            </Text>
          </View>
        ) : null}

        {/* AI screening */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>
              DECISION SUPPORT
            </Text>

            <Text style={styles.sectionTitle}>
              AI visual screening
            </Text>
          </View>

          <View style={styles.optionalBadge}>
            <Text style={styles.optionalBadgeText}>
              OPTIONAL
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.aiCard,
            {
              backgroundColor:
                aiConfig.background,
            },
          ]}
        >
          <View
            style={[
              styles.aiIcon,
              {
                backgroundColor:
                  colors.white,
              },
            ]}
          >
            <Ionicons
              name={aiConfig.icon}
              size={23}
              color={aiConfig.color}
            />
          </View>

          <View style={styles.aiContent}>
            <Text
              style={[
                styles.aiTitle,
                {
                  color: aiConfig.color,
                },
              ]}
            >
              {aiConfig.title}
            </Text>

            <Text style={styles.aiDescription}>
              {aiConfig.description}
            </Text>

            {state.aiReason ? (
              <View style={styles.aiReasonBox}>
                <Text style={styles.aiReasonLabel}>
                  SCREENING NOTE
                </Text>

                <Text style={styles.aiReasonText}>
                  {state.aiReason}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.aiDisclaimer}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.textMuted}
          />

          <Text style={styles.aiDisclaimerText}>
            AI visual screening is food-safety decision support
            only. A photo cannot confirm whether food is actually
            safe or unsafe.
          </Text>
        </View>

        {/* Safety checklist */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>
              FOOD SAFETY
            </Text>

            <Text style={styles.sectionTitle}>
              Safety information
            </Text>
          </View>

          <View
            style={[
              styles.completeBadge,
              {
                backgroundColor: safetyComplete
                  ? colors.successSoft
                  : colors.primaryLight,
              },
            ]}
          >
            <Ionicons
              name={
                safetyComplete
                  ? 'checkmark-circle'
                  : 'ellipse-outline'
              }
              size={14}
              color={
                safetyComplete
                  ? colors.success
                  : colors.info
              }
            />

            <Text
              style={[
                styles.completeBadgeText,
                {
                  color: safetyComplete
                    ? colors.success
                    : colors.info,
                },
              ]}
            >
              {safetyComplete
                ? 'COMPLETE'
                : 'INCOMPLETE'}
            </Text>
          </View>
        </View>

        <View style={styles.safetySummary}>
          <SafetyRow
            icon="archive-outline"
            label="Storage"
            value={state.safety.storage}
          />

          <SafetyRow
            icon="thermometer-outline"
            label="Temperature"
            value={state.safety.temperature}
          />

          <SafetyRow
            icon="hand-left-outline"
            label="Handling"
            value={state.safety.handling}
          />

          <SafetyRow
            icon="cube-outline"
            label="Packaging"
            value={state.safety.packaging}
          />

          <SafetyRow
            icon="warning-outline"
            label="Allergens"
            value={state.safety.allergens}
            last
          />
        </View>

        {/* Publish notice */}
        <View style={styles.publishNotice}>
          <View style={styles.publishNoticeIcon}>
            <Ionicons
              name="eye-outline"
              size={19}
              color={colors.primary}
            />
          </View>

          <View style={styles.publishNoticeContent}>
            <Text style={styles.publishNoticeTitle}>
              Before you publish
            </Text>

            <Text style={styles.publishNoticeText}>
              Make sure the information, pickup location, food
              photo, and safety answers are accurate. Recipients
              will use this information when deciding whether to
              request the donation.
            </Text>
          </View>
        </View>

        {/* Edit */}
        <TouchableOpacity
          style={styles.editLink}
          onPress={() =>
            navigation.navigate('Details')
          }
          disabled={publishing}
          activeOpacity={0.8}
        >
          <View style={styles.editIcon}>
            <Ionicons
              name="create-outline"
              size={15}
              color={colors.primary}
            />
          </View>

          <Text style={styles.editLinkText}>
            Edit food details
          </Text>

          <Ionicons
            name="chevron-forward"
            size={15}
            color={colors.primary}
          />
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Publish footer */}
      <View style={styles.footer}>
        <View style={styles.footerHint}>
          <Ionicons
            name="lock-closed-outline"
            size={13}
            color={colors.textMuted}
          />

          <Text style={styles.footerHintText}>
            You can only publish after reviewing your details.
          </Text>
        </View>

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
                size="small"
              />

              <Text style={styles.publishText}>
                Publishing...
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.publishText}>
                Publish Donation
              </Text>

              <Ionicons
                name="arrow-up-circle-outline"
                size={20}
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
      <View style={styles.reviewIcon}>
        <Ionicons
          name={icon}
          size={16}
          color={colors.primary}
        />
      </View>

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
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null;
  last?: boolean;
}) {
  const normalizedValue =
    value === 'YES'
      ? 'Yes'
      : value === 'NO'
        ? 'No'
        : value === 'NOT_SURE'
          ? 'Not sure'
          : '—';

  const isNo = value === 'NO';
  const isNotSure = value === 'NOT_SURE';

  return (
    <View
      style={[
        styles.safetyRow,
        !last &&
          styles.safetyRowBorder,
      ]}
    >
      <View style={styles.safetyRowLeft}>
        <Ionicons
          name={icon}
          size={16}
          color={colors.textMuted}
        />

        <Text style={styles.safetyLabel}>
          {label}
        </Text>
      </View>

      <View
        style={[
          styles.safetyValueBadge,
          isNo &&
            styles.safetyValueDanger,
          isNotSure &&
            styles.safetyValueWarning,
        ]}
      >
        <Text
          style={[
            styles.safetyValue,
            isNo &&
              styles.safetyValueTextDanger,
            isNotSure &&
              styles.safetyValueTextWarning,
          ]}
        >
          {normalizedValue}
        </Text>
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
    paddingBottom: spacing.xs,
  },

  iconCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerEyebrow: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },

  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },

  headerSpacer: {
    width: 40,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  introCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadow.soft,
  },

  introIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: 5,
  },

  introText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  photoPreview: {
    height: 210,
    borderRadius: radius.xl,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow.soft,
  },

  photoImage: {
    width: '100%',
    height: '100%',
  },

  noPhotoContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  noPhotoIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  noPhotoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },

  typeBadgeText: {
    ...typography.bodySmall,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  foodHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },

  foodName: {
    ...typography.h2,
    color: colors.textPrimary,
  },

  foodCategory: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 3,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },

  sectionEyebrow: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 3,
  },

  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    gap: 9,
  },

  reviewRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  reviewIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reviewLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
    width: 70,
  },

  reviewValue: {
    ...typography.label,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },

  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  locationContent: {
    flex: 1,
  },

  locationLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },

  locationValue: {
    ...typography.label,
    color: colors.textPrimary,
    marginTop: 2,
  },

  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  smallIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  detailsTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },

  detailsText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  optionalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },

  optionalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.7,
  },

  aiCard: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.xs,
  },

  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  aiContent: {
    flex: 1,
  },

  aiTitle: {
    ...typography.label,
    marginBottom: 5,
  },

  aiDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  aiReasonBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  aiReasonLabel: {
    ...typography.bodySmall,
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  aiReasonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  aiDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 3,
  },

  aiDisclaimerText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    flex: 1,
    marginLeft: 5,
    lineHeight: 17,
  },

  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },

  completeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  safetySummary: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  safetyRow: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  safetyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  safetyRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  safetyLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  safetyValueBadge: {
    minWidth: 62,
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },

  safetyValueDanger: {
    backgroundColor: colors.urgentSoft,
  },

  safetyValueWarning: {
    backgroundColor: colors.accentSoft,
  },

  safetyValue: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },

  safetyValueTextDanger: {
    color: colors.urgent,
  },

  safetyValueTextWarning: {
    color: colors.accent,
  },

  publishNotice: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  publishNoticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  publishNoticeContent: {
    flex: 1,
  },

  publishNoticeTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: 4,
  },

  publishNoticeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 7,
    marginTop: spacing.lg,
  },

  editIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  editLinkText: {
    ...typography.label,
    color: colors.primary,
  },

  bottomSpace: {
    height: 130,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },

  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    gap: 5,
  },

  footerHintText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 11,
  },

  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 17,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.28,
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