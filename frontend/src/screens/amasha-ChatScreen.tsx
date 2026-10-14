import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getChatMessages,
  sendChatMessage,
  type ChatMessage,
} from "../services/amasha-chatApi";
import {
  joinChatRoom,
  leaveChatRoom,
  onChatMessage,
} from "../services/amasha-chatSocket";
import { getToken } from "../utils/kaveesha-authStorage";
import { colors, fonts } from "../styles/kaveesha-theme";

type ChatRouteParams = {
  contextType?: "donation" | "campaign";
  contextId?: string;
  peerId?: string;
  title?: string;
  subtitle?: string;
};

async function resolveMyUserId(): Promise<string | null> {
  try {
    const token = await getToken();
    if (!token) return null;
    const payload = token.split(".")[1];
    const decoded = JSON.parse(
      decodeURIComponent(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
      ),
    );
    return decoded?.id ?? null;
  } catch {
    return null;
  }
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();

  const params = (route.params || {}) as ChatRouteParams;

  const contextType = params.contextType ?? "donation";
  const contextId = params.contextId ?? "";
  const peerId = params.peerId ?? "";
  const title = params.title ?? "Chat";
  const subtitle =
    params.subtitle ??
    (contextType === "donation"
      ? "Rescue chat"
      : "Campaign chat");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [joined, setJoined] = useState(false);

  const knownIds = useRef<Set<string>>(new Set());
  const detachMessageListener = useRef<(() => void) | null>(
    null,
  );

  const listData = useMemo(
    () => [...messages].reverse(),
    [messages],
  );

  const appendMessages = useCallback(
    (incoming: ChatMessage[]) => {
      setMessages((previous) => {
        const fresh = incoming.filter(
          (message) => !knownIds.current.has(message.id),
        );
        if (!fresh.length) return previous;
        fresh.forEach((message) =>
          knownIds.current.add(message.id),
        );
        return [...previous, ...fresh].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        );
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      if (!contextId || !peerId) {
        setLoadError("This chat could not be opened.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const [history, userId] = await Promise.all([
          getChatMessages(contextType, contextId, peerId),
          resolveMyUserId(),
        ]);

        if (cancelled) return;

        knownIds.current = new Set(
          history.map((message) => message.id),
        );
        setMessages(history);
        setMyId(userId);

        await joinChatRoom(contextType, contextId, peerId);
        if (cancelled) {
          await leaveChatRoom();
          return;
        }
        setJoined(true);

        // Subscribe only after the socket exists and the room join was
        // acknowledged, otherwise early messages would be missed.
        // Messages also arrive through the personal user:<id> room (which
        // survives socket reconnects), so filter strictly to this thread:
        // same context AND written by my peer (or by me, deduped below).
        detachMessageListener.current = onChatMessage(
          (message) => {
            if (
              message.contextType !== contextType ||
              message.contextId !== contextId
            ) {
              return;
            }
            if (
              userId &&
              message.sender.id !== peerId &&
              message.sender.id !== userId
            ) {
              return;
            }
            appendMessages([message]);
          },
        );
      } catch (error) {
        if (cancelled) return;
        console.error("[Chat] Failed to open chat:", error);
        setLoadError(
          "Could not open this chat. Please try again.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setup();

    return () => {
      cancelled = true;
      detachMessageListener.current?.();
      detachMessageListener.current = null;
      leaveChatRoom();
    };
  }, [contextType, contextId, peerId, appendMessages]);

  const loadEarlier = async () => {
    const oldest = messages[0];
    if (!oldest || sending) return;

    try {
      const older = await getChatMessages(
        contextType,
        contextId,
        peerId,
        oldest.createdAt,
      );
      appendMessages(older);
    } catch (error) {
      console.error("[Chat] Failed to load earlier:", error);
    }
  };

  const handleSend = async () => {
    const text = input.trim();

    if (!text || sending || !contextId || !peerId) return;

    setInput("");
    setSending(true);

    try {
      const saved = await sendChatMessage(
        contextType,
        contextId,
        peerId,
        text,
      );
      appendMessages([saved]);
    } catch (error) {
      console.error("[Chat] Send failed:", error);
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: ChatMessage;
    index: number;
  }) => {
    const mine = myId !== null && item.sender.id === myId;
    const older = listData[index + 1];
    const showDayChip =
      !older || !sameDay(new Date(item.createdAt), new Date(older.createdAt));

    return (
      <View>
        {showDayChip ? (
          <View style={styles.dayChipRow}>
            <View style={styles.dayChip}>
              <Text style={styles.dayChipText}>
                {dayLabel(item.createdAt)}
              </Text>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.bubbleRow,
            mine && styles.bubbleRowMine,
          ]}
        >
          <View
            style={[
              styles.bubble,
              mine ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          >
            {!mine ? (
              <Text style={styles.senderName}>
                {item.sender.name}
              </Text>
            ) : null}

            <Text
              style={[
                styles.bubbleText,
                mine
                  ? styles.bubbleTextMine
                  : styles.bubbleTextTheirs,
              ]}
            >
              {item.text}
            </Text>

            <Text
              style={[
                styles.timeText,
                mine && styles.timeTextMine,
              ]}
            >
              {timeLabel(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "bottom"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primaryDark}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>

          <Text
            style={styles.headerSubtitle}
            numberOfLines={1}
          >
            {joined
              ? subtitle
              : "Connecting…"}
          </Text>
        </View>

        <View
          style={[
            styles.headerIcon,
            {
              backgroundColor:
                contextType === "donation"
                  ? "#EAF8F1"
                  : "#FFF5E8",
            },
          ]}
        >
          <Ionicons
            name={
              contextType === "donation"
                ? "chatbubbles-outline"
                : "megaphone-outline"
            }
            size={19}
            color={
              contextType === "donation"
                ? colors.success
                : colors.accent
            }
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
          <Text style={styles.centerText}>
            Loading chat history…
          </Text>
        </View>
      ) : loadError ? (
        <View style={styles.centerState}>
          <View style={styles.centerIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          <Text style={styles.centerTitle}>
            Chat unavailable
          </Text>

          <Text style={styles.centerText}>
            {loadError}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={
            Platform.OS === "ios" ? "padding" : undefined
          }
        >
          <FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            inverted
            onStartReached={loadEarlier}
            onStartReachedThreshold={0.2}
          />

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              editable={!sending}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || sending) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!input.trim() || sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  flex: {
    flex: 1,
  },

  header: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  headerText: {
    flex: 1,
    marginHorizontal: 12,
  },

  headerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: "#FFFFFF",
  },

  headerSubtitle: {
    marginTop: 2,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: "rgba(255,255,255,0.68)",
  },

  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  dayChipRow: {
    alignItems: "center",
    marginVertical: 12,
  },

  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  dayChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.4,
  },

  bubbleRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  bubbleRowMine: {
    justifyContent: "flex-end",
  },

  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 5,
  },

  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 5,
  },

  senderName: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
    marginBottom: 3,
  },

  bubbleText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },

  bubbleTextMine: {
    color: "#FFFFFF",
  },

  bubbleTextTheirs: {
    color: colors.textPrimary,
  },

  timeText: {
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
    fontSize: 9.5,
    color: colors.textMuted,
    alignSelf: "flex-end",
  },

  timeTextMine: {
    color: "rgba(255,255,255,0.72)",
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },

  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },

  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  centerIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  centerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 6,
  },

  centerText: {
    marginTop: 6,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
});
