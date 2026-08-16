import React, { useEffect, useState } from 'react';

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
import { resetPassword } from '../services/api';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';

import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

const REDIRECT_DELAY_MS = 2600;

function hasStrongPassword(value: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}

/**
 * ============================================================
 * RESET PASSWORD SCREEN (Task 10)
 * ============================================================
 * Set a new password, see a friendly success confirmation,
 * then auto-redirect back to Login.
 */
export default function ResetPasswordScreen({ navigation, route }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();
  const { resetToken } = route.params;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const [serverError, setServerError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [success, navigation]);

  function validate(): boolean {
    const next: typeof errors = {};

    if (!password) {
      next.password = 'Please enter a new password.';
    } else if (!hasStrongPassword(password)) {
      next.password =
        'Use 8+ characters with an uppercase, lowercase letter and a number.';
    }

    if (!confirmPassword) {
      next.confirmPassword = 'Please confirm your new password.';
    } else if (password !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    setServerError(undefined);

    if (!validate()) return;

    setSubmitting(true);

    try {
      const data = await resetPassword(resetToken, password);

      if (data.success) {
        setSuccess(true);
      } else {
        setServerError(
          data.message ?? 'Something went wrong. Please try again.',
        );
      }
    } catch {
      setServerError(
        'Unable to connect to the server. Please check your connection.',
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
          {!success && (
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
                  name="lock-open-outline"
                  size={32}
                  color={theme.primary}
                />
              </View>

              <Text
                style={{ ...T.h1, color: theme.text, textAlign: 'center' }}
              >
                Set a new password
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
                Choose a strong password you haven't used before.
              </Text>
            </View>
          )}

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
            {success ? (
              <View style={{ alignItems: 'center', paddingVertical: Spacing.three }}>
                <View
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 42,
                    backgroundColor: theme.successSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: Spacing.four,
                    borderWidth: 2,
                    borderColor: theme.success,
                  }}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={48}
                    color={theme.success}
                  />
                </View>

                <Text
                  style={{
                    ...T.h2,
                    color: theme.text,
                    textAlign: 'center',
                    marginBottom: Spacing.two,
                  }}
                >
                  Password updated!
                </Text>

                <Text
                  style={{
                    ...T.body,
                    color: theme.textSecondary,
                    textAlign: 'center',
                    maxWidth: 320,
                    marginBottom: Spacing.four,
                  }}
                >
                  You can now log in to ResQMeal with your new password.
                </Text>

                <ActivityIndicator color={theme.primary} />

                <Text
                  style={{
                    ...T.bodySmall,
                    color: theme.textSecondary,
                    marginTop: Spacing.two,
                  }}
                >
                  Redirecting you to login...
                </Text>
              </View>
            ) : (
              <>
                <PasswordField
                  icon="lock-closed-outline"
                  label="New Password"
                  placeholder="Create a strong password"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrors((e) => ({ ...e, password: undefined }));
                    setServerError(undefined);
                  }}
                  error={errors.password}
                  showPassword={showPassword}
                  onToggleSecure={() => setShowPassword((p) => !p)}
                />

                <PasswordField
                  icon="lock-closed-outline"
                  label="Confirm New Password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChangeText={(v) => {
                    setConfirmPassword(v);
                    setErrors((e) => ({ ...e, confirmPassword: undefined }));
                    setServerError(undefined);
                  }}
                  error={errors.confirmPassword}
                  showPassword={showConfirm}
                  onToggleSecure={() => setShowConfirm((p) => !p)}
                />

                {serverError ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.errorSoft,
                      borderRadius: Radius.md,
                      borderWidth: 1,
                      borderColor: theme.error,
                      paddingVertical: Spacing.two,
                      paddingHorizontal: Spacing.three,
                      marginBottom: Spacing.three,
                    }}
                  >
                    <Ionicons
                      name="alert-circle"
                      size={16}
                      color={theme.error}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{ ...T.bodySmall, color: theme.error, flex: 1 }}
                    >
                      {serverError}
                    </Text>
                  </View>
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
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color={theme.textOnPrimary}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={{ ...T.button, color: theme.textOnPrimary }}
                      >
                        Update Password
                      </Text>
                    </>
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

function PasswordField({
  label,
  error,
  icon,
  showPassword,
  onToggleSecure,
  ...inputProps
}: {
  label: string;
  error?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  showPassword: boolean;
  onToggleSecure: () => void;
} & React.ComponentProps<typeof TextInput>) {
  const theme = Colors.light;
  const T = useAppTypography();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.error
    : focused
      ? theme.borderFocus
      : theme.border;

  return (
    <View style={{ marginBottom: Spacing.three }}>
      <Text style={{ ...T.label, color: theme.text, marginBottom: 6 }}>
        {label}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 52,
          borderWidth: focused && !error ? 1.5 : 1,
          borderColor,
          borderRadius: Radius.md,
          backgroundColor: theme.inputBackground,
          paddingHorizontal: Spacing.three,
        }}
      >
        <Ionicons
          name={icon}
          size={18}
          color={
            error ? theme.error : focused ? theme.primary : theme.textSecondary
          }
          style={{ marginRight: Spacing.two }}
        />

        <TextInput
          {...inputProps}
          placeholderTextColor={theme.inputPlaceholder}
          secureTextEntry={!showPassword}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={{
            ...T.input,
            flex: 1,
            color: theme.inputText,
            shadowColor: 'transparent',
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
            backgroundColor: 'transparent',
          }}
          selectionColor={theme.primary}
        />

        <TouchableOpacity
          onPress={onToggleSecure}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          style={{ marginLeft: Spacing.two }}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={
              error ? theme.error : focused ? theme.primary : theme.textSecondary
            }
          />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
          <Ionicons
            name="alert-circle"
            size={13}
            color={theme.error}
            style={{ marginRight: 4 }}
          />
          <Text style={{ ...T.bodySmall, color: theme.error, fontSize: 11, flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}