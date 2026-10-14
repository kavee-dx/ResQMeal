// frontend/src/screens/donation-flow/kaveesha-SafetyCheckScreen.tsx
// Step 3 of 4 — Food Safety Checker.
// The optional AI photo check is shown first on this step and only runs when
// the donor taps it — it never starts automatically. Answering the
// food-safety checklist does not depend on it.
// This screen provides food-safety decision support only.
// It never confirms that food is safe to eat.
// Owner: Kaveesha

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
import type { AiScreeningResult } from '../../context/kaveesha-CreateDonationContext';
import api from '../../services/api';

type Props = NativeStackScreenProps<
  CreateDonationFlowParamList,
  'Safety'
>;

/* ============================================================
   PREMIUM DESIGN TOKENS
   Local palette + elevation so this step matches the refined
   look of the Details step. Only styling — no logic changes.
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
  softBlue: '#EDF4F7',
  softOrange: '#FFF3E9',

  success: '#2FA35B',
  successSoft: '#EAF7EE',

  warning: '#D99100',
  warningSoft: '#FFF7DD',

  danger: '#DC4C4C',
  dangerSoft: '#FBEBEB',

  onDark: '#CFE0E8',
  onDarkFaint: '#9FB4C0',
};

/* Maps each declared font weight to a loaded Poppins cut and is applied to
   every text style at the bottom of this file. */
