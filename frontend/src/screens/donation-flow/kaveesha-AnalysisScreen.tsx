// frontend/src/screens/donation-flow/kaveesha-AnalysisScreen.tsx
// Step 3 of 5 — AI Visual Screening (real backend call)
//
// This calls POST /api/donations/analyze-photo on your Express backend,
// which forwards the photo to Google's Gemini API (free tier) and returns
// one of GOOD / REVIEW / CONCERN plus a short reason. See
// kaveesha-README-createDonationFlow.md for backend setup.
// Owner: Kaveesha

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CreateDonationFlowParamList } from '../../navigation/kaveesha-createDonationFlow.types';
import { colors, radius, shadow, spacing, typography } from '../../styles/kaveesha-theme';
import KaveeshaStepProgress from '../../components/kaveesha-StepProgress';
import { AiScreeningResult, useCreateDonation } from '../../context/kaveesha-CreateDonationContext';
import api from '../../services/api';

type Props = NativeStackScreenProps<CreateDonationFlowParamList, 'Analysis'>;

const CHECK_ITEMS = ['Uploading photo', 'Running AI screening', 'Compiling result'];

const RESULT_CONFIG: Record<
  Exclude<AiScreeningResult, 'PENDING'>,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; title: string }
> = {
  GOOD: { color: colors.primary, bg: colors.accentSoft, icon: 'checkmark-circle', title: 'No obvious visual concern' },
  REVIEW: { color: colors.medium, bg: colors.mediumSoft, icon: 'alert-circle', title: 'Review required' },
  CONCERN: { color: colors.urgent, bg: colors.urgentSoft, icon: 'close-circle', title: 'Possible food quality concern' },
};

export default function AnalysisScreen({ navigation }: Props) {
  const { state, update } = useCreateDonation();
  const [analyzing, setAnalyzing] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setError(null);
    setVisibleCount(0);

    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
    );
    spinLoop.start();

    const revealTimers = CHECK_ITEMS.map((_, i) =>
      setTimeout(() => setVisibleCount((c) => c + 1), 400 + i * 450),
    );

    // Keeps the animation from flashing by instantly if the network call is
    // very fast — always show at least ~1.6s of "analyzing" state.
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1600));

    try {
      if (!state.photoBase64) {
        throw new Error('NO_PHOTO');
      }

      const request = api.post('/donations/analyze-photo', {
        imageBase64: state.photoBase64,
        mimeType: state.photoMimeType || 'image/jpeg',
      });

      const [, response] = await Promise.all([minDelay, request]);

      const { result, reason } = response.data as { result: AiScreeningResult; reason: string };
      update('aiResult', result);
      update('aiReason', reason);
    } catch (err: any) {
      await minDelay;
      const message =
        err?.message === 'NO_PHOTO'
          ? 'No photo was found. Please go back and add one.'
          : err?.response?.data?.message ||
            'Could not analyze the photo. Check your connection and try again.';
      setError(message);
    } finally {
      revealTimers.forEach(clearTimeout);
      spinLoop.stop();
      setAnalyzing(false);
    }
  }, [state.photoBase64, state.photoMimeType, spin, update]);

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const result = state.aiResult === 'PENDING' ? 'GOOD' : state.aiResult;
  const config = RESULT_CONFIG[result];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconCircleButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Screening</Text>
        <View style={{ width: 36 }} />
      </View>

      <KaveeshaStepProgress step={3} total={5} label="Visual Analysis" />

      <View style={styles.body}>
        {analyzing && (
          <View style={styles.analyzingWrap}>
            <View style={styles.ringOuter}>
              <Animated.View style={[styles.ringSpinner, { transform: [{ rotate }] }]} />
              <Ionicons name="scan-outline" size={30} color={colors.primary} />
            </View>
            <Text style={styles.analyzingTitle}>Analyzing your photo...</Text>
            <Text style={styles.analyzingSubtitle}>Talking to the AI screening service</Text>

            <View style={styles.checklist}>
              {CHECK_ITEMS.map((item, i) => (
                <View key={item} style={styles.checkRow}>
                  <Ionicons
                    name={i < visibleCount ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={i < visibleCount ? colors.primary : colors.border}
                  />
                  <Text style={[styles.checkLabel, i < visibleCount && { color: colors.textPrimary }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!analyzing && error && (
          <View style={styles.resultWrap}>
            <View style={[styles.resultIconWrap, { backgroundColor: colors.urgentSoft }]}>
              <Ionicons name="cloud-offline-outline" size={34} color={colors.urgent} />
            </View>
            <Text style={[styles.resultTitle, { color: colors.urgent }]}>Analysis failed</Text>
            <Text style={styles.resultMessage}>{error}</Text>
          </View>
        )}

        {!analyzing && !error && (
          <View style={styles.resultWrap}>
            <View style={[styles.resultIconWrap, { backgroundColor: config.bg }]}>
              <Ionicons name={config.icon} size={34} color={config.color} />
            </View>
            <Text style={[styles.resultTitle, { color: config.color }]}>{config.title}</Text>
            <Text style={styles.resultMessage}>{state.aiReason}</Text>

            <Text style={styles.disclaimer}>
              This checks visible indicators only. It does not confirm the food is safe to eat.
            </Text>
          </View>
        )}
      </View>

      {!analyzing && (
        <View style={styles.footer}>
          {error && (
            <TouchableOpacity style={styles.continueButton} onPress={() => setAttempt((a) => a + 1)} activeOpacity={0.85}>
              <Text style={styles.continueText}>Try Again</Text>
              <Ionicons name="refresh" size={18} color={colors.white} />
            </TouchableOpacity>
          )}

          {!error && result === 'GOOD' && (
            <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate('Safety')} activeOpacity={0.85}>
              <Text style={styles.continueText}>Continue to Safety Check</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </TouchableOpacity>
          )}

          {!error && result === 'REVIEW' && (
            <>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
                <Text style={styles.secondaryText}>Retake Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.continueButton, { marginTop: 10 }]}
                onPress={() => navigation.navigate('Safety')}
                activeOpacity={0.85}
              >
                <Text style={styles.continueText}>Continue After Manual Check</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </TouchableOpacity>
            </>
          )}

          {!error && result === 'CONCERN' && (
            <>
              <TouchableOpacity
                style={[styles.continueButton, { backgroundColor: colors.urgent }]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}
              >
                <Text style={styles.continueText}>Retake Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.getParent()?.goBack()}>
                <Text style={styles.cancelLinkText}>Cancel Donation</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
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
  body: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  analyzingWrap: { alignItems: 'center' },
  ringOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  ringSpinner: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  analyzingTitle: { ...typography.h3, color: colors.textPrimary },
  analyzingSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  checklist: { marginTop: spacing.xl, alignSelf: 'stretch', gap: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkLabel: { ...typography.body, color: colors.textMuted },
  resultWrap: { alignItems: 'center' },
  resultIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  resultTitle: { ...typography.h3, textAlign: 'center' },
  resultMessage: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
  disclaimer: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },
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
  continueText: { ...typography.button, color: colors.white },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryText: { ...typography.label, color: colors.textSecondary },
  cancelLink: { alignItems: 'center', marginTop: 12 },
  cancelLinkText: { ...typography.label, color: colors.urgent },
});