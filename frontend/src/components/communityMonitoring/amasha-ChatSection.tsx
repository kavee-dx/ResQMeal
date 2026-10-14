import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import {
  getChatConversations,
  type ChatConversation,
} from '@/services/amasha-chatListApi';
import { RootStackParamList } from '@/navigation/types';

// NGO side of the campaign chats. getChatConversations already returns every
// campaign room this NGO owns (plus any they wrote in), so we simply keep the
// campaign ones and list them. Tapping a row opens the shared Chat screen on the
// same room the interested user is typing in — both sides, one history.
function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function AmashaChatSection() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const all = await getChatConversations();
      setChats(all.filter((c) => c.contextType === 'campaign'));
    } catch (err) {
      console.error('Failed to load campaign chats', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh each time the dashboard gains focus so a fresh message from an
  // interested user surfaces without the NGO leaving and re-entering.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openChat = (c: ChatConversation) => {
    navigation.navigate('Chat', {
      contextType: 'campaign',
      contextId: c.contextId,
      peerId: c.peerId,
      title: c.title,
      subtitle: `Campaign chat · ${c.counterpart}`,
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Campaign chats</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : failed ? (
        <View style={styles.message}>
          <Text style={styles.messageText}>Could not load your campaign chats.</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.link}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.message}>
          <Text style={styles.messageText}>
            No one has messaged your campaigns yet. The chat opens from the
            “Interested?” button on each campaign post.
          </Text>
        </View>
      ) : (
        chats.map((c) => (
          <TouchableOpacity
            key={`${c.contextId}:${c.peerId}`}
            style={styles.card}
            onPress={() => openChat(c)}
            activeOpacity={0.85}
            accessibilityLabel={`Open chat with ${c.counterpart} about ${c.title}`}
          >
            <View style={styles.cardHead}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.headText}>
                <Text style={styles.title} numberOfLines={1}>
                  {c.counterpart}
                </Text>
                <Text style={styles.when}>{formatWhen(c.lastMessage.createdAt)}</Text>
              </View>
            </View>

            <Text style={styles.threadTitle} numberOfLines={1}>
              {c.title}
            </Text>

            <Text style={styles.preview} numberOfLines={2}>
              {c.lastMessage.fromMe ? 'You: ' : `${c.lastMessage.senderName}: `}
              {c.lastMessage.text}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const makeStyles = (c: (typeof Colors)['light'] | (typeof Colors)['dark']) =>
  StyleSheet.create({
    section: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four },
    heading: { ...Typography.h3, color: c.text, marginBottom: Spacing.three },
    loader: { marginVertical: Spacing.four },
    message: {
      padding: Spacing.three,
      borderRadius: Radius.md,
      backgroundColor: c.surfaceSoft,
      gap: Spacing.two,
    },
    messageText: { ...Typography.body, color: c.textSecondary },
    link: { ...Typography.buttonSmall, color: c.primary },
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.three,
      marginBottom: Spacing.two,
      gap: Spacing.two,
      ...Shadows.card,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    title: { ...Typography.body, color: c.text, flex: 1 },
    threadTitle: { ...Typography.bodySmall, color: c.textMuted },
    when: { ...Typography.bodySmall, color: c.textMuted },
    preview: { ...Typography.bodySmall, color: c.textSecondary },
  });
