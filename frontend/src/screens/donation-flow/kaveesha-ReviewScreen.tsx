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
  Modal,
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
  shortTitle: string;
  description: string;
  color: string;
  background: string;
};

const AI_RESULT_CONFIG: Record<string, AiResultConfig> = {
  GOOD: {
    icon: 'checkmark-circle-outline',
    title: 'No obvious visual concern',
    shortTitle: 'GOOD',
    description:
      'The AI visual screening did not identify an obvious visible concern in the submitted photo.',
    color: colors.success,
    background: colors.successSoft,
  },

  REVIEW: {
    icon: 'alert-circle-outline',
    title: 'Manual review recommended',
    shortTitle: 'REVIEW',
    description:
      'The AI visual screening identified something that may need closer attention.',
    color: colors.accent,
    background: colors.accentSoft,
  },

  CONCERN: {
    icon: 'close-circle-outline',
    title: 'Visible concern identified',
    shortTitle: 'CONCERN',
    description:
      'The AI visual screening identified a visible indicator that should be considered before donation.',
    color: colors.urgent,
    background: colors.urgentSoft,
  },

  PENDING: {
    icon: 'information-circle-outline',
    title: 'AI screening not performed',
    shortTitle: 'NOT PERFORMED',
    description:
      'AI visual screening was optional and was not performed for this donation.',
    color: colors.info,
    background: colors.primaryLight,
  },
};

