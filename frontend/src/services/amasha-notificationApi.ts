import api from "./api";

/**
 * Client for the backend's persisted notification feed
 * (amasha-notificationRoutes: /api/notifications).
 *
 * Chat messages, campaign alerts and other events are stored here, so every
 * role's home screen can show a "notifications section" like the donor's
 * expiry-alert bell.
 */

export interface AppNotificationData {
  // CHAT_NEW_MESSAGE carries the ids needed to open the exact 1-on-1 thread
  contextType?: "donation" | "campaign";
  contextId?: string;
  senderId?: string;
  senderName?: string;
  text?: string;
  title?: string;
  [key: string]: unknown;
}

export interface AppNotification {
  _id: string;
  type: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  target?: { type?: string; id?: string };
  data?: AppNotificationData;
  readAt: string | null;
  createdAt: string;
}

export async function getAppNotifications(
  options: { limit?: number; category?: string; unread?: boolean } = {},
): Promise<AppNotification[]> {
  const params: Record<string, string | number> = {};

  if (options.limit) params.limit = options.limit;
  if (options.category) params.category = options.category;
  if (options.unread) params.unread = "true";

  const res = await api.get("/notifications", { params });

  return (res.data?.items ?? []) as AppNotification[];
}

export async function getAppUnreadCount(): Promise<number> {
  const res = await api.get("/notifications/unread-count");

  return Number(res.data?.count) || 0;
}

export async function markAppNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllAppNotificationsRead(): Promise<number> {
  const res = await api.patch("/notifications/read-all");

  return Number(res.data?.updated) || 0;
}
