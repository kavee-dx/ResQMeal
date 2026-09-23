import React, { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Image,
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

import { verifyResetOtp, requestPasswordReset } from '../services/api';
import { useAppTypography } from '../hooks/kaveesha-useAppTypography';

import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyResetOtp'>;

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 45; // seconds
const DESKTOP_BREAKPOINT = 900;

// ------------------------------------------------------------------
// Same brand palette as LoginScreen / ForgotPasswordScreen /
// ResetPasswordScreen — keeps every auth screen visually consistent.
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

/**
 * ============================================================
 * VERIFY RESET OTP SCREEN
 * ============================================================
 * 6-digit code entry with auto-advance boxes, resend cooldown,
 * and a friendly "sent to your inbox" confirmation banner.
 * Restyled to match the shared auth-screen brand layout.
 */
export default function VerifyResetOtpScreen({ navigation, route }: Props) {
  const T = useAppTypography();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
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

  const formProps = {
    T,
    email,
    digits,
    error,
    submitting,
    resending,
    cooldown,
    justSent,
    isComplete,
    inputs,
    handleChange,
    handleKeyPress,
    handleVerify,
    handleResend,
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
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={8}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 22 }}
            >
              <Ionicons name="arrow-back" size={18} color={C.textMuted} />
              <Text style={{ ...T.label, color: C.textMuted, marginLeft: 6 }}>
                Back
              </Text>
            </TouchableOpacity>

            <Text style={{ ...T.h2, color: C.navy, marginBottom: 6 }}>
              Check your inbox
            </Text>

            <Text style={{ ...T.body, color: C.textMuted, marginBottom: 28 }}>
              We've sent a 6-digit code to{' '}
              <Text style={{ ...T.label, color: C.navy }}>{email}</Text>
            </Text>

            <FormFields {...formProps} />
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
            <Ionicons name="shield-checkmark-outline" size={32} color={C.amber} />
          </View>

          <Text style={{ ...T.h1, color: C.white, textAlign: 'center' }}>
            Check your inbox
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
            We've sent a 6-digit code to{'\n'}
            <Text style={{ ...T.label, color: C.white }}>{email}</Text>
          </Text>
        </View>

        {/* ------------------------------------------------------
            FORM CARD
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
          <FormFields {...formProps} />
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
// Brand Panel (desktop left column) — identical to the other auth
// screens', so every screen feels like one continuous experience.
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
// Form Fields — "sent" banner + OTP boxes + verify button + resend.
// Shared between the desktop panel and the mobile card.
// ------------------------------------------------------------------
type FormFieldsProps = {
  T: ReturnType<typeof useAppTypography>;
  email: string;
  digits: string[];
  error?: string;
  submitting: boolean;
  resending: boolean;
  cooldown: number;
  justSent: boolean;
  isComplete: boolean;
  inputs: React.MutableRefObject<Array<TextInput | null>>;
  handleChange: (text: string, index: number) => void;
  handleKeyPress: (e: any, index: number) => void;
  handleVerify: () => void;
  handleResend: () => void;
};

function FormFields({
  T,
  digits,
  error,
  submitting,
  resending,
  cooldown,
  justSent,
  isComplete,
  inputs,
  handleChange,
  handleKeyPress,
  handleVerify,
  handleResend,
}: FormFieldsProps) {
  return (
    <>
      {justSent && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: C.successSoft,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.success,
            paddingVertical: 10,
            paddingHorizontal: 14,
            marginBottom: 20,
          }}
        >
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={C.success}
            style={{ marginRight: 8, marginTop: 1 }}
          />
          <Text style={{ ...T.bodySmall, color: C.success, flex: 1 }}>
            Email sent to your inbox successfully. It may take a minute to
            arrive.
          </Text>
        </View>
      )}

      <Text
        style={{
          ...T.label,
          color: C.navy,
          marginBottom: 14,
          textAlign: 'center',
        }}
      >
        Enter verification code
      </Text>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: error ? 8 : 22,
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
              textAlignVertical="center"
              autoFocus={index === 0}
              style={{
                ...T.h2,
                width: 46,
                height: 56,
                lineHeight: 56,
                paddingVertical: 0,
                paddingHorizontal: 0,
                textAlign: 'center',
                borderRadius: 14,
                borderWidth: filled ? 1.5 : 1.5,
                borderColor: error ? C.error : filled ? C.teal : C.cardBorder,
                backgroundColor: filled ? '#EAF3F6' : C.offWhite,
                color: C.navy,
              }}
              selectionColor={C.teal}
            />
          );
        })}
      </View>

      {error ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 18,
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name="alert-circle"
            size={13}
            color={C.error}
            style={{ marginRight: 4 }}
          />
          <Text style={{ ...T.bodySmall, color: C.error, fontSize: 12 }}>
            {error}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={handleVerify}
        disabled={submitting || !isComplete}
        activeOpacity={0.88}
        style={{
          minHeight: 56,
          borderRadius: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.orange,
          opacity: submitting || !isComplete ? 0.6 : 1,
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
            <Text style={{ ...T.button, color: C.white }}>Verify Code</Text>
          </>
        )}
      </TouchableOpacity>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 22,
        }}
      >
        <Text style={{ ...T.bodySmall, color: C.textMuted }}>
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
              color: cooldown > 0 || resending ? C.textMuted : C.teal,
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
    </>
  );
}