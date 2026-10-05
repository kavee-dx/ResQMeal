import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import api from "./api";

/**
 * Configure how notifications behave when the app
 * is currently open.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Get the Expo project ID from app.json / EAS configuration.
 */
function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

/**
 * Register the current physical device for Expo Push Notifications.
 *
 * Returns the Expo Push Token if registration succeeds.
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  try {
    // Remote push notifications require a physical device.
    if (!Device.isDevice) {
      console.log(
        "[Push Notifications] Physical device required."
      );

      return null;
    }

    // Android notification channel.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        "expiry-alerts",
        {
          name: "Donation Expiry Alerts",
          importance:
            Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: "default",
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
        }
      );
    }

    // Check current notification permission.
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    // Ask the user if permission has not already been granted.
    if (existingStatus !== "granted") {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log(
        "[Push Notifications] Notification permission not granted."
      );

      return null;
    }

    const projectId = getProjectId();

    if (!projectId) {
      console.error(
        "[Push Notifications] Expo project ID not found."
      );

      return null;
    }

    // Get Expo Push Token.
    const tokenResponse =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    const token = tokenResponse.data;

    if (!token) {
      console.error(
        "[Push Notifications] Expo Push Token was not returned."
      );

      return null;
    }

    console.log(
      "[Push Notifications] Expo Push Token:",
      token
    );

    // Save the token in our backend.
    await api.post("/notifications/push-token", {
      token,
      platform:
        Platform.OS === "android"
          ? "android"
          : "ios",
      deviceId: null,
    });

    console.log(
      "[Push Notifications] Token registered with backend."
    );

    return token;
  } catch (error: any) {
    console.error(
      "[Push Notifications] Registration failed:",
      error?.response?.data ||
        error?.message ||
        error
    );

    return null;
  }
}

/**
 * Disable a previously registered Expo Push Token.
 *
 * Useful when logging out or disabling notifications.
 */
export async function disablePushToken(
  token: string
): Promise<void> {
  try {
    if (!token) {
      return;
    }

    await api.post(
      "/notifications/push-token/disable",
      {
        token,
      }
    );

    console.log(
      "[Push Notifications] Push token disabled."
    );
  } catch (error: any) {
    console.error(
      "[Push Notifications] Failed to disable token:",
      error?.response?.data ||
        error?.message ||
        error
    );
  }
}