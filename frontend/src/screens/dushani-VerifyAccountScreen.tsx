// frontend/src/screens/dushani-VerifyAccountScreen.tsx
// Task 05 — Build Account Verification Screen
// Owner: Dushani
// Git commit: feat(auth): add account verification screen

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  useWindowDimensions,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { verifyAccount, resendVerificationCode } from "../services/api";
import {
  Spacing,
  Radius,
} from "@/constants/theme";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";

// ------------------------------------------------------------------
// Admin-style color palette (matching AdminLoginScreen)
// ------------------------------------------------------------------
const C = {
  navy: "#023047",
  navyDeep: "#011C2E",
  teal: "#126782",
  amber: "#FFB703",
  orange: "#FB8500",
  white: "#FFFFFF",
  offWhite: "#F6F8FA",
  cardBorder: "#E4E9ED",
  textMuted: "#6B7B85",
  error: "#D64545",
  errorSoft: "#FBEAEA",
  success: "#3FA34D",
  successSoft: "#E2F2E5",
};

const DESKTOP_BREAKPOINT = 900;

// ------------------------------------------------------------------
// Decorative blobs (matching Admin login screen)
// ------------------------------------------------------------------
function Blobs() {
  return (
    <>
      <View
        style={{
          position: "absolute",
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
          position: "absolute",
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
          position: "absolute",
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

type Props = NativeStackScreenProps<any, "VerifyAccount">;

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function VerifyAccountScreen({ route, navigation }: Props) {
  const T = useAppTypography();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const { email, fullName } = route.params as {
    email: string;
    fullName?: string;
  };

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const code = digits.join("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function updateDigit(index: number, value: string) {
    const clean = value.replace(/[^0-9]/g, "");
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    const chars = clean.split("");
    const next = [...digits];
    let i = index;
    for (const ch of chars) {
      if (i >= CODE_LENGTH) break;
      next[i] = ch;
      i++;
    }
    setDigits(next);
    setError(null);
    const nextFocus = Math.min(i, CODE_LENGTH - 1);
    inputRefs.current[nextFocus]?.focus();
  }

  function handleKeyPress(
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    if (code.length !== CODE_LENGTH) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await verifyAccount(email, code);
      if (res.success) {
        setStatus("success");
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: "RegistrationPending", params: { fullName } }],
          });
        }, 1200);
      } else {
        setError(res.message ?? "Verification failed.");
        setDigits(Array(CODE_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err?.message ?? "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResending(true);
    try {
      const res = await resendVerificationCode(email);
      Alert.alert(
        res.success ? "Code sent" : "Could not resend",
        res.message ?? "",
      );
      if (res.success) setResendCooldown(RESEND_COOLDOWN);
    } catch (err: any) {
      Alert.alert("Could not resend", err?.message ?? "Please try again.");
    } finally {
      setResending(false);
    }
  }

  function borderColorFor(i: number) {
    if (error) return C.error;
    if (focusedIndex === i) return C.teal;
    return C.cardBorder;
  }

  // =================================================================
  // DESKTOP LAYOUT
  // =================================================================
  if (isDesktop) {
    return (
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          backgroundColor: C.white,
        }}
      >
        {/* ----------------------------------------------------------
            LEFT BRANDING PANEL
        ---------------------------------------------------------- */}
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

          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 26,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
            }}
          >
            <Ionicons
              name="mail"
              size={40}
              color={C.amber}
            />
          </View>

          <Text
            style={{
              ...T.h1,
              color: C.white,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            Verify your account
          </Text>

          <Text
            style={{
              ...T.body,
              color: 'rgba(255,255,255,0.75)',
              textAlign: 'center',
              maxWidth: 380,
            }}
          >
            We sent a 6-digit code to {email}. Enter it below to activate your account and complete your registration.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 32,
            }}
          >
            <View
              style={{
                width: 32,
                height: 3,
                borderRadius: 3,
                backgroundColor: C.white,
                opacity: 0.5,
              }}
            />

            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 8,
                backgroundColor: C.amber,
                marginHorizontal: 8,
              }}
            />

            <View
              style={{
                width: 32,
                height: 3,
                borderRadius: 3,
                backgroundColor: C.white,
                opacity: 0.5,
              }}
            />
          </View>
        </View>

        {/* ----------------------------------------------------------
            RIGHT FORM PANEL
        ---------------------------------------------------------- */}
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 400,
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                ...T.h2,
                color: C.navy,
                marginBottom: 6,
              }}
            >
              Enter verification code
            </Text>

            <Text
              style={{
                ...T.body,
                color: C.textMuted,
                marginBottom: 32,
              }}
            >
              Check your email for the 6-digit code.
            </Text>

            {renderOTPForm(T, borderColorFor, digits, inputRefs, updateDigit, handleKeyPress, focusedIndex, setFocusedIndex, error, submitting, status, handleVerify, handleResend, resending, resendCooldown)}
          </View>
        </View>
      </View>
    );
  }

  // =================================================================
  // MOBILE LAYOUT
  // =================================================================
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: Spacing.four,
        backgroundColor: C.white,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 340,
          backgroundColor: C.white,
          borderRadius: Radius.lg,
          padding: Spacing.four,
          shadowColor: C.navy,
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: Radius.lg,
            backgroundColor: C.offWhite,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: Spacing.three,
          }}
        >
          <Ionicons name="mail" size={26} color={C.navy} />
        </View>

        <Text
          style={{
            ...T.h2,
            color: C.navy,
            marginBottom: Spacing.two,
          }}
        >
          Verify your account
        </Text>
        <Text
          style={{
            ...T.body,
            color: C.textMuted,
            marginBottom: Spacing.four,
          }}
        >
          We sent a 6-digit code to {email}. Enter it below to activate your
          account.
        </Text>

        {renderOTPForm(T, borderColorFor, digits, inputRefs, updateDigit, handleKeyPress, focusedIndex, setFocusedIndex, error, submitting, status, handleVerify, handleResend, resending, resendCooldown)}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------
