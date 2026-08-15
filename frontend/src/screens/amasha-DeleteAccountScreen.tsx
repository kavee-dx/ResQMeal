import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Typography, Spacing, Radius, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { deleteAccount } from "../services/amasha-accountDeletionApi";
import { clearSession } from "../utils/kaveesha-authStorage";

type Props = NativeStackScreenProps<any, "DeleteAccount">;

const CONFIRM_PHRASE = "DELETE";

export default function DeleteAccountScreen({ navigation }: Props) {
  const theme = useTheme();

  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phraseMatches = confirmText === CONFIRM_PHRASE;
  const canSubmit = phraseMatches && password.length > 0 && !submitting;

  async function handleDeletePress() {
    if (!canSubmit) return;

    // Second, explicit confirmation — a native alert as the final gate,
    // separate from the typed phrase, so there's no single accidental tap
    // that deletes an account.
    Alert.alert(
      "Delete account permanently?",
      "This cannot be undone. All your data, donations, requests, and settings will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: submitDeletion,
        },
      ]
    );
  }

  async function submitDeletion() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await deleteAccount(password);

      if (res.success) {
        await clearSession();
        Alert.alert(
          "Account deleted",
          res.message ?? "Your account has been permanently deleted."
        );
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      } else {
        setError(res.message ?? "Could not delete account. Please try again.");
      }
    } catch (err) {
      setError("Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: Spacing.four, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: Radius.lg,
            backgroundColor: theme.errorSoft,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: Spacing.three,
          }}
        >
          <Ionicons name="warning-outline" size={28} color={theme.error} />
        </View>

        <Text style={{ ...Typography.h2, color: theme.text, marginBottom: Spacing.one }}>
          Delete your account
        </Text>

        <Text
          style={{
            ...Typography.body,
            color: theme.textSecondary,
            marginBottom: Spacing.four,
          }}
        >
          This action is permanent and cannot be undone. Deleting your account
          will remove your profile, privacy and notification settings, and
          your donation or request history from ResQMeal.
        </Text>

        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: Radius.lg,
            padding: Spacing.four,
            borderWidth: 1,
            borderColor: theme.border,
            ...Shadows.card,
          }}
        >
          <Text style={{ ...Typography.label, color: theme.text, marginBottom: 6 }}>
            Type DELETE to confirm
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="DELETE"
            placeholderTextColor={theme.inputPlaceholder}
            autoCapitalize="characters"
            autoCorrect={false}
            style={{
              ...Typography.input,
              minHeight: 52,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: Radius.md,
              paddingHorizontal: Spacing.three,
              color: theme.inputText,
              backgroundColor: theme.inputBackground,
              marginBottom: Spacing.three,
            }}
          />

          <Text style={{ ...Typography.label, color: theme.text, marginBottom: 6 }}>
            Confirm your password
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: 52,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: Radius.md,
              paddingHorizontal: Spacing.three,
              backgroundColor: theme.inputBackground,
              marginBottom: Spacing.two,
            }}
          >
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your current password"
              placeholderTextColor={theme.inputPlaceholder}
              secureTextEntry={!showPassword}
              style={{
                ...Typography.input,
                flex: 1,
                color: theme.inputText,
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {error ? (
            <Text
              style={{
                ...Typography.bodySmall,
                color: theme.error,
                marginBottom: Spacing.two,
              }}
            >
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={handleDeletePress}
            disabled={!canSubmit}
            activeOpacity={0.85}
            style={{
              minHeight: 54,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.error,
              borderRadius: Radius.md,
              opacity: canSubmit ? 1 : 0.5,
              marginTop: Spacing.two,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={{ ...Typography.button, color: "#fff" }}>
                  Permanently Delete Account
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}