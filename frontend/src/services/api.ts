import axios from "axios";
import { getToken, clearSession } from "../utils/kaveesha-authStorage";
import { PrivacySettings } from "@/types/amasha-privacySettings";
import { NotificationSettings } from "@/types/amasha-notificationSettings";

const RAW_API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

export const API_BASE_URL = RAW_API.replace(/\/api\/?$/i, "").replace(
  /\/+$/,
  "",
);

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
export async function getNotificationSettings(): Promise<ApiResponse<{ data?: NotificationSettings }>> {
  const res = await fetch(`${API_BASE_URL}/api/settings/notifications/me`, {
    method: "GET",
    headers: await authHeaders(),
  });
  return res.json();
}
 
export async function updateNotificationSettings(
  settings: NotificationSettings
): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/settings/notifications/me`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(settings),
  });
  return res.json();
}

export default api;