const FONT_BY_WEIGHT: Record<string, string> = {
  '400': 'Poppins_400Regular',
  '500': 'Poppins_500Medium',
  '600': 'Poppins_600SemiBold',
  '700': 'Poppins_600SemiBold',
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

type QuestionKey =
  | 'storage'
  | 'temperature'
  | 'handling'
  | 'packaging'
  | 'allergens';

interface Question {
  key: QuestionKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  options: string[];
}

interface SafetyConcern {
  label: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface UncertainItem {
  label: string;
  message: string;
}

const QUESTIONS: Question[] = [
  {
    key: 'storage',
    icon: 'archive-outline',
    title: 'Was the food stored appropriately?',
    description:
      'Consider whether the food was kept under suitable storage conditions after preparation.',
    options: ['YES', 'NO'],
  },
  {
    key: 'temperature',
    icon: 'thermometer-outline',
    title: 'Was appropriate temperature control maintained?',
    description:
      'Think about whether temperature-sensitive food was kept at an appropriate temperature.',
    options: ['YES', 'NO', 'NOT_SURE'],
  },
  {
    key: 'handling',
    icon: 'hand-left-outline',
    title: 'Was the food handled hygienically?',
    description:
      'Consider preparation, serving, and handling practices that could affect the food.',
    options: ['YES', 'NO'],
  },
  {
    key: 'packaging',
    icon: 'cube-outline',
    title: 'Is the food container clean and intact?',
    description:
      'Check that the container is clean, suitable, closed properly, and not damaged or leaking.',
    options: ['YES', 'NO'],
  },
  {
    key: 'allergens',
    icon: 'warning-outline',
    title: 'Does this food contain any known allergens?',
    description:
      'Recipients should receive clear allergen information whenever it is known.',
    options: ['YES', 'NO', 'NOT_SURE'],
  },
];

const OPTION_LABEL: Record<string, string> = {
  YES: 'Yes',
  NO: 'No',
  NOT_SURE: 'Not sure',
};

/* What the optional AI photo check looks for — shown as chips on the hero card. */
const AI_CHECK_FOCUS = [
  { icon: 'eye-outline' as const, label: 'Spoilage & mold' },
  { icon: 'cube-outline' as const, label: 'Packaging damage' },
  { icon: 'restaurant-outline' as const, label: 'Uncovered food' },
];

/* Each verdict is written the way you would explain it to a person — a short
   headline plus one practical next step, never a bare status code. */
const AI_VERDICT_COPY: Record<
  Exclude<AiScreeningResult, 'PENDING'>,
  { headline: string; guidance: string }
> = {
  GOOD: {
    headline: 'Nothing visible looks wrong',
    guidance:
      'Keep in mind a photo cannot show smell, temperature, or how long food has been sitting out — your own knowledge still decides.',
  },
  REVIEW: {
    headline: 'Worth a second look',
    guidance:
      'Have a look at the photo yourself. If it was dark or blurry, retake it in better light and run the check again.',
  },
  CONCERN: {
    headline: 'Something visible may be a problem',
    guidance:
      'Consider re-plating the food in a clean, closed container — or keeping it back if you would not serve it to your own family.',
  },
};

export default function SafetyCheckScreen({ navigation }: Props) {
  const { state, update, updateSafety } = useCreateDonation();

  const [showResult, setShowResult] = useState(false);

  // The verdict box opens collapsed: one colour, one line. The full breakdown
  // is a single tap away for donors who want to see what went into it.
  const [showResultDetails, setShowResultDetails] = useState(false);

  /* =========================================================
     AI PHOTO SCREENING — optional, runs only when the donor taps it
     ========================================================= */

  const [aiRunning, setAiRunning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const spin = useRef(new Animated.Value(0)).current;

  const runAiScreening = useCallback(async () => {
    if (!state.photoBase64) {
      setAiError(
        'No photo was added yet. Go back to the details step and upload a clear food photo to enable the AI check.',
      );
      return;
    }

    setAiRunning(true);
    setAiError(null);
    update('aiResult', 'PENDING');
    update('aiReason', '');

    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        // Web has no native animated module — using the JS driver there keeps
        // the ring smooth instead of logging an unsupported-driver warning.
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();

    // Never flash past the scanning state — hold it for at least ~1.6s.
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1600));

    try {
      const [, response] = await Promise.all([
        minDelay,
        api.post(
          '/donations/analyze-photo',
          {
            imageBase64: state.photoBase64,
            mimeType: state.photoMimeType || 'image/jpeg',
          },
          // The server walks a short chain of free AI models when one is
          // busy, so allow longer than the default 15s request timeout.
          { timeout: 60000 },
        ),
      ]);

      const { result, reason } = response.data as {
        result: AiScreeningResult;
        reason: string;
      };

      update('aiResult', result);
      update('aiReason', reason ?? '');
    } catch (err: any) {
      await minDelay;
      setAiError(
        err?.response?.data?.message ||
          'The photo check could not reach the AI service. Your donation is unaffected — try again, or continue with the checklist.',
      );
    } finally {
      loop.stop();
      setAiRunning(false);
    }
  }, [state.photoBase64, state.photoMimeType, spin, update]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // A result is only shown after a successful scan — PENDING means
  // the donor has not run the optional check yet.
  const aiDone = state.aiResult !== 'PENDING';

  /*
   * Every safety question must be answered before
   * the donor can perform the safety check.
   */
  const allAnswered = QUESTIONS.every(
    (question) => state.safety[question.key] !== null,
  );

  /*
   * These three answers are treated as blocking concerns.
   *
   * Temperature = NOT_SURE and Allergens = NOT_SURE
   * are not automatically treated as blocking concerns.
   * They are shown as uncertain information instead.
   */
  const safetyConcerns = useMemo<SafetyConcern[]>(() => {
    const concerns: SafetyConcern[] = [];

    if (state.safety.storage === 'NO') {
      concerns.push({
        label: 'Storage',
        message: 'Food was not stored appropriately.',
        icon: 'archive-outline',
      });
    }

    if (state.safety.handling === 'NO') {
      concerns.push({
        label: 'Handling',
        message: 'Hygienic food handling was not confirmed.',
        icon: 'hand-left-outline',
      });
    }

    if (state.safety.packaging === 'NO') {
      concerns.push({
        label: 'Packaging',
        message:
          'The food container was reported as not clean or intact.',
        icon: 'cube-outline',
      });
    }

    return concerns;
  }, [state.safety]);

  const hasBlockingConcern = safetyConcerns.length > 0;

  /*
   * Information that is uncertain but does not automatically
   * block the donation.
   */
  const uncertainItems = useMemo<UncertainItem[]>(() => {
    const items: UncertainItem[] = [];

    if (state.safety.temperature === 'NOT_SURE') {
      items.push({
        label: 'Temperature',
        message:
          'Temperature control could not be confirmed.',
      });
    }

    if (state.safety.allergens === 'NOT_SURE') {
      items.push({
        label: 'Allergens',
        message:
          'Allergen information could not be confirmed.',
      });
    }

    return items;
  }, [state.safety]);

  /*
   * A single compact verdict for the pop-up box — colour, icon and one plain
   * sentence. Details are deliberately kept out of the headline view.
   */
  const verdict = useMemo(() => {
    if (hasBlockingConcern) {
      return {
        kicker: 'NOT READY TO POST',
        title: 'Please reconsider this donation',
        line: 'Your answers reported a food-safety concern, so this cannot go through ResQMeal.',
        icon: 'close-circle' as const,
        accent: C.danger,
        soft: C.dangerSoft,
      };
    }

    if (uncertainItems.length > 0) {
      return {
        kicker: 'READY — WITH NOTES',
        title: 'Passed, with things to confirm',
        line: `No blocking concern, but ${uncertainItems.length} answer${
          uncertainItems.length === 1 ? ' is' : 's are'
        } marked “Not sure”. Recipients will see that.`,
        icon: 'alert-circle' as const,
        accent: C.warning,
        soft: C.warningSoft,
      };
    }

    return {
      kicker: 'SAFETY CHECK PASSED',
      title: 'You are good to go',
      line: 'Every required answer looks safe. Continue to review your donation.',
      icon: 'checkmark-circle' as const,
      accent: C.success,
      soft: C.successSoft,
    };
  }, [hasBlockingConcern, uncertainItems]);

  // How many individual notes sit behind "Show details".
  const resultDetailCount =
    safetyConcerns.length +
    uncertainItems.length +
    (aiDone && state.aiReason ? 1 : 0);

  const answeredCount = QUESTIONS.filter(
    (question) => state.safety[question.key] !== null,
  ).length;

  const aiResult = state.aiResult;

  /*
   * AI is only decision support.
   * It is deliberately displayed separately from the
   * questionnaire result.
   */
  const aiStatus = useMemo(() => {
    switch (aiResult) {
      case 'GOOD':
        return {
          icon: 'checkmark-circle-outline' as const,
          title: 'AI screening completed',
          shortLabel: 'GOOD',
          message:
            'No obvious visual concern was identified from the submitted photo.',
          background: colors.successSoft,
          iconColor: colors.success,
        };

      case 'REVIEW':
        return {
          icon: 'alert-circle-outline' as const,
          title: 'Manual review recommended',
          shortLabel: 'REVIEW',
          message:
            'The photo contains something that may need closer attention.',
          background: colors.accentSoft,
          iconColor: colors.accent,
        };

      case 'CONCERN':
        return {
          icon: 'close-circle-outline' as const,
          title: 'Visual concern identified',
          shortLabel: 'CONCERN',
          message:
            'The photo contains a visible indicator that should be considered before continuing.',
          background: colors.urgentSoft,
          iconColor: colors.urgent,
        };

      default:
        return {
          icon: 'information-circle-outline' as const,
          title: 'AI screening not performed',
          shortLabel: 'NOT PERFORMED',
          message:
            'AI visual screening was optional. Continue using the information you can personally verify.',
          background: colors.primaryLight,
          iconColor: colors.info,
        };
    }
  }, [aiResult]);

  function handleAnswer(
    question: Question,
    option: string,
  ) {
    updateSafety(question.key, option as any);

    /*
     * If the donor changes an answer after seeing a result,
     * the previous result is no longer valid.
     *
     * They must perform the safety check again.
     */
    setShowResult(false);
  }

  function handleCheckSafety() {
    if (!allAnswered) {
      return;
    }

    setShowResultDetails(false);
    setShowResult(true);
  }

  function closeResultBox() {
    setShowResult(false);
    setShowResultDetails(false);
  }

  function goToReview() {
    setShowResult(false);
    setShowResultDetails(false);

    navigation.navigate('Review');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ========================= HEADER ========================= */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconCircleButton}
          onPress={() => navigation.goBack()}
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
            STEP 3 OF 4
          </Text>

          <Text style={styles.headerTitle}>
            Safety Check
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <KaveeshaStepProgress
        step={3}
        total={4}
        label="Food Safety Checker"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ====== AI FOOD SAFETY CHECK — optional, first thing on this step ====== */}

        <LinearGradient
          colors={[C.navy, C.navyDeep]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={styles.aiHero}
        >
          {/* The photo itself, shown large so the donor sees exactly what the
              AI is looking at. While scanning, a dim overlay + ring sits on top. */}
          <View style={styles.aiPhotoFrame}>
            {state.photoUri ? (
              <Image
                source={{ uri: state.photoUri }}
                resizeMode="cover"
                style={styles.aiPhotoLarge}
              />
            ) : (
              <View style={styles.aiPhotoEmpty}>
                <Ionicons
                  name="image-outline"
                  size={30}
                  color={C.onDarkFaint}
                />

                <Text style={styles.aiPhotoEmptyText}>
                  No photo attached to this donation
                </Text>
              </View>
            )}

            {state.photoUri ? (
              <View style={styles.aiPhotoTag}>
                <Ionicons
                  name="camera-outline"
                  size={11}
                  color={C.white}
                />

                <Text style={styles.aiPhotoTagText}>
                  YOUR PHOTO
                </Text>
              </View>
            ) : null}

            {aiRunning ? (
              <View style={styles.aiPhotoScanning}>
                <View style={styles.aiSpinOuter}>
                  <Animated.View
                    style={[
                      styles.aiSpinRingLight,
                      { transform: [{ rotate }] },
                    ]}
                  />
                </View>

                <Text style={styles.aiScanningLabel}>
                  Checking your photo…
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.aiHeroTitleRow}>
            <Text style={styles.aiHeroTitle}>
              AI Food Safety Check
            </Text>

            <View style={styles.aiHeroBadge}>
              <Text style={styles.aiHeroBadgeText}>
                {aiDone ? 'COMPLETED' : 'OPTIONAL'}
              </Text>
            </View>
          </View>

          <Text style={styles.aiHeroText}>
            {aiRunning
              ? 'Looking at your photo for visible signs of spoilage, damaged packaging, or uncovered food…'
              : aiError
                ? 'The check did not finish. Your donation is not affected — try again or continue below.'
                : aiDone
                  ? 'Here is what the optional photo check found on your photo.'
                  : state.photoBase64
                    ? 'Get a quick AI second opinion on the photo you uploaded. It is completely optional — skip it any time and continue with the checklist below.'
                    : 'A photo check needs a food photo. The checklist below works exactly the same either way.'}
          </Text>

          {/* ===== Verdict — a tinted panel in the result colour, with the
                AI's own words and one clear next step. ===== */}
          {aiDone && !aiRunning && !aiError ? (
            <View
              style={[
                styles.aiVerdictPanel,
                { backgroundColor: aiStatus.background, borderColor: aiStatus.iconColor },
              ]}
            >
              <View style={styles.aiVerdictHead}>
                <View
                  style={[
                    styles.aiVerdictBadge,
                    { backgroundColor: aiStatus.iconColor },
                  ]}
                >
                  <Ionicons
                    name={aiStatus.icon}
                    size={20}
                    color={C.white}
                  />
                </View>

                <View style={styles.aiVerdictHeadText}>
                  <Text style={styles.aiVerdictKicker}>
                    {aiStatus.shortLabel}
                  </Text>

                  <Text style={styles.aiVerdictHeadline}>
                    {AI_VERDICT_COPY[state.aiResult as Exclude<AiScreeningResult, 'PENDING'>].headline}
                  </Text>
                </View>
              </View>

              {state.aiReason ? (
                <View style={styles.aiReasonBox}>
                  <Text style={styles.aiReasonLabel}>
                    What the AI saw
                  </Text>

                  <Text style={styles.aiReasonText}>
                    “{state.aiReason}”
                  </Text>
                </View>
              ) : null}

              <View style={styles.aiNextRow}>
                <Ionicons
                  name="bulb-outline"
                  size={15}
                  color={aiStatus.iconColor}
                />

                <Text style={styles.aiNextText}>
                  {AI_VERDICT_COPY[state.aiResult as Exclude<AiScreeningResult, 'PENDING'>].guidance}
                </Text>
              </View>

              <View style={styles.aiNoteRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={13}
                  color={C.muted}
                />

                <Text style={styles.aiNoteText}>
                  Decision support only — a photo can never prove food is safe.
                </Text>
              </View>
            </View>
          ) : null}

          {aiError && !aiRunning ? (
            <View style={styles.aiErrorPanel}>
              <Ionicons
                name="cloud-offline-outline"
                size={18}
                color={C.amber}
              />

              <Text style={styles.aiErrorText}>
                {aiError}
              </Text>
            </View>
          ) : null}

          {!aiDone && !aiRunning && !aiError && state.photoBase64 ? (
            <View style={styles.aiChipRow}>
              {AI_CHECK_FOCUS.map((focus) => (
                <View
                  key={focus.label}
                  style={styles.aiChip}
                >
                  <Ionicons
                    name={focus.icon}
                    size={13}
                    color={C.onDarkFaint}
                  />

                  <Text style={styles.aiChipText}>
                    {focus.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {state.photoBase64 && !aiRunning ? (
            <TouchableOpacity
              style={[
                styles.aiCta,
                aiDone ? styles.aiCtaQuiet : null,
              ]}
              onPress={() => runAiScreening()}
              activeOpacity={0.88}
            >
              <Ionicons
                name={
                  aiDone
                    ? 'refresh'
                    : aiError
                      ? 'cloud-upload-outline'
                      : 'shield-checkmark-outline'
                }
                size={18}
                color={aiDone ? C.onDark : C.white}
              />

              <Text
                style={[
                  styles.aiCtaText,
                  aiDone ? styles.aiCtaTextQuiet : null,
                ]}
              >
                {aiDone
                  ? 'Check the photo again'
                  : aiError
                    ? 'Try the safety check again'
                    : 'Check Food Safety'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </LinearGradient>

        {/* ========================= INTRO ========================= */}

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={25}
              color={colors.primary}
            />
          </View>

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              Help recipients make an informed decision
            </Text>

            <Text style={styles.introText}>
              Answer these quick questions based on what you
              know about the food. This checklist provides
              decision support and does not confirm that food
              is safe to eat.
            </Text>
          </View>
        </View>

        {/* ========================= SECTION HEADER ========================= */}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionEyebrow}>
              FINAL CHECK
            </Text>

            <Text style={styles.sectionTitle}>
              Food safety information
            </Text>
          </View>

          <View
            style={[
              styles.progressBadge,
              answeredCount === QUESTIONS.length &&
                styles.progressBadgeComplete,
            ]}
          >
            {answeredCount === QUESTIONS.length ? (
              <Ionicons
                name="checkmark"
                size={13}
                color={colors.white}
              />
            ) : null}

            <Text style={styles.progressBadgeText}>
              {answeredCount}/{QUESTIONS.length}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionDescription}>
          Please answer every question before performing the
          final safety check.
        </Text>

        {/* ========================= QUESTIONS ========================= */}

        {QUESTIONS.map((question, index) => {
          const selectedValue = state.safety[question.key];

          return (
            <View
              key={question.key}
              style={[
                styles.questionCard,
                selectedValue !== null &&
                  styles.questionCardAnswered,
              ]}
            >
              <View style={styles.questionTopRow}>
                <View
                  style={[
                    styles.questionNumber,
                    selectedValue !== null &&
                      styles.questionNumberAnswered,
                  ]}
                >
                  {selectedValue !== null ? (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={colors.white}
                    />
                  ) : (
                    <Text style={styles.questionNumberText}>
                      {index + 1}
                    </Text>
                  )}
                </View>

                <View style={styles.questionIconWrap}>
                  <Ionicons
                    name={question.icon}
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.questionHeaderContent}>
                  <Text style={styles.questionTitle}>
                    {question.title}
                  </Text>

                  <Text style={styles.questionDescription}>
                    {question.description}
                  </Text>
                </View>
              </View>

              <View style={styles.optionsRow}>
                {question.options.map((option) => {
                  const selected =
                    selectedValue === option;

                  const isNo = option === 'NO';
                  const isNotSure =
                    option === 'NOT_SURE';

                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        selected &&
                          styles.optionButtonSelected,
                        selected &&
                          isNo &&
                          styles.optionButtonDanger,
                        selected &&
                          isNotSure &&
                          styles.optionButtonWarning,
                      ]}
                      onPress={() =>
                        handleAnswer(question, option)
                      }
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.optionRadio,
                          selected &&
                            styles.optionRadioSelected,
                          selected &&
                            isNo &&
                            styles.optionRadioDanger,
                          selected &&
                            isNotSure &&
                            styles.optionRadioWarning,
                        ]}
                      >
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={13}
                            color={colors.white}
                          />
                        ) : null}
                      </View>

                      <Text
                        style={[
                          styles.optionText,
                          selected &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {OPTION_LABEL[option]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* ========================= NOT SURE INFO ========================= */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={colors.info}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Not sure?
            </Text>

            <Text style={styles.infoText}>
              Choose “Not sure” when you genuinely cannot
              verify the information. This helps avoid making
              assumptions about the food.
            </Text>
          </View>
        </View>

        {/* The safety verdict is shown in a focused pop-up box (see the Modal
            at the end of this screen) so this page stays short and readable. */}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* ========================= FOOTER ========================= */}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !allAnswered &&
              styles.continueButtonDisabled,
          ]}
          disabled={!allAnswered}
          onPress={handleCheckSafety}
          activeOpacity={0.85}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={19}
            color={colors.white}
          />

          <Text style={styles.continueText}>
            {allAnswered
              ? 'Check My Safety Answers'
              : `Answer All ${QUESTIONS.length} Questions First`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================
          SAFETY VERDICT BOX
          Pops up over the page the same way the app's confirmations
          do, so the result is impossible to miss and the page below
          stays short.
          ========================================================= */}

      <Modal
        visible={showResult}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeResultBox}
      >
        <View style={styles.resultOverlay}>
          <TouchableOpacity
            style={styles.resultOverlayTouch}
            activeOpacity={1}
            onPress={closeResultBox}
          />

          <View style={styles.resultSheet}>
            <View
              style={[
                styles.resultStripe,
                { backgroundColor: verdict.accent },
              ]}
            />

            <TouchableOpacity
              style={styles.resultClose}
              onPress={closeResultBox}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close"
                size={19}
                color={C.muted}
              />
            </TouchableOpacity>

            <View
              style={[
                styles.resultBadgeHalo,
                { backgroundColor: verdict.soft },
              ]}
            >
              <View
                style={[
                  styles.resultBadge,
                  { backgroundColor: verdict.accent },
                ]}
              >
                <Ionicons
                  name={verdict.icon}
                  size={27}
                  color={C.white}
                />
              </View>
            </View>

            <Text
              style={[
                styles.resultKicker,
                { color: verdict.accent },
              ]}
            >
              {verdict.kicker}
            </Text>

            <Text style={styles.resultTitle}>
              {verdict.title}
            </Text>

            <Text style={styles.resultLine}>
              {verdict.line}
            </Text>

            {aiDone ? (
              <View
                style={[
                  styles.resultAiChip,
                  {
                    backgroundColor: aiStatus.background,
                    borderColor: aiStatus.iconColor,
                  },
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={13}
                  color={aiStatus.iconColor}
                />

                <Text
                  style={[
                    styles.resultAiChipText,
                    { color: aiStatus.iconColor },
                  ]}
                >
                  {`AI photo check · ${aiStatus.shortLabel}`}
                </Text>
              </View>
            ) : null}

            {resultDetailCount > 0 ? (
              <TouchableOpacity
                style={styles.resultDetailsToggle}
                onPress={() =>
                  setShowResultDetails((open) => !open)
                }
                activeOpacity={0.75}
              >
                <Ionicons
                  name={
                    showResultDetails
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={15}
                  color={C.secondary}
                />

                <Text style={styles.resultDetailsToggleText}>
                  {showResultDetails
                    ? 'Hide details'
                    : `Show ${resultDetailCount} detail${
                        resultDetailCount === 1 ? '' : 's'
                      }`}
                </Text>
              </TouchableOpacity>
            ) : null}

            {showResultDetails ? (
              <ScrollView
                style={styles.resultDetailsScroll}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.resultDetails}>
                  {safetyConcerns.length > 0 ? (
                    <Text style={styles.resultDetailsHeading}>
                      REPORTED CONCERNS
                    </Text>
                  ) : null}

                  {safetyConcerns.map((concern) => (
                    <View
                      key={concern.label}
                      style={styles.concernItem}
                    >
                      <View style={styles.concernIcon}>
                        <Ionicons
                          name="close"
                          size={14}
                          color={colors.urgent}
                        />
                      </View>

                      <View style={styles.concernContent}>
                        <View style={styles.concernLabelRow}>
                          <Ionicons
                            name={concern.icon}
                            size={15}
                            color={colors.urgent}
                          />

                          <Text style={styles.concernLabel}>
                            {concern.label}
                          </Text>
                        </View>

                        <Text style={styles.concernMessage}>
                          {concern.message}
                        </Text>
                      </View>
                    </View>
                  ))}

                  {uncertainItems.length > 0 ? (
                    <Text style={styles.resultDetailsHeading}>
                      NOT CONFIRMED
                    </Text>
                  ) : null}

                  {uncertainItems.map((item) => (
                    <View
                      key={item.label}
                      style={styles.uncertainItem}
                    >
                      <View style={styles.uncertainBullet}>
                        <View />
                      </View>

                      <View style={styles.uncertainContent}>
                        <Text style={styles.uncertainLabel}>
                          {item.label}
                        </Text>

                        <Text style={styles.uncertainMessage}>
                          {item.message}
                        </Text>
                      </View>
                    </View>
                  ))}

                  {aiDone && state.aiReason ? (
                    <>
                      <Text style={styles.resultDetailsHeading}>
                        AI PHOTO CHECK
                      </Text>

                      <Text style={styles.aiResultQuote}>
                        “{state.aiReason}”
                      </Text>
                    </>
                  ) : null}
                </View>
              </ScrollView>
            ) : null}

            <Text style={styles.resultFootnote}>
              A self-report, not a guarantee — recipients always use their own
              judgement.
            </Text>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.resultSecondary}
                onPress={closeResultBox}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="create-outline"
                  size={17}
                  color={C.secondary}
                />

                <Text style={styles.resultSecondaryText}>
                  {hasBlockingConcern
                    ? 'Fix my answers'
                    : 'Keep editing'}
                </Text>
              </TouchableOpacity>

              {hasBlockingConcern ? (
                <TouchableOpacity
                  style={styles.resultDanger}
                  onPress={() =>
                    navigation.getParent()?.goBack()
                  }
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={17}
                    color={C.white}
                  />

                  <Text style={styles.resultDangerText}>
                    Cancel donation
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.resultPrimary}
                  onPress={goToReview}
                  activeOpacity={0.85}
                >
                  <Text style={styles.resultPrimaryText}>
                    Continue to Review
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color={C.white}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const baseStyles: Record<string, any> = {
  /* ========================= AI HERO CARD ========================= */

  aiHero: {
    borderRadius: 26,
    padding: 20,
    marginBottom: 20,
    ...ELEV,
  },

  /* Big framed preview — the donor sees exactly what the AI is looking at. */
  aiPhotoFrame: {
    width: '100%',
    aspectRatio: 1.3,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  aiPhotoLarge: {
    width: '100%',
    height: '100%',
  },

  aiPhotoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 24,
  },

  aiPhotoEmptyText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: C.onDarkFaint,
    textAlign: 'center',
    marginTop: 4,
  },

  aiPhotoTag: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(4,22,31,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  aiPhotoTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.white,
  },

  /* Scanning state sits on top of the photo instead of pushing layout. */
  aiPhotoScanning: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    backgroundColor: 'rgba(4,22,31,0.74)',
  },

  aiScanningLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.white,
  },

  aiHeroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
    marginBottom: 7,
  },

  aiHeroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.white,
  },

  aiHeroBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(249,115,22,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.45)',
  },

  aiHeroBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.amber,
  },

  aiHeroText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: C.onDark,
  },

  /* ===== The verdict, in a panel tinted with the result colour ===== */
  aiVerdictPanel: {
    marginTop: 16,
    padding: 15,
    borderRadius: 18,
    borderWidth: 1.5,
  },

  aiVerdictHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  aiVerdictBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiVerdictHeadText: {
    flex: 1,
  },

  aiVerdictKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.secondary,
    marginBottom: 2,
  },

  aiVerdictHeadline: {
    fontSize: 15.5,
    fontWeight: '800',
    lineHeight: 21,
    color: C.text,
  },

  aiReasonBox: {
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(8,38,52,0.1)',
  },

  aiReasonLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.muted,
    marginBottom: 4,
  },

  aiReasonText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
    color: C.text,
  },

  aiNextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 13,
  },

  aiNextText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: '600',
    color: C.secondary,
  },

  aiNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(8,38,52,0.1)',
  },

  aiNoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: C.muted,
  },

  aiErrorPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
    padding: 13,
    borderRadius: 16,
    backgroundColor: 'rgba(245,165,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,165,36,0.35)',
  },

  aiErrorText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: '500',
    color: C.onDark,
  },

  aiSpinRingLight: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: C.orange,
    borderTopColor: 'transparent',
  },

  aiCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    marginTop: 18,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: C.orange,
    ...ELEV_GLOW,
  },

  aiCtaText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.2,
  },

  /* Once a result is on screen the button becomes a quiet "run again" link. */
  aiCtaQuiet: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowOpacity: 0,
    elevation: 0,
    paddingVertical: 13,
  },

  aiCtaTextQuiet: {
    color: C.onDark,
    fontSize: 13.5,
  },

  aiChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },

  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  aiChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.onDarkFaint,
  },

  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },

  /* ========================= HEADER ========================= */

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

  /* ========================= SCROLL ========================= */

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  /* ========================= INTRO ========================= */

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
    width: 48,
    height: 48,
    borderRadius: 24,
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

  /* ========================= AI TOP CARD ========================= */

  aiStatusCard: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },

  aiIdleCard: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },

  aiStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  aiStatusContent: {
    flex: 1,
  },

  aiStatusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 4,
  },

  aiStatusTitle: {
    ...typography.label,
    flexShrink: 1,
  },

  optionalBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },

  optionalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.7,
  },

  aiStatusMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  aiReason: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 7,
    lineHeight: 18,
  },

  aiSpinOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  aiSpinRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
  },

  aiRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },

  aiRetryText: {
    ...typography.label,
    color: colors.white,
    marginLeft: 5,
  },

  /* ========================= SECTION ========================= */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 5,
  },

  sectionHeaderLeft: {
    flex: 1,
    paddingRight: spacing.sm,
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

  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },

  progressBadgeComplete: {
    backgroundColor: colors.success,
  },

  progressBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },

  sectionDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 19,
  },

  /* ========================= QUESTIONS ========================= */

  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  questionCardAnswered: {
    borderColor: colors.primaryLight,
  },

  questionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  questionNumber: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  questionNumberAnswered: {
    backgroundColor: colors.success,
  },

  questionNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },

  questionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  questionHeaderContent: {
    flex: 1,
  },

  questionTitle: {
    ...typography.label,
    color: colors.textPrimary,
    lineHeight: 19,
  },

  questionDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },

  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },

  optionButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
  },

  optionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  optionButtonDanger: {
    backgroundColor: colors.urgent,
    borderColor: colors.urgent,
  },

  optionButtonWarning: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },

  optionRadioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  optionRadioDanger: {
    borderColor: colors.urgent,
    backgroundColor: colors.urgent,
  },

  optionRadioWarning: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },

  optionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },

  optionTextSelected: {
    color: colors.white,
  },

  /* ========================= INFO ========================= */

  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
  },

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: 3,
  },

  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  /* ========================= VERDICT POP-UP BOX ========================= */

  /* Same overlay pattern the app uses for its confirmations: a dim backdrop,
     a tappable escape area behind the sheet, and one focused card. */
  resultOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 16,
    backgroundColor: 'rgba(4,22,31,0.55)',
  },

  resultOverlayTouch: {
    ...StyleSheet.absoluteFillObject,
  },

  resultSheet: {
    width: '100%',
    maxWidth: 440,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderRadius: 28,
    backgroundColor: C.white,
    alignItems: 'center',
    overflow: 'hidden',
    ...ELEV,
  },

  /* Coloured edge at the top of the sheet carries the pass/warn/fail state. */
  resultStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },

  resultClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.softBlue,
  },

  resultBadgeHalo: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  resultBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 6,
    textAlign: 'center',
  },

  resultTitle: {
    ...typography.label,
    textAlign: 'center',
    marginBottom: 7,
  },

  resultLine: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
    color: C.secondary,
    textAlign: 'center',
    marginBottom: 12,
  },

  resultAiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 4,
  },

  resultAiChipText: {
    fontSize: 11.5,
    fontWeight: '800',
  },

  resultDetailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
  },

  resultDetailsToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Details stay inside the box and scroll — the sheet never grows past the
     screen and the page behind it is never pushed down. */
  resultDetailsScroll: {
    alignSelf: 'stretch',
    maxHeight: 178,
    marginTop: 4,
  },

  resultDetails: {
    alignSelf: 'stretch',
    borderRadius: 16,
    backgroundColor: '#F5FAFC',
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    paddingBottom: 4,
  },

  resultDetailsHeading: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.muted,
    marginTop: 4,
    marginBottom: 3,
  },

  resultFootnote: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    color: C.muted,
    textAlign: 'center',
    marginTop: 11,
  },

  resultActions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 14,
  },

  resultPrimary: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: C.orange,
  },

  resultPrimaryText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.white,
  },

  resultSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
  },

  resultSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.secondary,
  },

  resultDanger: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: C.danger,
  },

  resultDangerText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.white,
  },

  /* ========================= DANGER MESSAGE ========================= */

  warningMessageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.urgentSoft,
  },

  warningIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.urgentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  warningMessageContent: {
    flex: 1,
  },

  warningMessageTitle: {
    ...typography.label,
    color: colors.urgent,
    marginBottom: 4,
  },

  warningMessageText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  /* ========================= CONCERNS ========================= */

  concernsSection: {
    marginTop: spacing.xs,
  },

  concernsSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.urgent,
    letterSpacing: 1.1,
    marginBottom: spacing.sm,
  },

  concernItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },

  concernIcon: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  concernContent: {
    flex: 1,
  },

  concernLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },

  concernLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },

  concernMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  finalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },

  finalWarningText: {
    ...typography.bodySmall,
    color: colors.urgent,
    fontWeight: '700',
    flex: 1,
    marginLeft: 7,
  },

  /* ========================= PASSED ========================= */

  passedMessageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  passedIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  passedMessageContent: {
    flex: 1,
  },

  passedMessageTitle: {
    ...typography.label,
    color: colors.success,
    marginBottom: 4,
  },

  passedMessageText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  /* ========================= UNCERTAIN ========================= */

  uncertainSection: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  uncertainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  uncertainTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1,
    marginLeft: 6,
  },

  uncertainItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 7,
  },

  uncertainBullet: {
    width: 18,
    alignItems: 'center',
    paddingTop: 6,
  },

  uncertainContent: {
    flex: 1,
  },

  uncertainLabel: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: 2,
  },

  uncertainMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  /* ========================= DISCLAIMER ========================= */

  resultDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  resultDisclaimerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: 6,
    lineHeight: 17,
  },

  /* ========================= AI RESULT ========================= */

  aiResultSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  aiResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  aiResultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiResultHeaderText: {
    flex: 1,
    marginLeft: 8,
  },

  aiResultTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.1,
  },

  aiResultSubtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 1,
  },

  aiResultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm,
  },

  aiResultStatusIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiResultContent: {
    flex: 1,
    marginLeft: 8,
  },

  aiResultMainText: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: 3,
  },

  aiResultDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  /* The tinted variant gets a hairline in the verdict colour. */
  aiResultRowTinted: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },

  aiResultQuote: {
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: 7,
    paddingLeft: 9,
    borderLeftWidth: 3,
    borderLeftColor: C.orange,
  },

  aiDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },

  aiDisclaimerText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    lineHeight: 17,
    flex: 1,
    marginLeft: 5,
  },

  /* ========================= BOTTOM ========================= */

  bottomSpace: {
    height: 130,
  },

  /* ========================= FOOTER ========================= */

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },

  continueButton: {
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
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },

  continueButtonDisabled: {
    opacity: 0.45,
  },

  continueText: {
    ...typography.button,
    color: colors.white,
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
   PREMIUM OVERRIDES
   Refined values merged over the sheet above so the whole step
   shares one modern, high-end look — no JSX or logic changes.
   ============================================================ */

const PREMIUM_OVERRIDES: Record<string, any> = {
  /* HEADER */

  header: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 2,
    backgroundColor: C.background,
  },

  iconCircleButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    ...ELEV_SOFT,
  },

  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: C.orange,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: C.navy,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },

  /* INTRO */

  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#EDF3F6',
    ...ELEV_SOFT,
  },

  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: C.softOrange,
    marginRight: 13,
  },

  introTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: C.navy,
    lineHeight: 21,
  },

  introText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: C.secondary,
    marginTop: 3,
  },

  /* SECTION HEADER */

  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: C.orange,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.navy,
  },

  progressBadge: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.softBlue,
    borderWidth: 1,
    borderColor: C.border,
  },

  progressBadgeComplete: {
    backgroundColor: C.success,
    borderColor: C.success,
  },

  progressBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.teal,
  },

  sectionDescription: {
    fontSize: 12.5,
    lineHeight: 19,
    color: C.secondary,
    marginBottom: 16,
  },

  /* QUESTION CARDS */

  questionCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#EDF3F6',
    ...ELEV_SOFT,
  },

  questionCardAnswered: {
    borderColor: 'rgba(14,107,128,0.35)',
    backgroundColor: '#FCFEFF',
  },

  questionNumber: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: C.softBlue,
  },

  questionNumberAnswered: {
    backgroundColor: C.success,
  },

  questionNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.teal,
  },

  questionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: C.navy,
    lineHeight: 20,
  },

  questionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: C.secondary,
    marginTop: 3,
  },

  /* ANSWER OPTIONS */

  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
  },

  optionButtonSelected: {
    borderColor: C.navy,
    backgroundColor: C.navy,
    ...ELEV_SOFT,
  },

  optionButtonDanger: {
    borderColor: C.danger,
    backgroundColor: C.danger,
  },

  optionButtonWarning: {
    borderColor: C.warning,
    backgroundColor: C.warning,
  },

  optionRadio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.muted,
  },

  optionText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 0.2,
  },

  optionTextSelected: {
    color: C.white,
  },

  /* INFO CARD */

  infoCard: {
    flexDirection: 'row',
    backgroundColor: C.softBlue,
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(14,107,128,0.14)',
  },

  infoTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.navy,
  },

  infoText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: C.secondary,
    marginTop: 2,
  },

  /* RESULT — the pop-up verdict box is styled in baseStyles; only the type
     scale is upgraded here. */

  resultTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: C.navy,
    lineHeight: 26,
  },

  warningMessageTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.navy,
  },

  warningMessageText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: C.secondary,
    marginTop: 2,
  },

  concernsSectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.danger,
  },

  concernItem: {
    flexDirection: 'row',
    backgroundColor: C.dangerSoft,
    borderRadius: 16,
    padding: 13,
    marginBottom: 9,
  },

  concernLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: C.danger,
  },

  concernMessage: {
    fontSize: 12.5,
    lineHeight: 18,
    color: C.secondary,
    marginTop: 1,
  },

  finalWarning: {
    flexDirection: 'row',
    backgroundColor: C.navy,
    borderRadius: 18,
    padding: 15,
    marginTop: 6,
  },

  finalWarningText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 19,
    color: C.onDark,
    fontWeight: '600',
  },

  passedMessageTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.success,
  },

  passedMessageText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: C.secondary,
    marginTop: 2,
  },

  uncertainTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.warning,
  },

  uncertainLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: C.navy,
  },

  uncertainMessage: {
    fontSize: 12.5,
    lineHeight: 18,
    color: C.secondary,
    marginTop: 1,
  },

  resultDisclaimer: {
    flexDirection: 'row',
    backgroundColor: '#FAFCFD',
    borderRadius: 16,
    padding: 13,
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.border,
  },

  resultDisclaimerText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    color: C.muted,
  },

  /* RESULT AI RECAP */

  aiResultSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  aiResultTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.navy,
  },

  aiResultSubtitle: {
    fontSize: 11.5,
    color: C.muted,
    marginTop: 1,
  },

  aiResultMainText: {
    fontSize: 13.5,
    fontWeight: '800',
  },

  aiResultDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    color: C.secondary,
    marginTop: 2,
  },

  aiDisclaimerText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    color: C.muted,
  },

  /* FOOTER */

  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: '#EDF3F6',
    ...ELEV_SOFT,
  },

  continueButton: {
    paddingVertical: 18,
    borderRadius: 999,
    backgroundColor: C.orange,
    ...ELEV_GLOW,
  },

  continueText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.2,
  },

  continueButtonDisabled: {
    backgroundColor: '#CBD8DE',
    opacity: 1,
    shadowOpacity: 0,
    elevation: 0,
  },

  bottomSpace: {
    height: 10,
  },

  cancelButton: {
    paddingVertical: 17,
    borderRadius: 999,
    borderColor: C.danger,
    backgroundColor: C.white,
  },

  cancelButtonText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: C.danger,
  },
};

/* Apply Poppins from each declared weight (also replacing the theme's
   'System' placeholders) and merge the premium overrides, then register
   the whole sheet once. */
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