// frontend/src/components/kaveesha-VoiceAssistantModal.tsx
// Walks the donor through the Food Details form by voice: speaks each
// question (expo-speech), records the spoken answer (expo-audio), sends it
// to the backend for transcription (Gemini), and auto-advances to the next
// question. When finished, hands all collected answers back to the caller
// to apply to the form.
//
// Requires: npx expo install expo-speech expo-audio expo-file-system
// Owner: Kaveesha

import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

import { colors, radius, shadow, spacing, typography } from '../styles/kaveesha-theme';
import api from '../services/api';

export type VoiceFieldKey =
  | 'foodType'
  | 'category'
  | 'quantity'
  | 'portions'
  | 'preparationTime'
  | 'expiryTime'
  | 'storageCondition'
  | 'pickupLocation'
  | 'additionalDetails';

interface VoiceQuestion {
  field: VoiceFieldKey;
  label: string;
  prompt: string;
  formatHint?: string;
}

const QUESTIONS: VoiceQuestion[] = [
  {
    field: 'foodType',
    label: 'Food Type',
    prompt: "Hi! I'm here to help you list this donation. What type of food are you donating?",
  },
  {
    field: 'category',
    label: 'Category',
    prompt: 'What category does it fall under — like a cooked meal, bakery item, or produce?',
  },
  {
    field: 'quantity',
    label: 'Quantity',
    prompt: 'How much are you donating? For example, five kilograms.',
    formatHint: 'a short measurement, e.g. "5 kg" or "20 packs"',
  },
  {
    field: 'portions',
    label: 'Portions',
    prompt: 'About how many portions does that make?',
    formatHint: 'a plain number, digits only, e.g. "12"',
  },
  {
    field: 'preparationTime',
    label: 'Preparation Time',
    prompt: 'What time was the food prepared?',
    formatHint: 'a short time, e.g. "10:00 AM"',
  },
  {
    field: 'expiryTime',
    label: 'Expiry Time',
    prompt: 'And what time does it expire, or need to be picked up by?',
    formatHint: 'a short time, e.g. "8:00 PM"',
  },
  {
    field: 'storageCondition',
    label: 'Storage Condition',
    prompt: 'How is the food currently stored — refrigerated, or at room temperature?',
  },
  {
    field: 'pickupLocation',
    label: 'Pickup Location',
    prompt: 'Where should the volunteer pick this up from?',
  },
  {
    field: 'additionalDetails',
    label: 'Additional Details',
    prompt: "Anything else the recipient should know? You can also just say 'nothing else'.",
  },
];

type Phase = 'speaking' | 'ready' | 'recording' | 'processing' | 'done';

interface Props {
  visible: boolean;
  onComplete: (answers: Partial<Record<VoiceFieldKey, string>>) => void;
}

