import React, { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { resetPassword } from '../services/api';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';

import type { RootStackParamList } from '../navigation/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

const REDIRECT_DELAY_MS = 3200;
const DESKTOP_BREAKPOINT = 900;

// ------------------------------------------------------------------
// Same brand palette as LoginScreen / ForgotPasswordScreen — keeps
// every auth screen visually consistent (navy / teal / amber / orange).
// ------------------------------------------------------------------
const C = {
  navy: "#023047",
  navyDeep: "#011C2E",
  teal: "#126782",
  amber: "#FFB703",
  orange: "#FB8500",
  green: "#6B8E23",
  white: "#FFFFFF",
  offWhite: "#F6F8FA",
  cardBorder: "#E4E9ED",
  textMuted: "#6B7B85",
  success: "#2E8B57",
  successSoft: "#E9F6EF",
  error: "#D64545",
  errorSoft: "#FBEAEA",
};

function hasStrongPassword(value: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}

/**
 * ============================================================
 * RESET PASSWORD SCREEN
 * ============================================================
 * Set a new password, see a friendly success confirmation,
 * then auto-redirect back to Login. Restyled to match the
 * ForgotPasswordScreen's desktop/mobile brand layout.
 */
export default function ResetPasswordScreen({ navigation, route }: Props) {
  const T = useAppTypography();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
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

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!success) return;

    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: true });

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

  const formProps = {
    T,
    password,
    confirmPassword,
    errors,
    serverError,
    submitting,
    showPassword,
    showConfirm,
    setPassword,
    setConfirmPassword,
    setErrors,
    setServerError,
    setShowPassword,
    setShowConfirm,
    handleSubmit,
  };

  // =================================================================
  // DESKTOP LAYOUT
  // =================================================================
  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.white }}>
        <BrandPanel />

        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 48,
          }}
        >
          <View style={{ width: '100%', maxWidth: 420, paddingHorizontal: 20 }}>
            {success ? (
              <SuccessBlock T={T} />
            ) : (
              <>
                <Text style={{ ...T.h2, color: C.navy, marginBottom: 6 }}>
                  Set a new password
                </Text>

                <Text style={{ ...T.body, color: C.textMuted, marginBottom: 28 }}>
                  Choose a strong password you haven't used before.
                </Text>

                <FormFields {...formProps} />
              </>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // =================================================================
  // MOBILE LAYOUT
  // =================================================================
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.white }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      >
        {/* ------------------------------------------------------
            HERO HEADER
        ------------------------------------------------------ */}
        <View
          style={{
            backgroundColor: C.navy,
            paddingTop: 64,
            paddingBottom: 56,
            paddingHorizontal: 24,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            overflow: 'hidden',
            alignItems: 'center',
          }}
        >
          <Blobs />

          {!success && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={10}
              activeOpacity={0.7}
              style={{
                position: 'absolute',
                top: 40,
                left: 20,
                zIndex: 10,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.14)',
              }}
            >
              <Ionicons name="arrow-back" size={16} color={C.white} />
              <Text style={{ ...T.bodySmall, color: C.white, marginLeft: 5 }}>
                Back
              </Text>
            </TouchableOpacity>
          )}

          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <Ionicons
              name={success ? 'checkmark-circle-outline' : 'lock-open-outline'}
              size={32}
              color={C.amber}
            />
          </View>

          <Text style={{ ...T.h1, color: C.white, textAlign: 'center' }}>
            {success ? 'Password updated!' : 'Set a new password'}
          </Text>

          <Text
            style={{
              ...T.body,
              color: 'rgba(255,255,255,0.75)',
              textAlign: 'center',
              marginTop: 6,
              maxWidth: 300,
            }}
          >
            {success
              ? 'You can now log in to ResQMeal with your new password.'
              : "Choose a strong password you haven't used before."}
          </Text>
        </View>

        {/* ------------------------------------------------------
            FORM / SUCCESS CARD
        ------------------------------------------------------ */}
        <View
          style={{
            marginTop: -32,
            marginHorizontal: 20,
            backgroundColor: C.white,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: C.cardBorder,
            padding: 24,
            shadowColor: C.navy,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 20,
            elevation: 6,
          }}
        >
          {success ? (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <ActivityIndicator color={C.green} />
              <Text style={{ ...T.bodySmall, color: C.textMuted, marginTop: 10 }}>
                Redirecting you to login...
              </Text>
            </View>
          ) : (
            <FormFields {...formProps} />
          )}
        </View>

        {/* ------------------------------------------------------
            FOOTER
        ------------------------------------------------------ */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
          }}
        >
          <Ionicons name="shield-checkmark-outline" size={15} color={C.teal} />

          <Text style={{ ...T.bodySmall, color: C.textMuted, marginLeft: 5 }}>
            Your account stays safe with us.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ------------------------------------------------------------------
// Success Block — desktop-only success message (mobile version is
// inline in the hero header + card above).
// ------------------------------------------------------------------
function SuccessBlock({ T }: { T: ReturnType<typeof useAppTypography> }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          backgroundColor: C.successSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          borderWidth: 2,
          borderColor: C.success,
        }}
      >
        <Ionicons name="checkmark-circle" size={48} color={C.success} />
      </View>

      <Text style={{ ...T.h2, color: C.navy, textAlign: 'center', marginBottom: 8 }}>
        Password updated!
      </Text>

      <Text
        style={{
          ...T.body,
          color: C.textMuted,
          textAlign: 'center',
          maxWidth: 320,
          marginBottom: 20,
        }}
      >
        You can now log in to ResQMeal with your new password.
      </Text>

      <ActivityIndicator color={C.green} />

      <Text style={{ ...T.bodySmall, color: C.textMuted, marginTop: 10 }}>
        Redirecting you to login...
      </Text>
    </View>
  );
}

