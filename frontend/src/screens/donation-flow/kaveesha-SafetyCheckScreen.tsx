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

  const allAnswered = QUESTIONS.every(
    (question) => state.safety[question.key] !== null,
  );

  const hasBlockingConcern = useMemo(
    () =>
      state.safety.storage === 'NO' ||
      state.safety.handling === 'NO' ||
      state.safety.packaging === 'NO',
    [state.safety],
  );

  const answeredCount = QUESTIONS.filter(
    (question) => state.safety[question.key] !== null,
  ).length;

  const aiResult = state.aiResult;

  const aiStatus = useMemo(() => {
    switch (aiResult) {
      case 'GOOD':
        return {
          icon: 'checkmark-circle-outline' as const,
          title: 'AI visual screening completed',
          message:
            'No obvious visual concern was identified from the submitted photo.',
          background: colors.accentSoft,
          iconColor: colors.success,
        };

      case 'REVIEW':
        return {
          icon: 'alert-circle-outline' as const,
          title: 'Manual review recommended',
          message:
            'The photo contains something that may need closer attention.',
          background: colors.accentSoft,
          iconColor: colors.accent,
        };

      case 'CONCERN':
        return {
          icon: 'close-circle-outline' as const,
          title: 'Visual concern identified',
          message:
            'The photo contains a visible indicator that should be considered before continuing.',
          background: colors.urgentSoft,
          iconColor: colors.urgent,
        };

      default:
        return {
          icon: 'information-circle-outline' as const,
          title: 'AI screening was not performed',
          message:
            'AI visual screening is optional. Continue using the information you can personally verify.',
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
      {/* Header */}
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
        {/* Intro */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color={colors.primary}
            />
          </View>

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              Help recipients make an informed decision
            </Text>

            <Text style={styles.introText}>
              Answer these quick questions based on what you know
              about the food. This checklist provides decision
              support and does not confirm that food is safe to eat.
            </Text>
          </View>
        </View>

        {/* AI Status */}
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
              size={20}
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

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              FINAL CHECK
            </Text>

            <Text style={styles.sectionTitle}>
              Food safety information
            </Text>
          </View>

          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>
              {answeredCount}/{QUESTIONS.length}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionDescription}>
          Please answer every question before continuing to the
          final review.
        </Text>

        {/* Questions */}
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
                <View style={styles.questionNumber}>
                  <Text style={styles.questionNumberText}>
                    {index + 1}
                  </Text>
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

        {/* Not Sure Information */}
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
              Choose “Not sure” when you genuinely cannot verify
              the information. This helps avoid making assumptions
              about the food.
            </Text>
          </View>
        </View>

        {/* Result */}
        {showResult ? (
          <View
            style={[
              styles.resultCard,
              hasBlockingConcern
                ? styles.resultCardDanger
                : styles.resultCardSuccess,
            ]}
          >
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
                size={24}
                color={
                  hasBlockingConcern
                    ? colors.urgent
                    : colors.success
                }
              />
            </View>

            <View style={styles.resultContent}>
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
                  ? 'Donation cannot continue'
                  : 'Safety information complete'}
              </Text>

              <Text style={styles.resultMessage}>
                {hasBlockingConcern
                  ? 'A concern was identified in the storage, handling, or packaging information. Please do not continue with this donation.'
                  : 'All required safety information has been provided. This does not guarantee that the food is safe to eat.'}
              </Text>

              {!hasBlockingConcern ? (
                <View style={styles.resultDisclaimer}>
                  <Ionicons
                    name="information-circle-outline"
                    size={15}
                    color={colors.textSecondary}
                  />

                  <Text style={styles.resultDisclaimerText}>
                    Recipients should still use their own judgement
                    when accepting donated food.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Footer */}
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
            <Text style={styles.continueText}>
              Check Safety Information
            </Text>

            <Ionicons
              name="shield-checkmark-outline"
              size={19}
              color={colors.white}
            />
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
              name="close-outline"
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

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 5,
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
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
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

  resultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
  },

  resultCardSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.primaryLight,
  },

  resultCardDanger: {
    backgroundColor: colors.urgentSoft,
    borderColor: colors.urgent,
  },

  resultIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.white,
  },

  resultIconSuccess: {
    backgroundColor: colors.white,
  },

  resultIconDanger: {
    backgroundColor: colors.white,
  },

  resultContent: {
    flex: 1,
  },

  resultTitle: {
    ...typography.label,
    marginBottom: 5,
  },

  resultMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  resultDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  resultDisclaimerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: 5,
    lineHeight: 17,
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