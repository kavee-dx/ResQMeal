import React, { useState } from 'react';
import { saveSession } from '../utils/kaveesha-authStorage';
import type { RootStackParamList, Role } from "../navigation/types";
function isValidRole(value: unknown): value is Role {
  return (
    value === "DONOR" ||
    value === "RECIPIENT" ||
    value === "NGO" ||
    value === "VOLUNTEER"
  );
}


import {
  ActivityIndicator,
  Alert,
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

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = NativeStackScreenProps<
  RootStackParamList,
  "Login"
>;

type StatusBanner = {
  type: 'success' | 'error';
  message: string;
} | null;

/**
 * ============================================================
 * LOGIN SCREEN
 * ============================================================
 *
 * Same visual language as RegisterScreen:
 * - Colors.light used directly (no useTheme)
 * - Same Field / SectionHeader look and feel
 *
 * Typography note:
 * - Uses useAppTypography() instead of the raw Typography
 *   import, so every Text on this screen renders in Poppins
 *   (loaded via @expo-google-fonts/poppins in App.tsx),
 *   consistently on phone, tablet, and web.
 *
 * Flow:
 *  1. User enters email + password
 *  2. POST /auth/login
 *  3. Backend returns the user's role + verification status
 *  4. Unverified users are blocked with a clear message
 *  5. Verified users see a success banner, then are routed
 *     to their role-specific home screen
 */
export default function LoginScreen({ navigation }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const [banner, setBanner] = useState<StatusBanner>(null);
  const [submitting, setSubmitting] = useState(false);

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function validate(): boolean {
    const next: { email?: string; password?: string } = {};

    if (!email.trim()) {
      next.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      next.email = 'Enter a valid email address.';
    }

    if (!password) {
      next.password = 'Password is required.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  
  async function handleLogin() {
  setBanner(null);
  setErrors({});

  if (!validate()) {
    return;
  }

  setSubmitting(true);

  try {
    const response = await api.post("/auth/login", {
      email: email.trim().toLowerCase(),
      password,
    });

    const data = response.data ?? {};

    const token = data.token;

    const rawRole =
      data.role ??
      data.user?.role;

    if (!token) {
      throw new Error(
        "Login succeeded but the server did not return an authentication token.",
      );
    }

    if (!isValidRole(rawRole)) {
      throw new Error(
        "Login succeeded but the server returned an invalid user role.",
      );
    }

    await saveSession(token, rawRole);

    setBanner({
      type: "success",
      message:
        data.message ??
        "Login successful! Welcome back to ResQMeal.",
    });

    setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "Home",
            params: {
              role: rawRole,
            },
          },
        ],
      });
    }, 1000);
  } catch (err: any) {
    const status = err?.response?.status;

    const serverMessage =
      err?.response?.data?.message;

    let message =
      "Something went wrong. Please try again.";

    if (!err?.response) {
      message =
        "Unable to connect to the server. Please check your internet connection.";
    } else if (status === 401) {
      message =
        "Incorrect email or password. Please try again.";
    } else if (status === 403) {
      message =
        serverMessage ??
        "Your account has not been verified yet. Please verify your account first.";
    } else if (status === 429) {
      message =
        "Too many login attempts. Please wait a few minutes and try again.";
    } else if (status >= 500) {
      message =
        "The server is temporarily unavailable. Please try again later.";
    } else if (serverMessage) {
      message = serverMessage;
    } else if (err?.message) {
      message = err.message;
    }

    setBanner({
      type: "error",
      message,
    });
  } finally {
    setSubmitting(false);
  }
}

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: theme.background,
      }}
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
        <View
          style={{
            width: '100%',
            maxWidth: 480,
          }}
        >
          {/* HEADER */}

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
                name="restaurant"
                size={32}
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
              Welcome back
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
              Log in to continue rescuing food with ResQMeal.
            </Text>
          </View>

          {/* CARD */}

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
            {banner && (
              <StatusMessage
                type={banner.type}
                message={banner.message}
              />
            )}

            <Field
              icon="mail-outline"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setBanner(null);
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Field
              icon="lock-closed-outline"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setBanner(null);
              }}
              error={errors.password}
              secureTextEntry={!showPassword}
              showPassword={showPassword}
              onToggleSecure={() =>
                setShowPassword((prev) => !prev)
              }
            />

            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ForgotPassword')
              }
              activeOpacity={0.7}
              style={{
                alignSelf: 'flex-end',
                marginBottom: Spacing.four,
                marginTop: -Spacing.one,
              }}
            >
              <Text
                style={{
                  ...T.label,
                  color: theme.primary,
                }}
              >
                Forgot password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={submitting}
              activeOpacity={0.85}
              style={{
                minHeight: 54,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.primary,
                borderRadius: Radius.md,
                opacity: submitting ? 0.7 : 1,
                ...Shadows.button,
              }}
            >
              {submitting ? (
                <ActivityIndicator
                  color={theme.textOnPrimary}
                />
              ) : (
                <>
                  <Ionicons
                    name="log-in-outline"
                    size={20}
                    color={theme.textOnPrimary}
                    style={{ marginRight: 8 }}
                  />

                  <Text
                    style={{
                      ...T.button,
                      color: theme.textOnPrimary,
                    }}
                  >
                    Log In
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* REGISTER LINK */}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: Spacing.four,
              }}
            >
              <Text
                style={{
                  ...T.bodySmall,
                  color: theme.textSecondary,
                }}
              >
                Don&apos;t have an account?
              </Text>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Register')
                }
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    ...T.label,
                    color: theme.primary,
                    marginLeft: 5,
                  }}
                >
                  Register here
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FOOTER */}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: Spacing.four,
            }}
          >
            <Ionicons
              name="leaf-outline"
              size={15}
              color={theme.primary}
            />

            <Text
              style={{
                ...T.bodySmall,
                color: theme.textSecondary,
                marginLeft: 5,
              }}
            >
              Together, we can reduce food waste.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ============================================================
   STATUS MESSAGE (success / error banner)