// OTP Form Component (shared between desktop and mobile)
// ------------------------------------------------------------------
function renderOTPForm(
  T: ReturnType<typeof useAppTypography>,
  borderColorFor: (i: number) => string,
  digits: string[],
  inputRefs: React.MutableRefObject<Array<TextInput | null>>,
  updateDigit: (index: number, value: string) => void,
  handleKeyPress: (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void,
  focusedIndex: number | null,
  setFocusedIndex: (index: number | null) => void,
  error: string | null,
  submitting: boolean,
  status: "idle" | "success",
  handleVerify: () => void,
  handleResend: () => void,
  resending: boolean,
  resendCooldown: number
) {
  return (
    <>
      {/* OTP entry box */}
      <View
        style={{
          backgroundColor: C.offWhite,
          borderRadius: 14,
          padding: Spacing.three,
          marginBottom: Spacing.two,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: Spacing.two,
          }}
        >
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              value={d}
              onChangeText={(v) => updateDigit(i, v)}
              onKeyPress={(e) => handleKeyPress(i, e)}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              editable={!submitting && status !== "success"}
              style={{
                width: 44,
                height: 52,
                textAlign: "center",
                borderWidth: focusedIndex === i && !error ? 1.5 : 1,
                borderColor: borderColorFor(i),
                borderRadius: 10,
                ...T.h3,
                fontSize: 18,
                color: C.navy,
                backgroundColor: C.white,
              }}
            />
          ))}
        </View>
      </View>

      {error ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: Spacing.three,
          }}
        >
          <Ionicons
            name="alert-circle"
            size={13}
            color={C.error}
            style={{ marginRight: 4 }}
          />
          <Text
            style={{
              ...T.bodySmall,
              color: C.error,
              fontSize: 11,
              flex: 1,
            }}
          >
            {error}
          </Text>
        </View>
      ) : null}

      {status === "success" ? (
        <View
          style={{
            backgroundColor: C.successSoft,
            borderRadius: 10,
            paddingVertical: Spacing.two,
            paddingHorizontal: Spacing.three,
            marginBottom: Spacing.three,
          }}
        >
          <Text
            style={{
              ...T.bodySmall,
              color: C.success,
              fontWeight: "600",
            }}
          >
            Email verified! Taking you to the next step…
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={handleVerify}
        disabled={submitting || status === "success"}
        style={{
          minHeight: 56,
          backgroundColor:
            status === "success" ? C.success : C.orange,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: C.orange,
          shadowOffset: {
            width: 0,
            height: 6,
          },
          shadowOpacity: 0.28,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        {submitting ? (
          <ActivityIndicator color={C.white} />
        ) : (
          <Text style={{ ...T.button, color: C.white }}>
            {status === "success" ? "Verified" : "Verify"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleResend}
        disabled={resending || resendCooldown > 0}
        style={{ marginTop: Spacing.three, alignItems: "center" }}
      >
        <Text
          style={{
            ...T.bodySmall,
            color: resendCooldown > 0 ? C.textMuted : C.navy,
            fontFamily: T.label.fontFamily,
          }}
        >
          {resending
            ? "Resending…"
            : resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Didn't get a code? Resend"}
        </Text>
      </TouchableOpacity>
    </>
  );
}
