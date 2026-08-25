import React, { useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Colors, Radius, Spacing } from "@/constants/theme";
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
  const [loggingOut, setLoggingOut] = useState(false);

  function handleLogoutPress() {
    // Alert.alert does not render a dialog on web, so we branch
    // to the browser's native confirm() there instead.
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to log out of ResQMeal?",
      );

      if (confirmed) {
        performLogout();
      }
      // If not confirmed, do nothing — user stays logged in.
      return;
    }

    Alert.alert(
      "Log out?",
      "Are you sure you want to log out of ResQMeal?",
      [
        {
          text: "No",
          style: "cancel",
          onPress: () => {
            // Explicitly do nothing — user stays logged in.
          },
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: performLogout,
        },
      ],
      { cancelable: true },
    );
  }

  async function performLogout() {
    setLoggingOut(true);

    try {
      await clearSession();

      if (Platform.OS === "web") {
        window.alert("You have been successfully logged out.");
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      } else {
        Alert.alert(
          "Logged out",
          "You have been successfully logged out.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                });
              },
            },
          ],
        );
      }
    } catch (error) {
      if (Platform.OS === "web") {
        window.alert("Could not log out. Please try again.");
      } else {
        Alert.alert(
          "Something went wrong",
          "Could not log out. Please try again.",
        );
      }
    } finally {
      setLoggingOut(false);
    }
  }

  if (compact) {
    return (
      <TouchableOpacity
        onPress={handleLogoutPress}
        disabled={loggingOut}
        activeOpacity={0.85}
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
    );
  }

  return (
    <TouchableOpacity
      onPress={handleLogoutPress}
      disabled={loggingOut}
      activeOpacity={0.85}
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
  );
}