// ------------------------------------------------------------------
// Brand Panel (desktop left column) — identical to LoginScreen's /
// ForgotPasswordScreen's, so every auth screen feels continuous.
// ------------------------------------------------------------------
function BrandPanel() {
  const T = useAppTypography();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.navy,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 60,
      }}
    >
      <Blobs />

      <Image
        source={require('../../assets/images/ResQMeal_icon.png')}
        style={{ width: 200, height: 200, marginBottom: 8 }}
        resizeMode="contain"
      />

      <Text
        style={{
          ...T.h1,
          color: C.white,
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        ResQMeal
      </Text>

      <Text
        style={{
          ...T.body,
          color: 'rgba(255,255,255,0.75)',
          textAlign: 'center',
          maxWidth: 380,
        }}
      >
        Connecting donors, volunteers, NGOs and communities to rescue
        surplus food and fight hunger — together.
      </Text>
    </View>
  );
}

// ------------------------------------------------------------------
// Decorative blobs — shared visual language with every auth screen.
// ------------------------------------------------------------------
function Blobs() {
  return (
    <>
      <View
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: C.teal,
          opacity: 0.35,
          top: -60,
          right: -60,
        }}
      />

      <View
        style={{
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: C.orange,
          opacity: 0.25,
          bottom: -40,
          left: -40,
        }}
      />

      <View
        style={{
          position: 'absolute',
          width: 90,
          height: 90,
          borderRadius: 45,
          backgroundColor: C.amber,
          opacity: 0.2,
          bottom: 60,
          right: 30,
        }}
      />
    </>
  );
}

// ------------------------------------------------------------------
// Form Fields — password + confirm password + server error + submit.
// Shared between the desktop panel and the mobile card.
// ------------------------------------------------------------------
type FormFieldsProps = {
  T: ReturnType<typeof useAppTypography>;
  password: string;
  confirmPassword: string;
  errors: { password?: string; confirmPassword?: string };
  serverError?: string;
  submitting: boolean;
  showPassword: boolean;
  showConfirm: boolean;
  setPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  setErrors: React.Dispatch<
    React.SetStateAction<{ password?: string; confirmPassword?: string }>
  >;
  setServerError: (v: string | undefined) => void;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  handleSubmit: () => void;
};

function FormFields({
  T,
  password,
  confirmPassword,
  errors,
  serverError,
  submitting,
  showPassword,
  showConfirm,
  setPassword,
  setConfirmPassword,
  setErrors,
  setServerError,
  setShowPassword,
  setShowConfirm,
  handleSubmit,
}: FormFieldsProps) {
  return (
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
        T={T}
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
        T={T}
      />

      {serverError ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: C.errorSoft,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.error,
            paddingVertical: 10,
            paddingHorizontal: 14,
            marginBottom: 18,
          }}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color={C.error}
            style={{ marginRight: 8 }}
          />
          <Text style={{ ...T.bodySmall, color: C.error, flex: 1 }}>
            {serverError}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.88}
        style={{
          minHeight: 56,
          borderRadius: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.orange,
          opacity: submitting ? 0.7 : 1,
          marginTop: 4,
          shadowColor: C.orange,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        {submitting ? (
          <ActivityIndicator color={C.white} />
        ) : (
          <>
            <Ionicons
              name="checkmark-circle-outline"
              size={19}
              color={C.white}
              style={{ marginRight: 8 }}
            />
            <Text style={{ ...T.button, color: C.white }}>
              Update Password
            </Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );
}

// ------------------------------------------------------------------
// PasswordField — labeled input with icon, show/hide toggle and
// inline error. Styled with the shared brand palette.
// ------------------------------------------------------------------
function PasswordField({
  label,
  error,
  icon,
  showPassword,
  onToggleSecure,
  T,
  ...inputProps
}: {
  label: string;
  error?: string;
  icon: IconName;
  showPassword: boolean;
  onToggleSecure: () => void;
  T: ReturnType<typeof useAppTypography>;
} & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);

  const borderColor = error ? C.error : focused ? C.teal : C.cardBorder;

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ ...T.label, color: C.navy, marginBottom: 6 }}>
        {label}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 54,
          borderWidth: 1.5,
          borderColor,
          borderRadius: 14,
          backgroundColor: C.offWhite,
          paddingHorizontal: 16,
        }}
      >
        <Ionicons
          name={icon}
          size={18}
          color={error ? C.error : focused ? C.teal : C.textMuted}
          style={{ marginRight: 10 }}
        />

        <TextInput
          {...inputProps}
          placeholderTextColor={C.textMuted}
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
            color: C.navy,
          }}
          selectionColor={C.teal}
        />

        <TouchableOpacity
          onPress={onToggleSecure}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          style={{ marginLeft: 10 }}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={error ? C.error : focused ? C.teal : C.textMuted}
          />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
          <Ionicons name="alert-circle" size={13} color={C.error} style={{ marginRight: 4 }} />
          <Text style={{ ...T.bodySmall, color: C.error, fontSize: 11, flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}