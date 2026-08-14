import React, { useState } from 'react';

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
import api from '../services/api';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';

type Props = NativeStackScreenProps<any, 'ForgotPassword'>;

/**
 * ============================================================
 * FORGOT PASSWORD SCREEN
 * ============================================================
 *
 * Minimal "enter your email, we send a reset link" flow.
 * Wire this to your real backend endpoint once it exists
 * (e.g. POST /auth/forgot-password).
 *
 * Uses useAppTypography() so text renders in Poppins on every
 * platform, matching the rest of the app.
 */
export default function ForgotPasswordScreen({ navigation }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function handleSubmit() {
    if (!email.trim() || !isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setError(undefined);
    setSubmitting(true);

    try {
      await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      setSent(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

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
            <Ionicons
              name="arrow-back"
              size={20}
              color={theme.text}
            />
            <Text
              style={{
                ...T.label,
                color: theme.text,
                marginLeft: 6,
              }}
            >
              Back to login
            </Text>
          </TouchableOpacity>

          <View
            style={{
              alignItems: 'center',
              marginBottom: Spacing.five,
            }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 22,
                backgroundColor: theme.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Spacing.three,
              }}
            >
              <Ionicons
                name="key-outline"
                size={30}
                color={theme.primary}
              />
            </View>

            <Text
              style={{
                ...T.h1,
                color: theme.text,
                textAlign: 'center',
              }}
            >
              Reset your password
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
              Enter the email linked to your account and we&apos;ll send
              you a link to reset your password.
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
            {sent ? (
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
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={theme.success}
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <Text
                  style={{
                    ...T.bodySmall,
                    color: theme.primaryDark,
                    flex: 1,
                  }}
                >
                  If an account exists for {email.trim()}, a reset link
                  has been sent. Check your inbox.
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={{
                    ...T.label,
                    color: theme.text,
                    marginBottom: 6,
                  }}
                >
                  Email
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: 52,
                    borderWidth: 1,
                    borderColor: error
                      ? theme.error
                      : theme.border,
                    borderRadius: Radius.md,
                    backgroundColor: theme.inputBackground,
                    paddingHorizontal: Spacing.three,
                    marginBottom: error ? 6 : Spacing.four,
                  }}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={
                      error ? theme.error : theme.textSecondary
                    }
                    style={{ marginRight: Spacing.two }}
                  />

                  <TextInput
                    placeholder="you@example.com"
                    placeholderTextColor={theme.inputPlaceholder}
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      setError(undefined);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{
                      ...T.input,
                      flex: 1,
                      color: theme.inputText,
                    }}
                    selectionColor={theme.primary}
                  />
                </View>

                {error ? (
                  <Text
                    style={{
                      ...T.bodySmall,
                      color: theme.error,
                      fontSize: 11,
                      marginBottom: Spacing.three,
                    }}
                  >
                    {error}
                  </Text>
                ) : null}

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                  style={{
                    minHeight: 54,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.primary,
                    borderRadius: Radius.md,
                    marginTop: Spacing.two,
                    opacity: submitting ? 0.7 : 1,
                    ...Shadows.button,
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator color={theme.textOnPrimary} />
                  ) : (
                    <Text
                      style={{
                        ...T.button,
                        color: theme.textOnPrimary,
                      }}
                    >
                      Send Reset Link
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}