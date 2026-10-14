import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Colors, Radius, Shadows, Spacing, Typography } from "@/constants/theme";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";
import { clearSession } from "../utils/kaveesha-authStorage";
import type { RootStackParamList } from "../navigation/types";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  navigation: Navigation;
  /** compact = small icon-only circle for a header row.
   *  omit (or false) = full-width button with label. */
  compact?: boolean;
};

export default function LogoutButton({ navigation, compact }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const closeConfirm = () => {
    if (!loggingOut) setConfirmOpen(false);
  };

  async function performLogout() {
    setLoggingOut(true);

    try {
      await clearSession();

      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error) {
      Alert.alert(
        "Something went wrong",
        "Could not log out. Please try again.",
        [{ text: "OK", onPress: () => setConfirmOpen(false) }],
      );
    } finally {
      setLoggingOut(false);
    }
  }

  if (compact) {
    return (
      <>
        <TouchableOpacity
          onPress={() => setConfirmOpen(true)}
          disabled={loggingOut}
          activeOpacity={0.85}
          accessibilityLabel="Log out"
          accessibilityRole="button"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.errorSoft,
            borderWidth: 1,
            borderColor: theme.error,
            opacity: loggingOut ? 0.7 : 1,
          }}
        >
          {loggingOut ? (
            <ActivityIndicator color={theme.error} size="small" />
          ) : (
            <Ionicons name="log-out-outline" size={20} color={theme.error} />
          )}
        </TouchableOpacity>

        <LogoutConfirmModal
          visible={confirmOpen}
          loggingOut={loggingOut}
          onCancel={closeConfirm}
          onConfirm={performLogout}
        />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setConfirmOpen(true)}
        disabled={loggingOut}
        activeOpacity={0.85}
        accessibilityLabel="Log out"
        accessibilityRole="button"
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 50,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: theme.error,
          backgroundColor: theme.errorSoft,
          paddingHorizontal: Spacing.four,
          opacity: loggingOut ? 0.7 : 1,
        }}
      >
        {loggingOut ? (
          <ActivityIndicator color={theme.error} />
        ) : (
          <>
            <Ionicons
              name="log-out-outline"
              size={18}
              color={theme.error}
              style={{ marginRight: 8 }}
            />
            <Text style={{ ...T.button, color: theme.error }}>Log Out</Text>
          </>
        )}
      </TouchableOpacity>

      <LogoutConfirmModal
        visible={confirmOpen}
        loggingOut={loggingOut}
        onCancel={closeConfirm}
        onConfirm={performLogout}
      />
    </>
  );
}

/* Styled confirmation shown on every platform — the plain
 * Alert.alert / window.confirm pair it replaced rendered no
 * dialog on some web setups. */
function LogoutConfirmModal({
  visible,
  loggingOut,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  loggingOut: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const theme = Colors.light;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="log-out" size={28} color={theme.error} />
          </View>

          <Text style={styles.title}>Log out of ResQMeal?</Text>
          <Text style={styles.message}>
            You will need to sign in again to access your account and manage
            your campaigns.
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={loggingOut}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              disabled={loggingOut}
              activeOpacity={0.85}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color={theme.textOnPrimary} />
              ) : (
                <Ionicons
                  name="log-out-outline"
                  size={17}
                  color={theme.textOnPrimary}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text style={styles.confirmText}>
                {loggingOut ? "Logging out..." : "Log out"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2, 48, 71, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    alignItems: "center",
    ...Shadows.card,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.errorSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.three,
  },
  title: {
    ...Typography.h3,
    color: Colors.light.text,
    textAlign: "center",
  },
  message: {
    ...Typography.body,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: Spacing.two,
  },
  buttons: {
    flexDirection: "row",
    gap: Spacing.three,
    marginTop: Spacing.four,
    alignSelf: "stretch",
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surfaceSoft,
  },
  cancelText: {
    ...Typography.button,
    color: Colors.light.textSecondary,
  },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.light.error,
  },
  confirmText: {
    ...Typography.button,
    color: Colors.light.textOnPrimary,
  },
});
