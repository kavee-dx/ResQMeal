import api from "./api";
import type { ChatContextType } from "./amasha-chatApi";

// The chat list for the signed-in user, across both room kinds. Backed by
// GET /api/chat/conversations; each entry already carries its last message so
// the list renders previews without opening every room.
export interface ChatConversation {
  contextType: ChatContextType;
  contextId: string;
  /** The other person's user id — required to open the 1-on-1 Chat screen. */
  peerId: string;
  title: string;
  subtitle: string;
  counterpart: string;
  lastMessage: {
    text: string;
    createdAt: string;
    senderName: string;
    fromMe: boolean;
  };
}

export async function getChatConversations(): Promise<ChatConversation[]> {
  const res = await api.get<{
    success: boolean;
    conversations?: ChatConversation[];
  }>("/chat/conversations");

  return res.data.conversations ?? [];
}