type SafetyConcern = {
  label: string;
  answer: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function ReviewScreen({
  navigation,
}: Props) {
  const { state, reset } = useCreateDonation();

  const [publishing, setPublishing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [publishedDonationCode, setPublishedDonationCode] =
    useState<string | null>(null);

  const isUrgent = state.donationType === 'URGENT';

  const quantityDisplay = state.quantity
    ? `${state.quantity} ${state.quantityUnit}`
    : '—';

  const preparationDisplay =
    state.preparationDate && state.preparationTime
      ? `${state.preparationDate} • ${state.preparationTime}`
      : state.preparationDate ||
        state.preparationTime ||
        '—';

  const expiryDisplay =
    state.expiryDate && state.expiryTime
      ? `${state.expiryDate} • ${state.expiryTime}`
      : state.expiryDate ||
        state.expiryTime ||
        '—';

  const pickupFromDisplay =
    state.pickupAvailableFromDate &&
    state.pickupAvailableFromTime
      ? `${state.pickupAvailableFromDate} • ${state.pickupAvailableFromTime}`
      : state.pickupAvailableFromDate ||
        state.pickupAvailableFromTime ||
        '—';

  const pickupUntilDisplay =
    state.pickupAvailableUntilDate &&
    state.pickupAvailableUntilTime
      ? `${state.pickupAvailableUntilDate} • ${state.pickupAvailableUntilTime}`
      : state.pickupAvailableUntilDate ||
        state.pickupAvailableUntilTime ||
        '—';

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

  /*
   * These are the safety answers that currently prevent
   * the donation from continuing.
   *
   * NOT_SURE answers are warnings, not blocking concerns.
   */
  const safetyConcerns = useMemo<SafetyConcern[]>(() => {
    const concerns: SafetyConcern[] = [];

    if (state.safety.storage === 'NO') {
      concerns.push({
        label: 'Storage',
        answer: 'No',
        message:
          'The food was reported as not being stored appropriately.',
        icon: 'archive-outline',
      });
    }

    if (state.safety.handling === 'NO') {
      concerns.push({
        label: 'Handling',
        answer: 'No',
        message:
          'Hygienic food handling was not confirmed.',
        icon: 'hand-left-outline',
      });
    }

    if (state.safety.packaging === 'NO') {
      concerns.push({
        label: 'Packaging',
        answer: 'No',
        message:
          'The food container was reported as not clean or intact.',
        icon: 'cube-outline',
      });
    }

    return concerns;
  }, [state.safety]);

  const hasSafetyConcern =
    safetyConcerns.length > 0;

  const uncertainInformation = useMemo(() => {
    const items: {
      label: string;
      message: string;
      icon: keyof typeof Ionicons.glyphMap;
    }[] = [];

    if (state.safety.temperature === 'NOT_SURE') {
      items.push({
        label: 'Temperature',
        message:
          'Temperature control could not be confirmed.',
        icon: 'thermometer-outline',
      });
    }

    if (state.safety.allergens === 'NOT_SURE') {
      items.push({
        label: 'Allergens',
        message:
          'The presence of known allergens could not be confirmed.',
        icon: 'warning-outline',
      });
    }

    return items;
  }, [state.safety]);

  const handlePublish = async () => {
    if (publishing || hasSafetyConcern) {
      return;
    }

    if (!safetyComplete) {
      Alert.alert(
        'Safety Check Incomplete',
        'Please complete the required safety information before publishing.',
      );
      return;
    }

    setPublishing(true);

    try {
      const donation = await createDonation(state);

      setPublishedDonationCode(
        donation?.donationCode ?? null,
      );

      setShowSuccess(true);
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

  const handleViewPost = () => {
    setShowSuccess(false);
    reset();

    /*
     * MyDonations is registered in the root navigator,
     * while Review is inside CreateDonationNavigator.
     */
    navigation
      .getParent()
      ?.navigate('MyDonations' as never);
  };

  const handleDone = () => {
    setShowSuccess(false);
    reset();

    navigation
      .getParent()
      ?.navigate('DonorHome' as never);
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
          disabled={publishing || showSuccess}
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
        {/* Intro */}
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
              Final review
            </Text>

            <Text style={styles.introText}>
              Check the information below before publishing
              your donation. Recipients will use these details
              when deciding whether to request it.
            </Text>
          </View>
        </View>

        {/* ================================================== */}
        {/* SAFETY BLOCKING WARNING */}
        {/* ================================================== */}

        {hasSafetyConcern ? (
          <View style={styles.dangerCard}>
            <View style={styles.dangerHeader}>
              <View style={styles.dangerIcon}>
                <Ionicons
                  name="warning"
                  size={25}
                  color={colors.urgent}
                />
              </View>

              <View style={styles.dangerHeaderContent}>
                <Text style={styles.dangerEyebrow}>
                  FOOD SAFETY
                </Text>

                <Text style={styles.dangerTitle}>
                  SAFETY CONCERN IDENTIFIED
                </Text>
              </View>
            </View>

            <View style={styles.dangerDivider} />

            <View style={styles.doNotDonateBox}>
              <View style={styles.doNotDonateIcon}>
                <Ionicons
                  name="close-circle"
                  size={22}
                  color={colors.urgent}
                />
              </View>

              <View style={styles.doNotDonateContent}>
                <Text style={styles.doNotDonateTitle}>
                  DO NOT DONATE THIS FOOD
                </Text>

                <Text style={styles.doNotDonateText}>
                  A blocking concern was reported in the
                  required safety checklist. This donation
                  cannot continue through the publishing process.
                </Text>
              </View>
            </View>

            <Text style={styles.concernsHeading}>
              Reported concerns
            </Text>

            {safetyConcerns.map((concern) => (
              <View
                key={concern.label}
                style={styles.concernItem}
              >
                <View style={styles.concernIcon}>
                  <Ionicons
                    name={concern.icon}
                    size={17}
                    color={colors.urgent}
                  />
                </View>

                <View style={styles.concernContent}>
                  <View style={styles.concernTitleRow}>
                    <Text style={styles.concernLabel}>
                      {concern.label}
                    </Text>

                    <View style={styles.concernAnswerBadge}>
                      <Text style={styles.concernAnswerText}>
                        {concern.answer}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.concernMessage}>
                    {concern.message}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.dangerFooter}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.urgent}
              />

              <Text style={styles.dangerFooterText}>
                This result is based on the information
                reported in your safety checklist. The donation
                cannot be published while a blocking concern
                is present.
              </Text>
            </View>
          </View>
        ) : (
          /* ================================================== */
          /* SAFETY PASSED */
          /* ================================================== */
          <View style={styles.passedCard}>
            <View style={styles.passedHeader}>
              <View style={styles.passedIcon}>
                <Ionicons
                  name="shield-checkmark"
                  size={24}
                  color={colors.success}
                />
              </View>

              <View style={styles.passedHeaderContent}>
                <Text style={styles.passedEyebrow}>
                  FOOD SAFETY
                </Text>

                <Text style={styles.passedTitle}>
                  SAFETY CHECK PASSED
                </Text>

                <Text style={styles.passedText}>
                  All required safety questions were answered
                  without a blocking concern being reported.
                </Text>
              </View>
            </View>

            {uncertainInformation.length > 0 ? (
              <View style={styles.uncertainBox}>
                <View style={styles.uncertainHeader}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={colors.accent}
                  />

                  <Text style={styles.uncertainTitle}>
                    INFORMATION COULD NOT BE CONFIRMED
                  </Text>
                </View>

                {uncertainInformation.map((item) => (
                  <View
                    key={item.label}
                    style={styles.uncertainItem}
                  >
                    <Ionicons
                      name={item.icon}
                      size={15}
                      color={colors.accent}
                    />

                    <View style={styles.uncertainItemContent}>
                      <Text style={styles.uncertainLabel}>
                        {item.label}
                      </Text>

                      <Text style={styles.uncertainMessage}>
                        {item.message}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.safetyDisclaimer}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.textMuted}
              />

              <Text style={styles.safetyDisclaimerText}>
                A completed safety check does not guarantee
                that food is safe to eat. Recipients should
                still use their own judgement.
              </Text>
            </View>
          </View>
        )}

        {/* Food photo */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>
              DONATION
            </Text>

            <Text style={styles.sectionTitle}>
              Food preview
            </Text>
          </View>
        </View>

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

        {/* ================================================== */}
        {/* FOOD INFORMATION */}
        {/* ================================================== */}

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
            value={state.portions || '—'}
          />

          <ReviewRow
            icon="calendar-outline"
            label="Prepared"
            value={preparationDisplay}
          />

          <ReviewRow
            icon="hourglass-outline"
            label="Expires"
            value={expiryDisplay}
          />

          <ReviewRow
            icon="snow-outline"
            label="Storage"
            value={
              state.storageCondition ||
              '—'
            }
            last
          />
        </View>

        {/* ================================================== */}
        {/* PICKUP INFORMATION */}
        {/* ================================================== */}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>
              COLLECTION
            </Text>

            <Text style={styles.sectionTitle}>
              Pickup information
            </Text>
          </View>
        </View>

        <View style={styles.pickupCard}>
          <View style={styles.pickupLocationBox}>
            <View style={styles.pickupIcon}>
              <Ionicons
                name="location"
                size={20}
                color={colors.info}
              />
            </View>

            <View style={styles.pickupLocationContent}>
              <Text style={styles.pickupLabel}>
                Pickup location
              </Text>

              <Text style={styles.pickupValue}>
                {state.pickupLocation || '—'}
              </Text>
            </View>
          </View>

          <View style={styles.pickupDistrictBox}>
            <View style={styles.miniPickupIcon}>
              <Ionicons
                name="map-outline"
                size={16}
                color={colors.primary}
              />
            </View>

            <View style={styles.pickupLocationContent}>
              <Text style={styles.pickupLabel}>
                District
              </Text>

              <Text style={styles.pickupValue}>
                {state.pickupDistrict || '—'}
              </Text>
            </View>
          </View>

          <View style={styles.pickupTimeSection}>
            <Text style={styles.pickupTimeHeading}>
              AVAILABLE FOR PICKUP
            </Text>

            <View style={styles.pickupTimeRow}>
              <View style={styles.pickupTimeItem}>
                <View style={styles.timeIcon}>
                  <Ionicons
                    name="play-outline"
                    size={15}
                    color={colors.success}
                  />
                </View>

                <View style={styles.timeContent}>
                  <Text style={styles.timeLabel}>
                    From
                  </Text>

                  <Text style={styles.timeValue}>
                    {pickupFromDisplay}
                  </Text>
                </View>
              </View>

              <View style={styles.timeArrow}>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </View>

              <View style={styles.pickupTimeItem}>
                <View style={styles.timeIconUntil}>
                  <Ionicons
                    name="stop-outline"
                    size={15}
                    color={colors.urgent}
                  />
                </View>

                <View style={styles.timeContent}>
                  <Text style={styles.timeLabel}>
                    Until
                  </Text>

                  <Text style={styles.timeValue}>
                    {pickupUntilDisplay}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

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

        {/* ================================================== */}
        {/* AI SCREENING */}
        {/* ================================================== */}

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
            <View style={styles.aiTitleRow}>
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

              <View
                style={[
                  styles.aiResultBadge,
                  {
                    backgroundColor:
                      colors.white,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.aiResultBadgeText,
                    {
                      color: aiConfig.color,
                    },
                  ]}
                >
                  {aiConfig.shortTitle}
                </Text>
              </View>
            </View>

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

        {/* ================================================== */}
        {/* SAFETY INFORMATION */}
        {/* ================================================== */}

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
                backgroundColor: hasSafetyConcern
                  ? colors.urgentSoft
                  : safetyComplete
                    ? colors.successSoft
                    : colors.primaryLight,
              },
            ]}
          >
            <Ionicons
              name={
                hasSafetyConcern
                  ? 'warning'
                  : safetyComplete
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
              }
              size={14}
              color={
                hasSafetyConcern
                  ? colors.urgent
                  : safetyComplete
                    ? colors.success
                    : colors.info
              }
            />

            <Text
              style={[
                styles.completeBadgeText,
                {
                  color: hasSafetyConcern
                    ? colors.urgent
                    : safetyComplete
                      ? colors.success
                      : colors.info,
                },
              ]}
            >
              {hasSafetyConcern
                ? 'CONCERN'
                : safetyComplete
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
            blocking={state.safety.storage === 'NO'}
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
            blocking={state.safety.handling === 'NO'}
          />

          <SafetyRow
            icon="cube-outline"
            label="Packaging"
            value={state.safety.packaging}
            blocking={state.safety.packaging === 'NO'}
          />

          <SafetyRow
            icon="warning-outline"
            label="Allergens"
            value={state.safety.allergens}
            last
          />
        </View>

        {/* ================================================== */}
        {/* EDIT FOOD DETAILS */}
        {/* ================================================== */}

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>
            Need to make a change?
          </Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              navigation.navigate('Details')
            }
            disabled={publishing || showSuccess}
            activeOpacity={0.8}
          >
            <View style={styles.editButtonIcon}>
              <Ionicons
                name="create-outline"
                size={17}
                color={colors.primary}
              />
            </View>

            <View style={styles.editButtonContent}>
              <Text style={styles.editButtonTitle}>
                Edit food details
              </Text>

              <Text style={styles.editButtonSubtitle}>
                Food, quantity, dates and pickup information
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>

          <View style={styles.safetyLockedCard}>
            <View style={styles.safetyLockedIcon}>
              <Ionicons
                name="lock-closed-outline"
                size={17}
                color={colors.textMuted}
              />
            </View>

            <View style={styles.safetyLockedContent}>
              <Text style={styles.safetyLockedTitle}>
                Safety answers are locked
              </Text>

              <Text style={styles.safetyLockedText}>
                Safety information cannot be changed from the
                final review after the safety check has been completed.
              </Text>
            </View>
          </View>
        </View>

        {/* ================================================== */}
        {/* PUBLISH NOTICE */}
        {/* ================================================== */}

        {!hasSafetyConcern ? (
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
                Make sure the information, pickup location,
                food photo, and safety answers are accurate.
                Recipients will use these details when deciding
                whether to request the donation.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* ================================================== */}
      {/* FOOTER */}
      {/* ================================================== */}

      <View style={styles.footer}>
        {hasSafetyConcern ? (
          <>
            <View style={styles.blockedFooterNotice}>
              <Ionicons
                name="lock-closed-outline"
                size={15}
                color={colors.urgent}
              />

              <Text style={styles.blockedFooterText}>
                Publishing is unavailable because a safety
                concern was reported.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() =>
                navigation.getParent()?.goBack()
              }
              disabled={publishing}
              activeOpacity={0.8}
            >
              <Ionicons
                name="close-outline"
                size={19}
                color={colors.urgent}
              />

              <Text style={styles.cancelButtonText}>
                Cancel Donation
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.footerHint}>
              <Ionicons
                name="lock-closed-outline"
                size={13}
                color={colors.textMuted}
              />

              <Text style={styles.footerHintText}>
                Review all information before publishing.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.publishButton,
                publishing &&
                  styles.publishButtonDisabled,
              ]}
              onPress={handlePublish}
              disabled={publishing || showSuccess}
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
          </>
        )}
      </View>

      {/* ================================================== */}
      {/* SUCCESS MODAL */}
      {/* ================================================== */}

      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons
                  name="checkmark"
                  size={38}
                  color={colors.white}
                />
              </View>
            </View>

            <Text style={styles.successTitle}>
              Donation Posted!
            </Text>

            <Text style={styles.successMessage}>
              Your donation is now available for rescue.
            </Text>

            {publishedDonationCode ? (
              <View style={styles.successCodeBox}>
                <Text style={styles.successCodeLabel}>
                  DONATION CODE
                </Text>

                <Text style={styles.successCode}>
                  {publishedDonationCode}
                </Text>
              </View>
            ) : null}

            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.viewPostButton}
                onPress={handleViewPost}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="eye-outline"
                  size={19}
                  color={colors.white}
                />

                <Text style={styles.viewPostButtonText}>
                  View Post
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleDone}
                activeOpacity={0.85}
              >
                <Text style={styles.doneButtonText}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
        numberOfLines={3}
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
  blocking,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null;
  last?: boolean;
  blocking?: boolean;
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
        blocking &&
          styles.safetyRowBlocking,
      ]}
    >
      <View style={styles.safetyRowLeft}>
        <View
          style={[
            styles.safetyRowIcon,
            blocking &&
              styles.safetyRowIconDanger,
            isNotSure &&
              styles.safetyRowIconWarning,
          ]}
        >
          <Ionicons
            name={icon}
            size={15}
            color={
              blocking
                ? colors.urgent
                : isNotSure
                  ? colors.accent
                  : colors.primary
            }
          />
        </View>

        <View style={styles.safetyLabelContent}>
          <Text style={styles.safetyLabel}>
            {label}
          </Text>

          {blocking ? (
            <Text style={styles.blockingLabel}>
              Blocking concern
            </Text>
          ) : isNotSure ? (
            <Text style={styles.uncertainLabelSmall}>
              Information uncertain
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.safetyValueBadge,
          isNo &&
            styles.safetyValueDanger,
          isNotSure &&
            styles.safetyValueWarning,
          value === 'YES' &&
            styles.safetyValueSuccess,
        ]}
      >
        <Text
          style={[
            styles.safetyValue,
            isNo &&
              styles.safetyValueTextDanger,
            isNotSure &&
              styles.safetyValueTextWarning,
            value === 'YES' &&
              styles.safetyValueTextSuccess,
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

  /* ====================================================== */
  /* SAFETY RESULT CARDS */
  /* ====================================================== */

  dangerCard: {
    backgroundColor: colors.urgentSoft,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.urgent,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.soft,
  },

  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dangerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  dangerHeaderContent: {
    flex: 1,
  },

  dangerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.urgent,
    letterSpacing: 1,
    marginBottom: 3,
  },

  dangerTitle: {
    ...typography.h2,
    color: colors.urgent,
    fontSize: 18,
  },

  dangerDivider: {
    height: 1,
    backgroundColor: colors.urgent,
    opacity: 0.2,
    marginVertical: spacing.md,
  },

  doNotDonateBox: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.urgent,
  },

  doNotDonateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.urgentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  doNotDonateContent: {
    flex: 1,
  },

  doNotDonateTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.urgent,
    letterSpacing: 0.4,
    marginBottom: 4,
  },

  doNotDonateText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  concernsHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.urgent,
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  concernItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: 8,
  },

  concernIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.urgentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  concernContent: {
    flex: 1,
  },

  concernTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  concernLabel: {
    ...typography.label,
    color: colors.textPrimary,
    flex: 1,
  },

  concernAnswerBadge: {
    backgroundColor: colors.urgentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  concernAnswerText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.urgent,
  },

  concernMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 3,
  },

  dangerFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.urgent,
    opacity: 0.9,
  },

  dangerFooterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: 6,
    lineHeight: 17,
  },

  passedCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.soft,
  },

  passedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  passedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  passedHeaderContent: {
    flex: 1,
  },

  passedEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 1,
    marginBottom: 3,
  },

  passedTitle: {
    ...typography.h2,
    color: colors.success,
    fontSize: 18,
    marginBottom: 4,
  },

  passedText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  uncertainBox: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },

  uncertainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: 6,
  },

  uncertainTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.7,
  },

  uncertainItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
  },

  uncertainItemContent: {
    flex: 1,
    marginLeft: 7,
  },

  uncertainLabel: {
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 12,
  },

  uncertainMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },

  safetyDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  safetyDisclaimerText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    flex: 1,
    marginLeft: 5,
    lineHeight: 17,
  },

  /* ====================================================== */
  /* PHOTO */
  /* ====================================================== */

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

  /* ====================================================== */
  /* SECTION */
  /* ====================================================== */

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

  /* ====================================================== */
  /* FOOD INFORMATION */
  /* ====================================================== */

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
    minHeight: 60,
    gap: 9,
  },

  reviewRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  reviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reviewLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
    width: 75,
  },

  reviewValue: {
    ...typography.label,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },

  /* ====================================================== */
  /* PICKUP */
  /* ====================================================== */

  pickupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  pickupLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  pickupDistrictBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  pickupIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  miniPickupIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  pickupLocationContent: {
    flex: 1,
  },

  pickupLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: 2,
  },

  pickupValue: {
    ...typography.label,
    color: colors.textPrimary,
  },

  pickupTimeSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  pickupTimeHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  pickupTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  pickupTimeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  timeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  timeIconUntil: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.urgentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  timeContent: {
    flex: 1,
  },

  timeLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 10,
  },

  timeValue: {
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 11,
    marginTop: 2,
  },

  timeArrow: {
    paddingHorizontal: 5,
  },

  /* ====================================================== */
  /* ADDITIONAL DETAILS */
  /* ====================================================== */

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

  /* ====================================================== */
  /* AI */
  /* ====================================================== */

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

  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 5,
  },

  aiTitle: {
    ...typography.label,
    flexShrink: 1,
  },

  aiResultBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  aiResultBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
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

  /* ====================================================== */
  /* SAFETY SUMMARY */
  /* ====================================================== */

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
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  safetyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  safetyRowBlocking: {
    backgroundColor: colors.urgentSoft,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },

  safetyRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  safetyRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  safetyRowIconDanger: {
    backgroundColor: colors.white,
  },

  safetyRowIconWarning: {
    backgroundColor: colors.accentSoft,
  },

  safetyLabelContent: {
    flex: 1,
  },

  safetyLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },

  blockingLabel: {
    fontSize: 9,
    color: colors.urgent,
    fontWeight: '800',
    marginTop: 2,
  },

  uncertainLabelSmall: {
    fontSize: 9,
    color: colors.accent,
    fontWeight: '700',
    marginTop: 2,
  },

  safetyValueBadge: {
    minWidth: 65,
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },

  safetyValueDanger: {
    backgroundColor: colors.urgentSoft,
  },

  safetyValueWarning: {
    backgroundColor: colors.accentSoft,
  },

  safetyValueSuccess: {
    backgroundColor: colors.successSoft,
  },

  safetyValue: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '800',
  },

  safetyValueTextDanger: {
    color: colors.urgent,
  },

  safetyValueTextWarning: {
    color: colors.accent,
  },

  safetyValueTextSuccess: {
    color: colors.success,
  },

  /* ====================================================== */
  /* EDIT */
  /* ====================================================== */

  editSection: {
    marginTop: spacing.lg,
  },

  editSectionTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },

  editButtonIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  editButtonContent: {
    flex: 1,
  },

  editButtonTitle: {
    ...typography.label,
    color: colors.primary,
  },

  editButtonSubtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },

  safetyLockedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  safetyLockedIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  safetyLockedContent: {
    flex: 1,
  },

  safetyLockedTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },

  safetyLockedText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 2,
  },

  /* ====================================================== */
  /* PUBLISH NOTICE */
  /* ====================================================== */

  publishNotice: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.md,
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

  /* ====================================================== */
  /* FOOTER */
  /* ====================================================== */

  bottomSpace: {
    height: 150,
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

  blockedFooterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },

  blockedFooterText: {
    ...typography.bodySmall,
    color: colors.urgent,
    fontSize: 11,
    textAlign: 'center',
  },

  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.urgent,
    backgroundColor: colors.white,
    paddingVertical: 16,
  },

  cancelButtonText: {
    ...typography.label,
    color: colors.urgent,
  },

  /* ====================================================== */
  /* SUCCESS MODAL */
  /* ====================================================== */

  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 28, 46, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  successModal: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.soft,
  },

  successIconOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  successIconInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  successTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 25,
    marginBottom: spacing.xs,
  },

  successMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },

  successCodeBox: {
    width: '100%',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },

  successCodeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 3,
  },

  successCode: {
    ...typography.h2,
    color: colors.primary,
    letterSpacing: 1.2,
  },

  successActions: {
    width: '100%',
    marginTop: spacing.lg,
  },

  viewPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 15,
    width: '100%',
  },

  viewPostButtonText: {
    ...typography.button,
    color: colors.white,
  },

  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingVertical: 14,
    width: '100%',
    marginTop: spacing.sm,
  },

  doneButtonText: {
    ...typography.label,
    color: colors.textPrimary,
  },
});