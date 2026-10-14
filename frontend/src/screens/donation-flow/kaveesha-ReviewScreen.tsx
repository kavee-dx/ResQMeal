// frontend/src/screens/donation-flow/kaveesha-ReviewScreen.tsx
// Step 5 of 5 — Review & Publish
// Owner: Kaveesha
//
// The optional AI photo check deliberately does NOT appear on this step. It
// belongs to the Safety Check step, where the donor ran it. Repeating it here
// only made the final screen long and easy to misread.

import React, { useMemo, useState } from 'react';
import type { NavigationProp } from '@react-navigation/native';

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
import { LinearGradient } from 'expo-linear-gradient';
import { StackActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { CreateDonationFlowParamList } from '../../navigation/kaveesha-createDonationFlow.types';
import type { RootStackParamList } from '../../navigation/types';

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
import { acceptFoodRequest } from '../../services/dushani-foodRequestApi';

type Props = NativeStackScreenProps<
  CreateDonationFlowParamList,
  'Review'
>;

/* ============================================================
   PREMIUM DESIGN TOKENS
   Same local palette, elevation and Poppins-weight mapping the
   Details and Safety steps use, so all four steps read as one
   product. Styling only — no form data or logic changes.
   ============================================================ */

const C = {
  navy: '#082634',
  navyDeep: '#04161F',
  teal: '#0E6B80',
  orange: '#F97316',
  amber: '#F5A524',

  background: '#F4F7F9',
  white: '#FFFFFF',

  text: '#082634',
  secondary: '#4A616D',
  muted: '#93A5AE',

  border: '#E2ECEF',
  hairline: '#EDF3F6',
  softBlue: '#EDF4F7',

  success: '#2FA35B',
  successSoft: '#EAF7EE',

  warning: '#D99100',
  warningSoft: '#FFF7DD',

  danger: '#DC4C4C',
  dangerSoft: '#FBEBEB',

  onDark: '#CFE0E8',
  onDarkFaint: '#9FB4C0',
};

const FONT_BY_WEIGHT: Record<string, string> = {
  '400': 'Poppins_400Regular',
  '500': 'Poppins_500Medium',
  '600': 'Poppins_600SemiBold',
  '700': 'Poppins_700Bold',
  '800': 'Poppins_700Bold',
  '900': 'Poppins_700Bold',
};

const ELEV = {
  shadowColor: '#082634',
  shadowOpacity: 0.1,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

const ELEV_SOFT = {
  shadowColor: '#082634',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

const ELEV_GLOW = {
  shadowColor: '#F97316',
  shadowOpacity: 0.32,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
};

type SafetyConcern = {
  label: string;
  answer: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/* The five checklist answers, mapped once so both the compact strip and the
   expandable answer list read from the same source. */
type SafetyAnswerKey =
  | 'storage'
  | 'temperature'
  | 'handling'
  | 'packaging'
  | 'allergens';

const SAFETY_ROWS: {
  key: SafetyAnswerKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  blocking: boolean;
}[] = [
  { key: 'storage', label: 'Storage', icon: 'archive-outline', blocking: true },
  {
    key: 'temperature',
    label: 'Temperature',
    icon: 'thermometer-outline',
    blocking: false,
  },
  { key: 'handling', label: 'Handling', icon: 'hand-left-outline', blocking: true },
  { key: 'packaging', label: 'Packaging', icon: 'cube-outline', blocking: true },
  { key: 'allergens', label: 'Allergens', icon: 'warning-outline', blocking: false },
];

export default function ReviewScreen({
  navigation,
  route,
}: Props) {
  const { state, reset } = useCreateDonation();

  const [publishing, setPublishing] = useState(false);

  /* The safety answer list stays collapsed behind the status strip so this
     page reads in one screen instead of scrolling through two pages of text. */
  const [showSafetyDetails, setShowSafetyDetails] = useState(false);

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

  const answeredCount = SAFETY_ROWS.filter(
    (row) => state.safety[row.key] !== null,
  ).length;

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

  /*
   * ONE short safety verdict for this page — the same three tones the Safety
   * Check pop-up uses, so the donor recognises the result at a glance instead
   * of reading a wall of text again.
   */
  const safetyStatus = useMemo(() => {
    if (hasSafetyConcern) {
      return {
        icon: 'close-circle' as const,
        kicker: 'NOT READY TO PUBLISH',
        title: 'A safety concern was reported',
        line: `Fix your answers on the safety check before publishing · ${safetyConcerns.length} concern${
          safetyConcerns.length === 1 ? '' : 's'
        }`,
        accent: C.danger,
        soft: C.dangerSoft,
      };
    }

    if (!safetyComplete) {
      return {
        icon: 'help-circle' as const,
        kicker: 'SAFETY CHECK NOT FINISHED',
        title: 'Some answers are missing',
        line: `${
          SAFETY_ROWS.length - answeredCount
        } of ${
          SAFETY_ROWS.length
        } questions still open — finish them before publishing`,
        accent: C.teal,
        soft: C.softBlue,
      };
    }

    if (uncertainInformation.length > 0) {
      return {
        icon: 'alert-circle' as const,
        kicker: 'READY — WITH NOTES',
        title: 'Passed, with things to confirm',
        line: `${uncertainInformation.length} answer${
          uncertainInformation.length === 1 ? ' is' : 's are'
        } marked “Not sure” — recipients will see that`,
        accent: C.warning,
        soft: C.warningSoft,
      };
    }

    return {
      icon: 'checkmark-circle' as const,
      kicker: 'SAFETY CHECK PASSED',
      title: 'All clear',
      line: `All ${answeredCount} required answers reported no concern`,
      accent: C.success,
      soft: C.successSoft,
    };
  }, [
    hasSafetyConcern,
    safetyConcerns,
    safetyComplete,
    answeredCount,
    uncertainInformation,
  ]);

  /* Every “Edit” on this page jumps straight to the step that owns the data. */
  function openStep(step: 'TypeSelect' | 'Details' | 'Safety') {
    if (publishing) {
      return;
    }

    navigation.navigate(step);
  }

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

    let createdDonation: Awaited<ReturnType<typeof createDonation>> | null = null;

    try {
      createdDonation = await createDonation(state);

      /*
       * Publish lands on My Donations — no intermediate dialog. REPLACE is
       * used instead of navigate so this wizard step leaves the root stack
       * entirely; pressing back on My Donations therefore goes to the donor
       * home page rather than bouncing back to a finished review screen.
       */
      const code = donation?.donationCode ?? null;

      const payload = {
        justPublished: {
          code: code ?? undefined,
          foodType: state.foodType || undefined,
        },
      };

      reset();

      const rootStack = navigation.getParent();

      if (rootStack) {
        rootStack.dispatch(
          StackActions.replace('MyDonations', payload) as never,
        );
      } else {
        /* Mounted outside the wizard stack (isolated runs): still land on the
           list, and My Donations resolves its own way back to the home page. */
        (navigation as any).navigate('MyDonations', payload);
      }
      setPublishedDonationCode(
        createdDonation.donationCode ?? null,
      );

      const requestId = route.params?.requestId;
      if (requestId) {
        await acceptFoodRequest(requestId, createdDonation.id);
        reset();
        navigation
          .getParent<NavigationProp<RootStackParamList>>()
          ?.navigate('VolunteerSuggestions', {
            donationId: createdDonation.id,
          });
        return;
      }

      setShowSuccess(true);
    } catch (error: any) {
      console.error(
        '[ReviewScreen] Publish failed:',
        error,
      );

      if (createdDonation) {
        Alert.alert(
          'Donation published',
          'Your donation was saved, but the request could not be linked. You can manage it from My Donations.',
          [
            { text: 'Stay here', style: 'cancel' },
            {
              text: 'My Donations',
              onPress: () =>
                navigation
                  .getParent<NavigationProp<RootStackParamList>>()
                  ?.navigate('MyDonations'),
            },
          ],
        );
        return;
      }

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

  /* This step ends by replacing itself with My Donations, so there is no
     in-place confirmation dialog. */

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
            STEP 4 OF 4
          </Text>

          <Text style={styles.headerTitle}>
            Review & Publish
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <KaveeshaStepProgress
        step={4}
        total={4}
        label="Final Review"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================================================== */}
        {/* HERO — the donation exactly as a recipient will see it */}
        {/* ================================================== */}

        <LinearGradient
          colors={[C.navy, C.navyDeep]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroEyebrowRow}>
              <Ionicons
                name="eye-outline"
                size={12}
                color={C.onDarkFaint}
              />

              <Text style={styles.heroEyebrow}>
                WHAT RECIPIENTS WILL SEE
              </Text>
            </View>

            <TouchableOpacity
              style={styles.heroEditChip}
              onPress={() => openStep('Details')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="create-outline"
                size={11}
                color={C.onDark}
              />

              <Text style={styles.heroEditChipText}>
                EDIT
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroPhotoFrame}>
            {state.photoUri ? (
              <Image
                source={{ uri: state.photoUri }}
                resizeMode="cover"
                style={styles.heroPhoto}
              />
            ) : (
              <TouchableOpacity
                style={styles.heroPhotoEmpty}
                onPress={() => openStep('Details')}
                activeOpacity={0.85}
              >
                <View style={styles.heroPhotoEmptyIcon}>
                  <Ionicons
                    name="camera-outline"
                    size={22}
                    color={C.navy}
                  />
                </View>

                <Text style={styles.heroPhotoEmptyTitle}>
                  No food photo yet
                </Text>

                <Text style={styles.heroPhotoEmptyText}>
                  Posts with a clear photo are rescued faster —
                  tap to add one
                </Text>
              </TouchableOpacity>
            )}

            <View
              style={[
                styles.heroTypeChip,
                {
                  backgroundColor: isUrgent
                    ? 'rgba(220,76,76,0.92)'
                    : 'rgba(249,115,22,0.92)',
                },
              ]}
            >
              <Ionicons
                name={isUrgent ? 'flash' : 'time-outline'}
                size={11}
                color={C.white}
              />

              <Text style={styles.heroTypeChipText}>
                {isUrgent
                  ? 'URGENT RESCUE'
                  : 'STANDARD DONATION'}
              </Text>
            </View>
          </View>

          <Text
            style={styles.heroTitle}
            numberOfLines={2}
          >
            {state.foodType || 'Untitled donation'}
          </Text>

          <Text style={styles.heroSubtitle} numberOfLines={1}>
            {`${state.category || 'Uncategorized'}  ·  ${
              state.pickupLocation || 'No pickup location'
            }`}
          </Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroPill}>
              <Ionicons
                name="scale-outline"
                size={12}
                color={C.onDark}
              />

              <Text style={styles.heroPillText}>
                {quantityDisplay}
              </Text>
            </View>

            <View style={styles.heroPill}>
              <Ionicons
                name="people-outline"
                size={12}
                color={C.onDark}
              />

              <Text style={styles.heroPillText}>
                {state.portions
                  ? `${state.portions} portions`
                  : 'Portions not set'}
              </Text>
            </View>

            <View style={[styles.heroPill, styles.heroPillWarm]}>
              <Ionicons
                name="hourglass-outline"
                size={12}
                color={C.amber}
              />

              <Text style={styles.heroPillWarmText}>
                {expiryDisplay === '—'
                  ? 'No expiry time'
                  : `Until ${expiryDisplay}`}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ================================================== */}
        {/* SAFETY STATUS — one short strip, details on demand */}
        {/* ================================================== */}

        <View style={styles.statusStrip}>
          <View
            style={[
              styles.statusStripe,
              { backgroundColor: safetyStatus.accent },
            ]}
          />

          <View
            style={[
              styles.statusIcon,
              { backgroundColor: safetyStatus.soft },
            ]}
          >
            <Ionicons
              name={safetyStatus.icon}
              size={22}
              color={safetyStatus.accent}
            />
          </View>

          <View style={styles.statusBody}>
            <Text
              style={[
                styles.statusKicker,
                { color: safetyStatus.accent },
              ]}
            >
              {safetyStatus.kicker}
            </Text>

            <Text style={styles.statusTitle}>
              {safetyStatus.title}
            </Text>

            <Text style={styles.statusLine}>
              {safetyStatus.line}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.statusEdit}
            onPress={() => openStep('Safety')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="create-outline"
              size={13}
              color={C.secondary}
            />

            <Text style={styles.statusEditText}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        {hasSafetyConcern ? (
          <View style={styles.statusConcerns}>
            {safetyConcerns.map((concern) => (
              <View
                key={concern.label}
                style={styles.statusConcernRow}
              >
                <Ionicons
                  name={concern.icon}
                  size={14}
                  color={C.danger}
                />

                <Text style={styles.statusConcernText}>
                  <Text style={styles.statusConcernLabel}>
                    {concern.label}
                  </Text>
                  {` — ${concern.message}`}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.statusToggle}
          onPress={() =>
            setShowSafetyDetails((open) => !open)
          }
          activeOpacity={0.75}
        >
          <Ionicons
            name={
              showSafetyDetails
                ? 'chevron-up'
                : 'chevron-down'
            }
            size={14}
            color={C.secondary}
          />

          <Text style={styles.statusToggleText}>
            {showSafetyDetails
              ? 'Hide safety answers'
              : `Check all ${SAFETY_ROWS.length} safety answers`}
          </Text>
        </TouchableOpacity>

        {showSafetyDetails ? (
          <View style={styles.statusDetails}>
            {SAFETY_ROWS.map((row, index) => (
              <SafetyRow
                key={row.key}
                icon={row.icon}
                label={row.label}
                value={state.safety[row.key]}
                blocking={
                  row.blocking &&
                  state.safety[row.key] === 'NO'
                }
                last={index === SAFETY_ROWS.length - 1}
              />
            ))}

            <Text style={styles.statusFootnote}>
              A self-report, not a guarantee — recipients always
              use their own judgement.
            </Text>
          </View>
        ) : null}

        {/* The photo, food name, category and headline numbers all live in the
            hero above, so this step never shows the same data twice. */}

        {/* ================================================== */}
        {/* FOOD INFORMATION */}
        {/* ================================================== */}

        <SectionHeader
          eyebrow="DONATION"
          title="Food details"
          editLabel="Edit food"
          onEdit={() => openStep('Details')}
        />

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

        <SectionHeader
          eyebrow="COLLECTION"
          title="Pickup"
          editLabel="Edit pickup"
          onEdit={() => openStep('Details')}
        />

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
        {/* EDIT — every change goes back to the step that owns it */}
        {/* ================================================== */}

        <View style={styles.editCard}>
          <Text style={styles.editCardTitle}>
            Need to change something?
          </Text>

          <TouchableOpacity
            style={styles.editRow}
            onPress={() => openStep('TypeSelect')}
            activeOpacity={0.8}
          >
            <View style={styles.editRowIcon}>
              <Ionicons
                name="flash-outline"
                size={15}
                color={C.teal}
              />
            </View>

            <View style={styles.editRowBody}>
              <Text style={styles.editRowTitle}>
                Donation type
              </Text>

              <Text style={styles.editRowHint}>
                Urgent rescue or standard donation
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={C.muted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editRow}
            onPress={() => openStep('Details')}
            activeOpacity={0.8}
          >
            <View style={styles.editRowIcon}>
              <Ionicons
                name="restaurant-outline"
                size={15}
                color={C.teal}
              />
            </View>

            <View style={styles.editRowBody}>
              <Text style={styles.editRowTitle}>
                Food, photo &amp; pickup
              </Text>

              <Text style={styles.editRowHint}>
                Everything a recipient reads about the food
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={C.muted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editRow, styles.editRowLast]}
            onPress={() => openStep('Safety')}
            activeOpacity={0.8}
          >
            <View style={styles.editRowIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={15}
                color={
                  hasSafetyConcern
                    ? C.danger
                    : C.success
                }
              />
            </View>

            <View style={styles.editRowBody}>
              <Text style={styles.editRowTitle}>
                Safety answers
              </Text>

              <Text style={styles.editRowHint}>
                {hasSafetyConcern
                  ? 'Change an answer and run the check again'
                  : `${answeredCount} of ${SAFETY_ROWS.length} answered`}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={C.muted}
            />
          </TouchableOpacity>
        </View>

        {/* ================================================== */}
        {/* PUBLISH NOTICE */}
        {/* ================================================== */}

        {!hasSafetyConcern ? (
          <View style={styles.publishNotice}>
            <View style={styles.publishNoticeIcon}>
              <Ionicons
                name="eye-outline"
                size={17}
                color={C.teal}
              />
            </View>

            <View style={styles.publishNoticeContent}>
              <Text style={styles.publishNoticeTitle}>
                Before you publish
              </Text>

              <Text style={styles.publishNoticeText}>
                Recipients see exactly what is above — check the
                photo, the pickup place and the times once more.
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
          </>
        )}
      </View>

      {/* No success dialog: publishing replaces this step with My Donations,
          which confirms the post where the donor actually needs to see it. */}
    </SafeAreaView>
  );
}

/* Section label + the edit action for that section, so a donor never has to
   hunt for the way back to a field. */
function SectionHeader({
  eyebrow,
  title,
  editLabel,
  onEdit,
}: {
  eyebrow: string;
  title: string;
  editLabel?: string;
  onEdit?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingText}>
        <Text style={styles.sectionEyebrow}>
          {eyebrow}
        </Text>

        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>

      {onEdit ? (
        <TouchableOpacity
          style={styles.sectionEdit}
          onPress={onEdit}
          activeOpacity={0.8}
        >
          <Ionicons
            name="create-outline"
            size={13}
            color={C.teal}
          />

          <Text style={styles.sectionEditText}>
            {editLabel ?? 'Edit'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
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

const baseStyles: Record<string, any> = {
  /* ====================================================== */
  /* HERO — the donation as a recipient will see it          */
  /* ====================================================== */

  hero: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    ...ELEV,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  heroEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.onDarkFaint,
  },

  heroEditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  heroEditChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.onDark,
  },

  /* aspectRatio keeps the photo framed without a fixed height, so the card
     never jumps when a donation has no photo. */
  heroPhotoFrame: {
    width: '100%',
    aspectRatio: 1.55,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    marginBottom: 14,
  },

  heroPhoto: {
    width: '100%',
    height: '100%',
  },

  heroPhotoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 26,
  },

  heroPhotoEmptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroPhotoEmptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.onDark,
    marginTop: 2,
  },

  heroPhotoEmptyText: {
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: '500',
    color: C.onDarkFaint,
    textAlign: 'center',
  },

  heroTypeChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },

  heroTypeChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: C.white,
  },

  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: C.white,
  },

  heroSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: C.onDarkFaint,
    marginTop: 4,
  },

  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 13,
  },

  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  heroPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.onDark,
  },

  heroPillWarm: {
    backgroundColor: 'rgba(245,165,36,0.14)',
    borderColor: 'rgba(245,165,36,0.4)',
  },

  heroPillWarmText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.amber,
  },

  /* ====================================================== */
  /* SAFETY STATUS STRIP + EXPANDABLE ANSWERS                */
  /* ====================================================== */

  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: C.white,
    borderRadius: 20,
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 10,
    paddingRight: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    ...ELEV_SOFT,
  },

  statusStripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
  },

  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusBody: {
    flex: 1,
  },

  statusKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 2,
  },

  statusTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: C.text,
    marginBottom: 2,
  },

  statusLine: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
    color: C.secondary,
  },

  statusEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.softBlue,
  },

  statusEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.secondary,
  },

  statusConcerns: {
    backgroundColor: C.dangerSoft,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    marginBottom: 6,
  },

  statusConcernRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },

  statusConcernText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: '500',
    color: C.secondary,
  },

  statusConcernLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: C.danger,
  },

  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 7,
    marginBottom: 2,
  },

  statusToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.secondary,
  },

  statusDetails: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    marginBottom: 14,
    ...ELEV_SOFT,
  },

  statusFootnote: {
    fontSize: 10.5,
    lineHeight: 16,
    fontWeight: '500',
    color: C.muted,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },

  /* ====================================================== */
  /* SECTION HEADINGS WITH INLINE EDIT                       */
  /* ====================================================== */

  sectionHeadingText: {
    flex: 1,
  },

  sectionEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.softBlue,
  },

  sectionEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.teal,
  },

  /* ====================================================== */
  /* EDIT CARDS                                              */
  /* ====================================================== */

  editCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    ...ELEV_SOFT,
  },

  editCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.text,
    paddingTop: 13,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },

  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },

  editRowLast: {
    borderBottomWidth: 0,
  },

  editRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  editRowBody: {
    flex: 1,
  },

  editRowTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: C.text,
  },

  editRowHint: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    color: C.muted,
    marginTop: 1,
  },

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
  /* SAFETY ANSWER ROWS (inside the expandable strip)        */
  /* ====================================================== */

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
    height: 22,
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
};

