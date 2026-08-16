import React, { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  Colors,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { verifyResetOtp, requestPasswordReset } from '../services/api';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';

import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyResetOtp'>;

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 45; // seconds

/**
 * ============================================================
 * VERIFY RESET OTP SCREEN
 * ============================================================
 * 6-digit code entry with auto-advance boxes, resend cooldown,
 * and a friendly "sent to your inbox" confirmation banner.
 */
export default function VerifyResetOtpScreen({ navigation, route }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();
  const { email } = route.params;

  const [digits, setDigits] = useState<string[]>(
    Array(CODE_LENGTH).fill(''),
  );
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [justSent, setJustSent] = useState(true);

  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (justSent) {
      const t = setTimeout(() => setJustSent(false), 3500);
      return () => clearTimeout(t);
    }
  }, [justSent]);

  function handleChange(text: string, index: number) {
    const clean = text.replace(/[^0-9]/g, '');

    if (clean.length > 1) {
      // Handles pasting the full code at once
      const pasted = clean.slice(0, CODE_LENGTH).split('');
      const next = Array(CODE_LENGTH).fill('');
      pasted.forEach((d, i) => (next[i] = d));
      setDigits(next);
      setError(undefined);
      const lastIndex = Math.min(pasted.length, CODE_LENGTH) - 1;
      inputs.current[lastIndex]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    setError(undefined);

    if (clean && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(e: any, index: number) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = digits.join('');

    if (code.length !== CODE_LENGTH) {
      setError('Enter the full 6-digit code.');
      return;
    }

    setError(undefined);
    setSubmitting(true);

    try {
      const data = await verifyResetOtp(email, code);

      if (data.success && data.resetToken) {
        navigation.replace('ResetPassword', {
          email,
          resetToken: data.resetToken,
        });
      } else {
        setError(
          data.message ?? 'That code is invalid or has expired.',
        );
        setDigits(Array(CODE_LENGTH).fill(''));
        inputs.current[0]?.focus();
      }
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError(undefined);

    try {
      await requestPasswordReset(email);
      setCooldown(RESEND_COOLDOWN);
      setJustSent(true);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } catch {
      setError('Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  const isComplete = digits.every((d) => d !== '');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: Spacing.three,
          paddingTop: Spacing.six,
          paddingBottom: Spacing.seven,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: '100%', maxWidth: 480 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: Spacing.five,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
            <Text style={{ ...T.label, color: theme.text, marginLeft: 6 }}>
              Back
            </Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center', marginBottom: Spacing.five }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 24,
                backgroundColor: theme.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Spacing.three,
              }}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={32}
                color={theme.primary}
              />
            </View>

            <Text style={{ ...T.h1, color: theme.text, textAlign: 'center' }}>
              Check your inbox
            </Text>

            <Text
              style={{
                ...T.body,
                color: theme.textSecondary,
                textAlign: 'center',
                marginTop: Spacing.one,
                maxWidth: 340,
              }}
            >
              We've sent a 6-digit code to{'\n'}
              <Text style={{ ...T.label, color: theme.text }}>{email}</Text>
            </Text>
          </View>

          <View
            style={{
              backgroundColor: theme.formBackground,
              borderRadius: Radius.xl,
              borderWidth: 1,
              borderColor: theme.border,
              padding: Spacing.four,
              ...Shadows.card,
            }}
          >
            {justSent && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  backgroundColor: theme.successSoft,
                  borderRadius: Radius.md,
                  borderWidth: 1,
                  borderColor: theme.success,
                  paddingVertical: Spacing.two,
                  paddingHorizontal: Spacing.three,
                  marginBottom: Spacing.four,
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={theme.success}
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <Text
                  style={{ ...T.bodySmall, color: theme.primaryDark, flex: 1 }}
                >
                  Email sent to your inbox successfully. It may take a
                  minute to arrive.
                </Text>
              </View>
            )}

            <Text
              style={{
                ...T.label,
                color: theme.text,
                marginBottom: Spacing.three,
                textAlign: 'center',
              }}
            >
              Enter verification code
            </Text>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: error ? 6 : Spacing.four,
              }}
            >
              {digits.map((digit, index) => {
                const filled = digit !== '';

                return (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputs.current[index] = ref;
                    }}
                    value={digit}
                    onChangeText={(text) => handleChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={CODE_LENGTH}
                    textAlign="center"
                    autoFocus={index === 0}
                    style={{
                      ...T.h2,
                      width: 46,
                      height: 56,
                      borderRadius: Radius.md,
                      borderWidth: filled ? 1.5 : 1,
                      borderColor: error
                        ? theme.error
                        : filled
                          ? theme.primary
                          : theme.border,
                      backgroundColor: filled
                        ? theme.primaryLight
                        : theme.inputBackground,
                      color: theme.text,
                    }}
                    selectionColor={theme.primary}
                  />
                );
              })}
            </View>

            {error ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: Spacing.three,
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name="alert-circle"
                  size={13}
                  color={theme.error}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={{ ...T.bodySmall, color: theme.error, fontSize: 12 }}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleVerify}
              disabled={submitting || !isComplete}
              activeOpacity={0.85}
              style={{
                minHeight: 54,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.primary,
                borderRadius: Radius.md,
                marginTop: Spacing.two,
                opacity: submitting || !isComplete ? 0.6 : 1,
                ...Shadows.button,
              }}
            >
              {submitting ? (
                <ActivityIndicator color={theme.textOnPrimary} />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={theme.textOnPrimary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ ...T.button, color: theme.textOnPrimary }}>
                    Verify Code
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: Spacing.four,
              }}
            >
              <Text style={{ ...T.bodySmall, color: theme.textSecondary }}>
                Didn't get the code?
              </Text>

              <TouchableOpacity
                onPress={handleResend}
                disabled={cooldown > 0 || resending}
                activeOpacity={0.7}
                hitSlop={6}
              >
                <Text
                  style={{
                    ...T.label,
                    color:
                      cooldown > 0 || resending
                        ? theme.textSecondary
                        : theme.primary,
                    marginLeft: 5,
                  }}
                >
                  {resending
                    ? 'Sending...'
                    : cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}