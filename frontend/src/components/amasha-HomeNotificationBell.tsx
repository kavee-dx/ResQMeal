import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Colors, Radius, Shadows, Spacing, Typography } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/types";
import {
  getAppNotifications,
  getAppUnreadCount,
  markAppNotificationRead,
  markAllAppNotificationsRead,
  type AppNotification,
} from "@/services/amasha-notificationApi";
import { onNewNotification } from "@/services/amasha-chatSocket";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/** Icon per notification category, so chat alerts read like chat alerts. */
function iconFor(category: string): IconName {
  switch (category) {
    case "CHAT":
      return "chatbubble-ellipses-outline";
    case "CAMPAIGN":
      return "megaphone-outline";
    case "REQUEST":
      return "restaurant-outline";
    case "DELIVERY":
      return "car-outline";
    case "EXPIRY":
      return "alarm-outline";
    default:
      return "notifications-outline";
  }
}

function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Bell + unread badge + notification sheet for any role's home screen.
 *
 * Shows the persisted /api/notifications feed (new chat messages, campaign
 * alerts, ...) the same way the donor home shows expiry alerts. The badge
 * refreshes on screen focus and in real time when the backend pushes
 * `amasha:notification:new` over the shared chat socket.
 */
export default function AmashaHomeNotificationBell({
  size = 44,
  background,
  border,
  iconColor,
}: {
  size?: number;
  /** Override for dark headers (e.g. the recipient masthead). */
  background?: string;
  border?: string;
  iconColor?: string;
}) {
  const theme = Colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadUnread = useCallback(async () => {
    try {
      setUnreadCount(await getAppUnreadCount());
    } catch {
      // Badge only — never disturb the home screen with an error here.
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const [list, count] = await Promise.all([
        getAppNotifications({ limit: 30 }),
        getAppUnreadCount(),
      ]);
      setItems(list);
      setUnreadCount(count);
    } catch (error) {
      console.error("[NotificationBell] Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh the badge whenever the home screen gains focus.
  useFocusEffect(
    useCallback(() => {
      loadUnread();
    }, [loadUnread]),
  );

  // Realtime: the backend pushes amasha:notification:new to this user's
  // personal socket room the moment a peer messages them. Bump the badge and
  // refresh the sheet while it is open.
  useEffect(() => {
    const unsubscribe = onNewNotification(() => {
      loadUnread();
      if (open) loadList();
    });

    return unsubscribe;
  }, [open, loadUnread, loadList]);

  const openSheet = useCallback(() => {
    setOpen(true);
    loadList();
  }, [loadList]);

  const closeSheet = useCallback(() => setOpen(false), []);

  const handlePress = useCallback(
    async (item: AppNotification) => {
      try {
        if (!item.readAt) {
          await markAppNotificationRead(String(item._id));
          setItems((current) =>
            current.map((n) =>
              String(n._id) === String(item._id)
                ? { ...n, readAt: new Date().toISOString() }
                : n,
            ),
          );
          setUnreadCount((count) => Math.max(0, count - 1));
        }

        const data = item.data ?? {};

        // Chat alert with full pair info -> open that exact 1-on-1 thread.
        if (
          item.type === "CHAT_NEW_MESSAGE" &&
          data.contextType &&
          data.contextId &&
          data.senderId
        ) {
          setOpen(false);
          navigation.navigate("Chat", {
            contextType: data.contextType,
            contextId: String(data.contextId),
            peerId: String(data.senderId),
            title:
              data.contextType === "campaign"
                ? String(data.title || "Campaign chat")
                : "Rescue chat",
            subtitle: data.senderName
              ? `Chat · ${String(data.senderName)}`
              : undefined,
          });
          return;
        }

        // Older chat alerts without the sender id still lead to the chat list.
        if (item.target?.type === "chat") {
          setOpen(false);
          navigation.navigate("ChatList");
        }
      } catch (error) {
        console.error("[NotificationBell] Failed to open notification:", error);
      }
    },
    [navigation],
  );

  const handleMarkAll = useCallback(async () => {
    if (unreadCount === 0) return;
    try {
      setMarkingAll(true);
      await markAllAppNotificationsRead();
      setItems((current) =>
        current.map((n) => ({
          ...n,
          readAt: n.readAt ?? new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("[NotificationBell] Failed to mark all read:", error);
    } finally {
      setMarkingAll(false);
    }
  }, [unreadCount]);

  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={`Notifications${
          unreadCount > 0 ? `, ${unreadCount} unread` : ""
        }`}
        hitSlop={8}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: background ?? theme.surface,
            borderColor: border ?? theme.borderLight,
          },
          Shadows.card,
        ]}
      >
        <Ionicons
          name={unreadCount > 0 ? "notifications" : "notifications-outline"}
          size={22}
          color={iconColor ?? (unreadCount > 0 ? theme.info : theme.text)}
        />

        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{displayCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <Ionicons
                    name="notifications"
                    size={19}
                    color={theme.primary}
                  />
                </View>
                <View>
                  <Text style={styles.title}>Notifications</Text>
                  <Text style={styles.unreadLabel}>
                    {unreadCount > 0
                      ? `${unreadCount} unread ${
                          unreadCount === 1 ? "alert" : "alerts"
                        }`
                      : "All caught up"}
                  </Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={handleMarkAll}
                    disabled={markingAll}
                  >
                    <Text style={styles.markAllText}>
                      {markingAll ? "Marking..." : "Mark all read"}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={closeSheet}
                  accessibilityLabel="Close notifications"
                  style={styles.close}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* List */}
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ ...styles.bodyText, marginTop: 14 }}>
                  Loading notifications...
                </Text>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.centerBox}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={27}
                    color={theme.textMuted}
                  />
                </View>
                <Text style={styles.emptyTitle}>You're all caught up</Text>
                <Text style={styles.bodyText}>
                  New chat messages and campaign alerts will show up here.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ flexGrow: 0 }}
                contentContainerStyle={styles.list}
              >
                {items.map((item) => {
                  const unread = !item.readAt;
                  const color =
                    item.category === "CHAT" ? theme.info : theme.primary;

                  return (
                    <TouchableOpacity
                      key={String(item._id)}
                      activeOpacity={0.82}
                      onPress={() => handlePress(item)}
                      accessibilityLabel={`Open notification: ${item.title}`}
                      style={[
                        styles.card,
                        {
                          borderColor: unread ? theme.border : theme.borderLight,
                        },
                        unread && styles.cardUnread,
                      ]}
                    >
                      <View style={styles.cardTop}>
                        <View
                          style={[
                            styles.cardIcon,
                            {
                              backgroundColor: unread
                                ? theme.primarySoft
                                : theme.surfaceSoft,
                            },
                          ]}
                        >
                          <Ionicons
                            name={iconFor(item.category)}
                            size={19}
                            color={color}
                          />
                        </View>

                        <View style={styles.cardTextWrap}>
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                          {!!item.body && (
                            <Text style={styles.cardBody} numberOfLines={2}>
                              {item.body}
                            </Text>
                          )}
                          <Text style={styles.cardTime}>
                            {formatWhen(item.createdAt)}
                          </Text>
                        </View>

                        {unread && <View style={styles.unreadDot} />}
                      </View>

                      {(item.type === "CHAT_NEW_MESSAGE" ||
                        item.target?.type === "chat") && (
                        <View style={styles.cardAction}>
                          <Text style={{ ...styles.actionText, color }}>
                            Open chat
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={15}
                            color={color}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const theme = Colors.light;

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: theme.error,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.surface,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(1,19,31,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "82%",
    backgroundColor: theme.surface,
    borderRadius: Radius.xl,
    ...Shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flexShrink: 1,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...Typography.h3,
    fontSize: 20,
    color: theme.text,
  },
  unreadLabel: {
    ...Typography.bodySmall,
    color: theme.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  markAllText: {
    ...Typography.labelStrong,
    fontSize: 12.5,
    color: theme.primary,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBox: {
    alignItems: "center",
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.five,
    gap: 6,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    ...Typography.h3,
    fontSize: 17,
    color: theme.text,
  },
  bodyText: {
    ...Typography.bodySmall,
    color: theme.textMuted,
    textAlign: "center",
    maxWidth: 320,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: theme.surface,
    padding: Spacing.three,
    gap: 8,
  },
  cardUnread: {
    backgroundColor: theme.primarySoft,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardTitle: {
    ...Typography.bodyMedium,
    fontWeight: "700",
    color: theme.text,
  },
  cardBody: {
    ...Typography.bodySmall,
    color: theme.textSecondary,
  },
  cardTime: {
    ...Typography.caption,
    color: theme.textMuted,
    marginTop: 2,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.error,
    marginTop: 6,
  },
  cardAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  actionText: {
    ...Typography.labelStrong,
    fontSize: 12,
  },
});
