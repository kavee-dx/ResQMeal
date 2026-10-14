import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getChatConversations,
  type ChatConversation,
} from "../services/amasha-chatListApi";
import { colors, fonts } from "../styles/kaveesha-theme";

// The one chat list shared by every role. It reads GET /api/chat/conversations,
// which already knows which rooms belong to this user: a donor's rescue chats,
// a recipient's chats for donations they asked for, and an NGO's campaign chats
// (plus any campaign they joined as an interested user). Tapping a row opens the
// existing Chat screen on that room, so the saved history loads exactly where the
// other side is chatting.
function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function ChatListScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [items, setItems] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await getChatConversations();
      setItems(list);
    } catch {
      setError("Could not load your chats. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever the screen gains focus, so a new message the other side
  // just sent is reflected in the preview as soon as the user returns here.
  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openChat = (c: ChatConversation) => {
    navigation.navigate("Chat", {
      contextType: c.contextType,
      contextId: c.contextId,
      peerId: c.peerId,
      title: c.title,
      subtitle: c.counterpart ? `Chat · ${c.counterpart}` : c.subtitle,
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>My Chats</Text>
          <Text style={styles.headerSubtitle}>
            Rescue and campaign conversations
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons name="chatbubbles-outline" size={19} color={colors.primary} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Loading your chats…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.contextType}:${item.contextId}:${item.peerId}`}
          contentContainerStyle={items.length === 0 ? styles.emptyWrap : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={error ? "cloud-offline-outline" : "chatbubbles-outline"}
                  size={30}
                  color={error ? colors.urgent : colors.primary}
                />
              </View>
              <Text style={styles.emptyText}>
                {error ??
                  "No chats yet. When you message a donor about your request, or talk to an NGO about a campaign, the conversation shows up here."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => openChat(item)}
              activeOpacity={0.85}
              accessibilityLabel={`Open chat about ${item.title}`}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor:
                      item.contextType === "donation" ? "#EAF8F1" : "#FFF5E8",
                  },
                ]}
              >
                <Ionicons
                  name={
                    item.contextType === "donation"
                      ? "restaurant-outline"
                      : "megaphone-outline"
                  }
                  size={20}
                  color={item.contextType === "donation" ? colors.success : colors.accent}
                />
              </View>

              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.when}>
                    {formatWhen(item.lastMessage.createdAt)}
                  </Text>
                </View>

                <Text style={styles.counterpart} numberOfLines={1}>
                  {item.counterpart}
                </Text>

                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessage.fromMe
                    ? "You: "
                    : `${item.lastMessage.senderName}: `}
                  {item.lastMessage.text}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  centerText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  when: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  counterpart: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.info,
  },
  preview: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
