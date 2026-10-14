import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  connectGlobalSocket,
  onNewNotification,
  type ChatNotificationPayload,
} from "../services/amasha-chatSocket";

/**
 * Call once at the app root, AFTER auth is confirmed.
 *
 * 1. Opens (or reuses) the global Socket.IO connection so the backend knows
 *    this device is online and can push `amasha:notification:new` events even
 *    when the user is not in any ChatScreen.
 * 2. Subscribes to those events and fires a local expo-notifications banner
 *    with the sender name and a message preview.
 *
 * The existing `Notifications.setNotificationHandler` (set up in
 * kaveesha-pushNotificationService.ts) is what makes the banner appear while
 * the app is open; here we only schedule the notification.
 */
export function useChatNotificationListener(): void {
  useEffect(() => {
    // Kick off the global socket. Safe to call even if already connected.
    connectGlobalSocket();

    const unsubscribe = onNewNotification(
      async (payload: ChatNotificationPayload) => {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: payload.title,
              body: payload.body,
              data: {
                contextType: payload.contextType,
                contextId: payload.contextId,
                type: "CHAT_NEW_MESSAGE",
              },
              sound: Platform.OS === "ios" ? "default" : undefined,
            },
            trigger: null, // fire immediately
          });
        } catch (err) {
          // expo-notifications may not be available in test/web environments.
          console.warn("[useChatNotificationListener] banner failed:", err);
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);
}
