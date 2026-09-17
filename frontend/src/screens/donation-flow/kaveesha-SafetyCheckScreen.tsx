// frontend/src/screens/donation-flow/kaveesha-SafetyCheckScreen.tsx
// Step 4 of 5 — Food Safety Checker.
// This intentionally never says "food is safe" — only that the safety
// information provided is complete, or that a blocking concern was raised.
// Owner: Kaveesha

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CreateDonationFlowParamList } from '../../navigation/kaveesha-createDonationFlow.types';
import { colors, radius, shadow, spacing, typography } from '../../styles/kaveesha-theme';
import KaveeshaStepProgress from '../../components/kaveesha-StepProgress';
import { useCreateDonation } from '../../context/kaveesha-CreateDonationContext';

type Props = NativeStackScreenProps<CreateDonationFlowParamList, 'Safety'>;

type QuestionKey = 'storage' | 'temperature' | 'handling' | 'packaging' | 'allergens';

interface Question {
  key: QuestionKey;
  icon: keyof typeof Ionicons.glyphMap;
  question: string;
  options: string[];
}

const QUESTIONS: Question[] = [
  { key: 'storage', icon: 'archive-outline', question: 'Was the food stored appropriately?', options: ['YES', 'NO'] },
  {
    key: 'temperature',
    icon: 'thermometer-outline',
    question: 'Was appropriate temperature control maintained?',
    options: ['YES', 'NO', 'NOT_SURE'],
  },
  { key: 'handling', icon: 'hand-left-outline', question: 'Was the food handled hygienically?', options: ['YES', 'NO'] },
  { key: 'packaging', icon: 'cube-outline', question: 'Is the food container clean and intact?', options: ['YES', 'NO'] },
  {
    key: 'allergens',
    icon: 'warning-outline',
    question: 'Does this food contain any known allergens?',
    options: ['YES', 'NO', 'NOT_SURE'],
  },
];

const OPTION_LABEL: Record<string, string> = { YES: 'Yes', NO: 'No', NOT_SURE: 'Not Sure' };

export default function SafetyCheckScreen({ navigation }: Props) {
  const { state, updateSafety } = useCreateDonation();
  const [showResult, setShowResult] = useState(false);

  const allAnswered = QUESTIONS.every((q) => state.safety[q.key] !== null);

  const hasBlockingConcern = useMemo(
    () => state.safety.storage === 'NO' || state.safety.handling === 'NO' || state.safety.packaging === 'NO',
    [state.safety],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconCircleButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Checklist</Text>
        <View style={{ width: 36 }} />
      </View>

      <KaveeshaStepProgress step={4} total={5} label="Food Safety Checker" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>
          A photo can't tell us everything — a few quick questions help us give recipients accurate safety guidance.
        </Text>

        {QUESTIONS.map((q) => (
          <View key={q.key} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={styles.questionIconWrap}>
                <Ionicons name={q.icon} size={16} color={colors.primary} />
              </View>
              <Text style={styles.questionText}>{q.question}</Text>
            </View>
            <View style={styles.optionsRow}>
              {q.options.map((opt) => {
                const selected = state.safety[q.key] === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.optionPill, selected && styles.optionPillSelected]}
                    onPress={() => {
                      updateSafety(q.key, opt as any);
                      setShowResult(false);
                    }}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {OPTION_LABEL[opt]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {showResult && (
          <View style={[styles.resultCard, { backgroundColor: hasBlockingConcern ? colors.urgentSoft : colors.accentSoft }]}>
            <Ionicons
              name={hasBlockingConcern ? 'close-circle' : 'checkmark-circle'}
              size={22}
              color={hasBlockingConcern ? colors.urgent : colors.primary}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.resultTitle, { color: hasBlockingConcern ? colors.urgent : colors.primary }]}>
                {hasBlockingConcern ? 'Donation Cannot Continue' : 'Safety Information Complete'}
              </Text>
              <Text style={styles.resultMessage}>
                {hasBlockingConcern
                  ? 'Please do not donate food with storage, handling, or packaging concerns.'
                  : "This confirms the safety information is complete — it doesn't guarantee the food is safe to eat."}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        {!showResult ? (
          <TouchableOpacity
            style={[styles.continueButton, !allAnswered && styles.continueButtonDisabled]}
            disabled={!allAnswered}
            onPress={() => setShowResult(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.continueText}>Check Safety Information</Text>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.white} />
          </TouchableOpacity>
        ) : hasBlockingConcern ? (
          <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.getParent()?.goBack()}>
            <Text style={styles.cancelLinkText}>Cancel Donation</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate('Review')} activeOpacity={0.85}>
            <Text style={styles.continueText}>Continue to Review</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
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
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  intro: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  questionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm },
  questionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: { ...typography.label, color: colors.textPrimary, flex: 1 },
  optionsRow: { flexDirection: 'row', gap: 8 },
  optionPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border },
  optionPillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { ...typography.bodySmall, color: colors.textSecondary },
  optionTextSelected: { color: colors.white },
  resultCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.sm },
  resultTitle: { ...typography.label },
  resultMessage: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 3 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
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
  cancelLink: { alignItems: 'center', paddingVertical: 14 },
  cancelLinkText: { ...typography.label, color: colors.urgent },
});