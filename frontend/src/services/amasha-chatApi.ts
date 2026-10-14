import api from "./api";

// Chat history and sending for the in-app 1-on-1 chat rooms. Realtime delivery
// is handled by amasha-chatSocket.ts; these calls are the persisted source of
// truth, so a conversation always loads its full history even after an app restart.
export type ChatContextType = "donation" | "campaign";

export interface ChatMessage {
  id: string;
  contextType: ChatContextType;
  contextId: string;
  peerId?: string;
  text: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
  };
}

// GET /api/chat/:contextType/:contextId/messages?peerId=<id>
// Loads the message history for the 1-on-1 conversation between me and peerId.
export async function getChatMessages(
  contextType: ChatContextType,
  contextId: string,
  peerId: string,
  before?: string,
): Promise<ChatMessage[]> {
  const params: Record<string, string> = { peerId };
  if (before) params.before = before;

  const res = await api.get<{
    success: boolean;
    messages?: ChatMessage[];
  }>(`/chat/${contextType}/${contextId}/messages`, { params });

  return res.data.messages ?? [];
}

// POST /api/chat/:contextType/:contextId/messages  (body includes peerId)
export async function sendChatMessage(
  contextType: ChatContextType,
  contextId: string,
  peerId: string,
  text: string,
): Promise<ChatMessage> {
  const res = await api.post<{
    success: boolean;
    message?: ChatMessage;
  }>(`/chat/${contextType}/${contextId}/messages`, {
    peerId,
    text,
  });

  if (!res.data.message) {
    throw new Error("Chat did not return the saved message.");
  }

  return res.data.message;
}