============================================================ */

function StatusMessage({
  type,
  message,
}: {
  type: 'success' | 'error';
  message: string;
}) {
  const theme = Colors.light;
  const T = useAppTypography();

  const isSuccess = type === 'success';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: isSuccess
          ? theme.successSoft
          : theme.errorSoft,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: isSuccess
          ? theme.success
          : theme.error,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        marginBottom: Spacing.four,
      }}
    >
      <Ionicons
        name={
          isSuccess
            ? 'checkmark-circle'
            : 'alert-circle'
        }
        size={18}
        color={isSuccess ? theme.success : theme.error}
        style={{ marginRight: 8, marginTop: 1 }}
      />

      <Text
        style={{
          ...T.bodySmall,
          color: isSuccess
            ? theme.primaryDark
            : theme.error,
          flex: 1,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

/* ============================================================
   INPUT FIELD
============================================================ */

function Field({
  label,
  error,
  icon,
  showPassword,
  onToggleSecure,
  ...inputProps
}: {
  label: string;
  error?: string;
  icon?: IconName;
  showPassword?: boolean;
  onToggleSecure?: () => void;
} & React.ComponentProps<typeof TextInput>) {
  const theme = Colors.light;
  const T = useAppTypography();

  const [focused, setFocused] = useState(false);

  const isSecureField = inputProps.secureTextEntry !== undefined;

  const borderColor = error
    ? theme.error
    : focused
      ? theme.borderFocus
      : theme.border;

  return (
    <View style={{ marginBottom: Spacing.three }}>
      <Text
        style={{
          ...T.label,
          color: theme.text,
          marginBottom: 6,
        }}
      >
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
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={
              error
                ? theme.error
                : focused
                  ? theme.primary
                  : theme.textSecondary
            }
            style={{ marginRight: Spacing.two }}
          />
        )}

        <TextInput
          {...inputProps}
          placeholderTextColor={theme.inputPlaceholder}
          secureTextEntry={
            isSecureField ? !showPassword : undefined
          }
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
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

        {isSecureField && (
          <TouchableOpacity
            onPress={onToggleSecure}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? 'Hide password' : 'Show password'
            }
            style={{ marginLeft: Spacing.two }}
          >
            <Ionicons
              name={
                showPassword
                  ? 'eye-off-outline'
                  : 'eye-outline'
              }
              size={18}
              color={
                error
                  ? theme.error
                  : focused
                    ? theme.primary
                    : theme.textSecondary
              }
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 5,
          }}
        >
          <Ionicons
            name="alert-circle"
            size={13}
            color={theme.error}
            style={{ marginRight: 4 }}
          />

          <Text
            style={{
              ...T.bodySmall,
              color: theme.error,
              fontSize: 11,
              flex: 1,
            }}
          >
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}