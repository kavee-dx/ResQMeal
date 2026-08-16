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
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { verifyAccount, resendVerificationCode } from "../services/api";
import { Typography, Spacing, Radius, ComponentSizes, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Props = NativeStackScreenProps<any, "VerifyAccount">;

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function VerifyAccountScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { email } = route.params as { email: string };

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
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
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
        setTimeout(() => navigation.navigate("Login"), 1200);
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
      Alert.alert(res.success ? "Code sent" : "Could not resend", res.message ?? "");
      if (res.success) setResendCooldown(RESEND_COOLDOWN);
    } catch (err: any) {
      Alert.alert("Could not resend", err?.message ?? "Please try again.");
    } finally {
      setResending(false);
    }
  }

  function borderColorFor(i: number) {
    if (error) return theme.error;
    if (focusedIndex === i) return theme.borderFocus;
    return theme.border;
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: Spacing.four,
        backgroundColor: theme.background,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 340,
          backgroundColor: theme.surface,
          borderRadius: Radius.lg,
          padding: Spacing.four,
          ...Shadows.card,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: Radius.lg,
            backgroundColor: theme.primaryLight,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: Spacing.three,
          }}
        >
          <Text style={{ fontSize: 26 }}>📩</Text>
        </View>

        <Text style={{ ...Typography.h2, color: theme.text, marginBottom: Spacing.two }}>
          Verify your account
        </Text>
        <Text style={{ ...Typography.body, color: theme.textSecondary, marginBottom: Spacing.four }}>
          We sent a 6-digit code to {email}. Enter it below to activate your account.
        </Text>

        {/* OTP entry box */}
        <View
          style={{
            backgroundColor: theme.formBackground,
            borderRadius: Radius.md,
            padding: Spacing.three,
            marginBottom: Spacing.two,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "center", gap: Spacing.two }}>
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
                  width: 40,
                  height: 48,
                  textAlign: "center",
                  borderWidth: focusedIndex === i && !error ? 1.5 : 1,
                  borderColor: borderColorFor(i),
                  borderRadius: Radius.sm,
                  fontFamily: Typography.h3.fontFamily,
                  fontSize: 18,
                  color: theme.inputText,
                  backgroundColor: theme.inputBackground,
                }}
              />
            ))}
          </View>
        </View>

        {error ? (
          <Text style={{ ...Typography.bodySmall, color: theme.error, marginBottom: Spacing.three, fontSize: 12 }}>
            {error}
          </Text>
        ) : null}

        {status === "success" ? (
          <View
            style={{
              backgroundColor: theme.successSoft,
              borderRadius: Radius.sm,
              paddingVertical: Spacing.two,
              paddingHorizontal: Spacing.three,
              marginBottom: Spacing.three,
            }}
          >
            <Text style={{ ...Typography.bodySmall, color: theme.success, fontWeight: "600" }}>
              Account verified! Redirecting to login…
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleVerify}
          disabled={submitting || status === "success"}
          style={{
            height: ComponentSizes.buttonHeight,
            backgroundColor: status === "success" ? theme.success : theme.primary,
            borderRadius: Radius.md,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {submitting ? (
            <ActivityIndicator color={theme.surface} />
          ) : (
            <Text style={{ ...Typography.button, color: theme.surface }}>
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
              ...Typography.bodySmall,
              color: resendCooldown > 0 ? theme.textMuted : theme.primary,
              fontFamily: Typography.label.fontFamily,
            }}
          >
            {resending
              ? "Resending…"
              : resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Didn't get a code? Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
