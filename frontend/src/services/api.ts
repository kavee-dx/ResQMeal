import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getToken, clearSession } from "../utils/kaveesha-authStorage";
import { PrivacySettings } from "@/types/amasha-privacySettings";
import { NotificationSettings } from "@/types/amasha-notificationSettings";

/* ============================================================
   WHERE IS THE BACKEND?
   ------------------------------------------------------------
   The API always runs on the same computer that serves this app,
   but that computer's LAN address changes every time the Wi-Fi
   changes. A hard-coded IP in .env then quietly breaks every
   request with "Unable to connect to the server", which looks
   exactly like a dead backend.

   So the host is detected at runtime instead:
   • web      → whatever host the browser loaded the app from
   • Expo Go  → the host the phone already used to reach Metro
   • built    → falls back to EXPO_PUBLIC_API_URL (no dev server)

   Escape hatches, both optional, in frontend/.env:
   • EXPO_PUBLIC_API_URL=http://your-host:5000/api  (fallback / pin)
   • EXPO_PUBLIC_API_URL_AUTO=false                 (never autodetect)
   • EXPO_PUBLIC_API_PORT=5000                      (if the API is not on 5000)
   ============================================================ */

const API_PORT = process.env.EXPO_PUBLIC_API_PORT || "5000";

// Only trust a detected host that is a real addressable machine. Tunnel mode
// hands back hosts like `xxx.exp.run`, and a production build hands back
// nothing at all — both must fall through to the configured URL.
function isLanHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".local")) return true;
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host); // IPv4, e.g. 172.28.17.248
}

function detectHost(): string | null {
  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return null;
      return window.location.hostname || null;
    }

    // Metro tells the runtime where it is reachable from. The field moved
    // between SDK versions, so try the known shapes.
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any).manifest?.debuggerHost;

    if (typeof hostUri !== "string") return null;

    return hostUri.split(":")[0] || null;
  } catch {
    // Never let host discovery break the app — fall back to the configured URL.
    return null;
  }
}

function configuredBase(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL || "";
  return raw.replace(/\/api\/?$/i, "").replace(/\/+$/, "");
}

function resolveApiBase(): string {
  const autodetect = process.env.EXPO_PUBLIC_API_URL_AUTO !== "false";
  const host = autodetect ? detectHost() : null;

  if (host && isLanHost(host)) {
    return `http://${host}:${API_PORT}`;
  }

  return configuredBase() || "http://localhost:5000";
}

export const API_BASE_URL = resolveApiBase();

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Attach JWT to every authenticated request.
 */
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Handle expired/invalid authentication.
 */
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      await clearSession();
    }

    return Promise.reject(error);
  },
);

type RegisterPayload = Record<string, unknown>;

type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
} & T;

export async function registerUser(
  payload: RegisterPayload,
): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function verifyAccount(
  email: string,
  code: string,
): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      code,
    }),
  });

  return res.json();
}

export async function resendVerificationCode(
  email: string,
): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/verify/resend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
    }),
  });

  return res.json();
}

export async function requestPasswordReset(
  email: string,
): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getPrivacySettings(): Promise<
  ApiResponse<{ data?: PrivacySettings }>
> {
  const res = await fetch(`${API_BASE_URL}/api/settings/privacy/me`, {
    method: "GET",
    headers: await authHeaders(),
  });
  return res.json();
}

export async function verifyResetOtp(
  email: string,
  code: string,
): Promise<ApiResponse<{ resetToken?: string }>> {
  const res = await fetch(`${API_BASE_URL}/api/auth/verify-reset-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  return res.json();
}

export async function updatePrivacySettings(
  settings: PrivacySettings,
): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/settings/privacy/me`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(settings),
  });
  return res.json();
}

export async function resetPassword(
  resetToken: string,
  newPassword: string,
): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resetToken, newPassword }),
  });
  return res.json();
}

export async function getNotificationSettings(): Promise<
  ApiResponse<{ data?: NotificationSettings }>
> {
  const res = await fetch(`${API_BASE_URL}/api/settings/notifications/me`, {
    method: "GET",
    headers: await authHeaders(),
  });
  return res.json();
}

export async function updateNotificationSettings(
  settings: NotificationSettings,
): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/settings/notifications/me`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(settings),
  });
  return res.json();
}

export default api;