/* ============================================================
   PREMIUM TYPE PASS
   The theme still declares its 'System' placeholders, so every
   rule that sets a fontSize but no real family gets the matching
   Poppins cut, and the shared cards/buttons pick up the refined
   palette above. Identical to the Details and Safety steps.
   ============================================================ */

const PREMIUM_OVERRIDES: Record<string, any> = {
  safeArea: {
    backgroundColor: C.background,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },

  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: C.muted,
  },

  iconCircleButton: {
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  sectionEyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: C.orange,
  },

  /* Group rhythm: each section breathes away from the card above it. */
  sectionHeading: {
    marginTop: 20,
    marginBottom: 11,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: C.text,
  },

  card: {
    borderRadius: 22,
    borderColor: C.border,
    backgroundColor: C.white,
    marginBottom: 4,
    ...ELEV_SOFT,
  },

  reviewRow: {
    minHeight: 56,
  },

  reviewIcon: {
    backgroundColor: C.softBlue,
  },

  reviewLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: C.muted,
  },

  reviewValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: C.text,
  },

  pickupCard: {
    borderRadius: 22,
    borderColor: C.border,
    backgroundColor: C.white,
    marginBottom: 4,
    ...ELEV_SOFT,
  },

  pickupLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: C.muted,
  },

  pickupValue: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },

  pickupTimeHeading: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.muted,
  },

  timeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.muted,
  },

  timeValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: C.text,
  },

  detailsCard: {
    borderRadius: 22,
    borderColor: C.border,
    backgroundColor: C.white,
    marginTop: 18,
    ...ELEV_SOFT,
  },

  detailsTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.text,
  },

  detailsText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: C.secondary,
  },

  safetyRow: {
    paddingVertical: 12,
  },

  safetyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },

  safetyValue: {
    fontSize: 11.5,
    fontWeight: '800',
  },

  editCard: {
    marginTop: 22,
  },

  publishNotice: {
    borderRadius: 20,
    backgroundColor: C.softBlue,
    borderColor: C.border,
    marginTop: 18,
  },

  publishNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.text,
  },

  publishNoticeText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: C.secondary,
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: C.white,
    borderTopColor: C.hairline,
    ...ELEV_SOFT,
  },

  footerHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
  },

  blockedFooterText: {
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: '600',
    color: C.danger,
  },

  publishButton: {
    borderRadius: 999,
    backgroundColor: C.orange,
    ...ELEV_GLOW,
  },

  publishText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: C.white,
  },

  cancelButton: {
    borderRadius: 999,
    borderColor: C.danger,
  },

  cancelButtonText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: C.danger,
  },
};

function applyPremiumTypography(
  defs: Record<string, any>,
): Record<string, any> {
  const enriched: Record<string, any> = {};

  for (const key of Object.keys(defs)) {
    const merged = {
      ...defs[key],
      ...(PREMIUM_OVERRIDES[key] ?? {}),
    };

    const needsFont =
      merged.fontSize !== undefined &&
      (merged.fontFamily === undefined ||
        merged.fontFamily === 'System');

    enriched[key] = needsFont
      ? {
          ...merged,
          fontFamily:
            FONT_BY_WEIGHT[String(merged.fontWeight)] ??
            'Poppins_400Regular',
        }
      : merged;
  }

  return enriched;
}

const styles = StyleSheet.create(
  applyPremiumTypography(baseStyles) as any,
);