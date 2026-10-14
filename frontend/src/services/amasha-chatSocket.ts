import { io, Socket } from "socket.io-client";

import { API_BASE_URL } from "./api";
import { getToken } from "../utils/kaveesha-authStorage";
import type {
  ChatContextType,
  ChatMessage,
} from "./amasha-chatApi";

// Shape of the payload the backend pushes on `amasha:notification:new`
// when the peer sends a message in this user's 1-on-1 conversation.
export interface ChatNotificationPayload {
  type: string;
  contextType: ChatContextType;
  contextId: string;
  /** The sender's user id — the peer who just wrote in. */
  peerId?: string;
  title: string;
  body: string;
  createdAt: string;
}

// One shared socket for the whole app. The JWT travels in the handshake so
// the server repeats its room access check before letting a client join.
let socket: Socket | null = null;
let connectPromise: Promise<Socket> | null = null;

async function getChatSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  if (!connectPromise) {
    connectPromise = (async () => {
      const token = await getToken();

      const created = io(API_BASE_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
      });

      await new Promise<void>((resolve, reject) => {
        created.once("connect", () => resolve());
        created.once("connect_error", (error) => {
          connectPromise = null;
          reject(error);
        });
      });

      socket = created;
      return created;
    })();
  }

  return connectPromise;
}

// Call once at app startup (once auth is confirmed) to keep the socket alive
// globally. The backend automatically joins this connection to user:<id>, so
// notifications arrive even when the user is not in any ChatScreen.
export async function connectGlobalSocket(): Promise<void> {
  try {
    await getChatSocket();
  } catch {
    // Connection errors are silent — the joinChatRoom call will retry later.
  }
}

// Disconnect and reset the singleton. Call on logout.
export function disconnectGlobalSocket(): void {
  socket?.disconnect();
  socket = null;
  connectPromise = null;
}

export async function joinChatRoom(
  contextType: ChatContextType,
  contextId: string,
  peerId: string,
): Promise<void> {
  const active = await getChatSocket();

  await new Promise<void>((resolve, reject) => {
    active
      .timeout(8000)
      .emit(
        "amasha:chat:join",
        { contextType, contextId, peerId },
        (err: unknown, ack?: { success: boolean }) => {
          if (err || !ack?.success) {
            reject(new Error("Could not join the chat room."));
            return;
          }
          resolve();
        },
      );
  });
}

export async function leaveChatRoom(): Promise<void> {
  if (socket?.connected) {
    socket.emit("amasha:chat:leave");
  }
}

// Attach a handler to the shared socket even when it has not finished
// connecting yet — screens that mount before App's connectGlobalSocket()
// resolve would otherwise subscribe to nothing (socket was null).
function attachToChatSocket(
  event: string,
  handler: (payload: any) => void,
): () => void {
  let target: Socket | null = null;
  let disposed = false;

  const bind = (active: Socket) => {
    if (disposed) return;
    target = active;
    active.on(event, handler);
  };

  if (socket) bind(socket);
  else getChatSocket().then(bind).catch(() => {});

  return () => {
    disposed = true;
    target?.off(event, handler);
  };
}

export function onChatMessage(
  handler: (message: ChatMessage) => void,
): () => void {
  return attachToChatSocket("amasha:chat:message", handler);
}

// Subscribe to realtime new-message notifications (fires even when the user
// is NOT inside a ChatScreen). Returns an unsubscribe function.
export function onNewNotification(
  handler: (payload: ChatNotificationPayload) => void,
): () => void {
  return attachToChatSocket("amasha:notification:new", handler);
}