export default function KaveeshaVoiceAssistantModal({ visible, onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('speaking');
  const [error, setError] = useState<string | null>(null);
  const answersRef = useRef<Partial<Record<VoiceFieldKey, string>>>({});
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const pulse = useRef(new Animated.Value(1)).current;

  const question = QUESTIONS[index];

  // Reset and request mic permission every time the assistant opens.
  useEffect(() => {
  if (!visible) return;

  const setupAudio = async () => {
    try {
      const permission =
        await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        setError(
          'Microphone permission is required to use the voice assistant.'
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      setIndex(0);
      setPhase('speaking');
      setError(null);
      answersRef.current = {};
    } catch (err) {
      console.error('Audio setup failed:', err);
      setError('Could not access the microphone.');
    }
  };

  setupAudio();
}, [visible]);

  // Speak the current question whenever we land on it.
  useEffect(() => {
    if (!visible || phase !== 'speaking') return;
    Speech.speak(question.prompt, {
      rate: 0.95,
      onDone: () => setPhase('ready'),
      onError: () => setPhase('ready'),
    });
    return () => {
  Speech.stop();
};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, phase, index]);

  // Pulsing mic ring while recording.
  useEffect(() => {
    if (phase !== 'recording') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  const goToNextQuestion = () => {
    if (index + 1 < QUESTIONS.length) {
      setIndex((i) => i + 1);
      setPhase('speaking');
    } else {
      finishConversation();
    }
  };

  const finishConversation = () => {
  setPhase('done');

  Speech.speak(
    "Great! I've filled in your donation details. Please check the details and make any changes you need. Then upload the food photo so we can scan it before you continue.",
    {
      rate: 0.95,
      onDone: () => onComplete(answersRef.current),
      onError: () => onComplete(answersRef.current),
    },
  );
};

  const startRecording = async () => {
    setError(null);
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch (err) {
      setError('Could not access the microphone. Check app permissions.');
    }
  };

  const stopRecordingAndSend = async () => {
  setPhase('processing');
  setError(null);

  try {
    await recorder.stop();

    const uri = recorder.uri;

    console.log('🎤 Recording URI:', uri);

    if (!uri) {
      throw new Error('NO_RECORDING_URI');
    }

    const base64Audio = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log(
      '🎤 Audio base64 length:',
      base64Audio.length
    );

    if (!base64Audio || base64Audio.length < 100) {
      throw new Error('EMPTY_AUDIO');
    }

    const mimeType = uri.toLowerCase().endsWith('.m4a')
      ? 'audio/mp4'
      : 'audio/webm';

    console.log('🎤 Audio MIME type:', mimeType);
    console.log('🎤 Sending voice answer for:', question.field);

    const response = await api.post('/voice/transcribe', {
      audioBase64: base64Audio,
      mimeType,
      question: question.prompt,
      fieldLabel: question.label,
      formatHint: question.formatHint,
    });

    console.log('🤖 Gemini response:', response.data);

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || 'VOICE_API_FAILED'
      );
    }

    const answer: string = response.data?.answer ?? '';

    console.log('✅ Transcribed answer:', answer);

    if (answer.trim()) {
      answersRef.current[question.field] = answer.trim();
    }

    goToNextQuestion();

  } catch (err: any) {
    console.error(
      '❌ Voice transcription error:',
      err?.response?.data || err?.message || err
    );

    setError(
      err?.response?.data?.message ||
      err?.message ||
      "Sorry, I couldn't catch that. Try again."
    );

    setPhase('ready');
  }
};

  const skipQuestion = () => {
    setError(null);
    goToNextQuestion();
  };

  const handleCancel = () => {
    Speech.stop();
    // Apply whatever was gathered before cancelling — better than losing it.
    onComplete(answersRef.current);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.progressDots}>
            {QUESTIONS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive, i < index && styles.dotDone]}
              />
            ))}
          </View>

          <View style={styles.bubble}>
            <Text style={styles.bubbleLabel}>{question.label}</Text>
            <Text style={styles.bubbleText}>{question.prompt}</Text>
          </View>

          <View style={styles.micArea}>
            {phase === 'speaking' && (
              <>
                <View style={styles.micCircleIdle}>
                  <Ionicons name="volume-high" size={26} color={colors.primary} />
                </View>
                <Text style={styles.statusText}>Speaking...</Text>
              </>
            )}

            {phase === 'ready' && (
              <TouchableOpacity onPress={startRecording} activeOpacity={0.85} style={styles.micTouchArea}>
                <View style={styles.micCircleReady}>
                  <Ionicons name="mic" size={26} color={colors.white} />
                </View>
                <Text style={styles.statusText}>Tap to answer</Text>
              </TouchableOpacity>
            )}

            {phase === 'recording' && (
              <TouchableOpacity onPress={stopRecordingAndSend} activeOpacity={0.85} style={styles.micTouchArea}>
                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse }] }]} />
                <View style={styles.micCircleRecording}>
                  <Ionicons name="stop" size={22} color={colors.white} />
                </View>
                <Text style={styles.statusText}>Listening... tap to stop</Text>
              </TouchableOpacity>
            )}

            {phase === 'processing' && (
              <>
                <View style={styles.micCircleIdle}>
                  <Ionicons name="sync" size={24} color={colors.primary} />
                </View>
                <Text style={styles.statusText}>Got it, thinking...</Text>
              </>
            )}

            {phase === 'done' && (
              <>
                <View style={styles.micCircleReady}>
                  <Ionicons name="checkmark" size={26} color={colors.white} />
                </View>
                <Text style={styles.statusText}>Filling in your form...</Text>
              </>
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {(phase === 'ready' || phase === 'recording') && (
            <TouchableOpacity onPress={skipQuestion} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip this question</Text>
            </TouchableOpacity>
          )}

          {phase !== 'done' && (
            <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel voice assistant</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,61,41,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  progressDots: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 18 },
  dotDone: { backgroundColor: colors.accent },
  bubble: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignSelf: 'stretch',
    marginBottom: spacing.lg,
  },
  bubbleLabel: { ...typography.kicker, color: colors.primary, marginBottom: 4 },
  bubbleText: { ...typography.body, color: colors.textPrimary },
  micArea: { alignItems: 'center', marginBottom: spacing.md, minHeight: 120, justifyContent: 'center' },
  micTouchArea: { alignItems: 'center' },
  micCircleIdle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  micCircleReady: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  micCircleRecording: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.urgent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.urgentSoft,
  },
  statusText: { ...typography.label, color: colors.textSecondary },
  errorText: { ...typography.bodySmall, color: colors.urgent, textAlign: 'center', marginBottom: spacing.sm },
  skipButton: { paddingVertical: 8 },
  skipText: { ...typography.label, color: colors.primary },
  cancelButton: { paddingVertical: 8, marginTop: 2 },
  cancelText: { ...typography.bodySmall, color: colors.textMuted },
});