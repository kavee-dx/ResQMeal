// frontend/src/screens/donation-flow/kaveesha-SafetyCheckScreen.tsx
// Step 4 of 5 — Food Safety Checker.
// This screen provides food-safety decision support only.
// It never confirms that food is safe to eat.
// Owner: Kaveesha

import React, { useMemo, useState } from 'react';
import {
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

type Props = NativeStackScreenProps<
  CreateDonationFlowParamList,
  'Safety'
>;

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

export default function SafetyCheckScreen({ navigation }: Props) {
  const { state, updateSafety } = useCreateDonation();

  const [showResult, setShowResult] = useState(false);

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

    setShowResult(true);
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
            STEP 4 OF 5
          </Text>

          <Text style={styles.headerTitle}>
            Safety Check
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <KaveeshaStepProgress
        step={4}
        total={5}
        label="Food Safety Checker"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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

        {/* ========================= AI STATUS ========================= */}

        <View
          style={[
            styles.aiStatusCard,
            {
              backgroundColor: aiStatus.background,
            },
          ]}
        >
          <View style={styles.aiStatusIcon}>
            <Ionicons
              name={aiStatus.icon}
              size={21}
              color={aiStatus.iconColor}
            />
          </View>

          <View style={styles.aiStatusContent}>
            <View style={styles.aiStatusTitleRow}>
              <Text
                style={[
                  styles.aiStatusTitle,
                  {
                    color: aiStatus.iconColor,
                  },
                ]}
              >
                {aiStatus.title}
              </Text>

              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>
                  OPTIONAL
                </Text>
              </View>
            </View>

            <Text style={styles.aiStatusMessage}>
              {aiStatus.message}
            </Text>

            {state.aiReason ? (
              <Text style={styles.aiReason}>
                {state.aiReason}
              </Text>
            ) : null}
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

        {/* ========================= RESULT ========================= */}

        {showResult ? (
          <View
            style={[
              styles.resultCard,
              hasBlockingConcern
                ? styles.resultCardDanger
                : styles.resultCardSuccess,
            ]}
          >
            {/* Result Header */}

            <View style={styles.resultHeader}>
              <View
                style={[
                  styles.resultIcon,
                  hasBlockingConcern
                    ? styles.resultIconDanger
                    : styles.resultIconSuccess,
                ]}
              >
                <Ionicons
                  name={
                    hasBlockingConcern
                      ? 'close-circle'
                      : 'checkmark-circle'
                  }
                  size={26}
                  color={
                    hasBlockingConcern
                      ? colors.urgent
                      : colors.success
                  }
                />
              </View>

              <View style={styles.resultHeaderContent}>
                <Text
                  style={[
                    styles.resultEyebrow,
                    {
                      color: hasBlockingConcern
                        ? colors.urgent
                        : colors.success,
                    },
                  ]}
                >
                  SAFETY ASSESSMENT
                </Text>

                <Text
                  style={[
                    styles.resultTitle,
                    {
                      color: hasBlockingConcern
                        ? colors.urgent
                        : colors.success,
                    },
                  ]}
                >
                  {hasBlockingConcern
                    ? 'SAFETY CONCERN'
                    : 'SAFETY CHECK PASSED'}
                </Text>
              </View>
            </View>

            {/* ==================== BLOCKING CONCERN ==================== */}

            {hasBlockingConcern ? (
              <>
                <View style={styles.warningMessageBox}>
                  <View style={styles.warningIconCircle}>
                    <Ionicons
                      name="warning-outline"
                      size={20}
                      color={colors.urgent}
                    />
                  </View>

                  <View style={styles.warningMessageContent}>
                    <Text style={styles.warningMessageTitle}>
                      This food should not be donated.
                    </Text>

                    <Text style={styles.warningMessageText}>
                      A potential food-safety concern was
                      reported in the required checklist.
                    </Text>
                  </View>
                </View>

                {/* Reported Concerns */}

                <View style={styles.concernsSection}>
                  <Text style={styles.concernsSectionTitle}>
                    REPORTED CONCERNS
                  </Text>

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
                </View>

                {/* Final Warning */}

                <View style={styles.finalWarning}>
                  <Ionicons
                    name="ban-outline"
                    size={19}
                    color={colors.urgent}
                  />

                  <Text style={styles.finalWarningText}>
                    This donation cannot continue through
                    ResQMeal.
                  </Text>
                </View>
              </>
            ) : (
              <>
                {/* ==================== PASSED ==================== */}

                <View style={styles.passedMessageBox}>
                  <View style={styles.passedIconCircle}>
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.success}
                    />
                  </View>

                  <View style={styles.passedMessageContent}>
                    <Text style={styles.passedMessageTitle}>
                      Required information completed
                    </Text>

                    <Text style={styles.passedMessageText}>
                      No blocking concern was reported in the
                      required safety checklist.
                    </Text>
                  </View>
                </View>

                {/* Uncertain Information */}

                {uncertainItems.length > 0 ? (
                  <View style={styles.uncertainSection}>
                    <View style={styles.uncertainHeader}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={17}
                        color={colors.accent}
                      />

                      <Text style={styles.uncertainTitle}>
                        INFORMATION UNCERTAIN
                      </Text>
                    </View>

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
                  </View>
                ) : null}

                <View style={styles.resultDisclaimer}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.textSecondary}
                  />

                  <Text style={styles.resultDisclaimerText}>
                    This checklist does not guarantee that the
                    food is safe to eat. Recipients should still
                    use their own judgement when accepting
                    donated food.
                  </Text>
                </View>
              </>
            )}

            {/* ==================== AI RESULT ==================== */}

            <View style={styles.aiResultSection}>
              <View style={styles.aiResultHeader}>
                <View style={styles.aiResultIcon}>
                  <Ionicons
                    name="sparkles-outline"
                    size={17}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.aiResultHeaderText}>
                  <Text style={styles.aiResultTitle}>
                    AI VISUAL SCREENING
                  </Text>

                  <Text style={styles.aiResultSubtitle}>
                    Optional decision support
                  </Text>
                </View>
              </View>

              {aiResult === 'PENDING' ? (
                <View style={styles.aiResultRow}>
                  <View style={styles.aiResultStatusIcon}>
                    <Ionicons
                      name="remove-circle-outline"
                      size={19}
                      color={colors.textMuted}
                    />
                  </View>

                  <View style={styles.aiResultContent}>
                    <Text style={styles.aiResultMainText}>
                      Not performed
                    </Text>

                    <Text style={styles.aiResultDescription}>
                      AI visual screening was optional and was
                      not performed for this donation.
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.aiResultRow,
                    {
                      backgroundColor: aiStatus.background,
                    },
                  ]}
                >
                  <View style={styles.aiResultStatusIcon}>
                    <Ionicons
                      name={aiStatus.icon}
                      size={19}
                      color={aiStatus.iconColor}
                    />
                  </View>

                  <View style={styles.aiResultContent}>
                    <Text
                      style={[
                        styles.aiResultMainText,
                        {
                          color: aiStatus.iconColor,
                        },
                      ]}
                    >
                      {aiStatus.shortLabel}
                    </Text>

                    <Text style={styles.aiResultDescription}>
                      {aiStatus.message}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.aiDisclaimer}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={colors.textMuted}
                />

                <Text style={styles.aiDisclaimerText}>
                  AI visual screening is food-safety decision
                  support only. A photo cannot confirm whether
                  food is actually safe or unsafe.
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* ========================= FOOTER ========================= */}

      <View style={styles.footer}>
        {!showResult ? (
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
              Check Safety Information
            </Text>
          </TouchableOpacity>
        ) : hasBlockingConcern ? (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() =>
              navigation.getParent()?.goBack()
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="close-circle-outline"
              size={19}
              color={colors.urgent}
            />

            <Text style={styles.cancelButtonText}>
              Cancel Donation
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() =>
              navigation.navigate('Review')
            }
            activeOpacity={0.85}
          >
            <Text style={styles.continueText}>
              Continue to Review
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color={colors.white}
            />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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

  /* ========================= RESULT CARD ========================= */

  resultCard: {
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
  },

  resultCardSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.primaryLight,
  },

  resultCardDanger: {
    backgroundColor: colors.urgentSoft,
    borderColor: colors.urgent,
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  resultIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  resultIconSuccess: {
    backgroundColor: colors.white,
  },

  resultIconDanger: {
    backgroundColor: colors.white,
  },

  resultHeaderContent: {
    flex: 1,
  },

  resultEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 3,
  },

  resultTitle: {
    ...typography.label,
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
});