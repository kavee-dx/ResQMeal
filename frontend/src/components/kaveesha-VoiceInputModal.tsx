// frontend/src/components/kaveesha-VoiceInputModal.tsx
// Triggered from the small mic button in the corner of the Details screen
// header, rather than being a big inline toggle in the form itself.
// Owner: Kaveesha

import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../styles/kaveesha-theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSimulatedResult: (text: string) => void;
}

// TODO: Replace the simulated "Done" action below with a real speech-to-text
// integration (e.g. @react-native-voice/voice, or a cloud STT API called from
// your backend), then call onSimulatedResult(transcript) with the real text.
export default function KaveeshaVoiceInputModal({ visible, onClose, onSimulatedResult }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.35,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse }] }]} />
          <View style={styles.micCircle}>
            <Ionicons name="mic" size={30} color={colors.white} />
          </View>
          <Text style={styles.title}>Listening...</Text>
          <Text style={styles.subtitle}>Describe the food you're donating</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                onSimulatedResult('Vegetable fried rice, five kilograms, twelve portions');
                onClose();
              }}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,61,41,0.55)',
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
  },
  pulseRing: {
    position: 'absolute',
    top: spacing.xl,
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accentSoft,
  },
  micCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  title: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.lg },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: spacing.xl, width: '100%' },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: { ...typography.label, color: colors.textSecondary },
  doneButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  doneText: { ...typography.label, color: colors.white },
});