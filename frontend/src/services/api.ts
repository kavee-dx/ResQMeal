import axios from "axios";

const RAW_API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

// Normalize: strip any trailing slash and remove a trailing '/api' if the env included it
export const API_BASE_URL = RAW_API.replace(/\/api\/?$/i, '').replace(/\/+$/, '');

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

type RegisterPayload = Record<string, unknown>;

type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
} & T;

export async function registerUser(payload: RegisterPayload): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function verifyAccount(email: string, code: string): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  return res.json();
}

export async function resendVerificationCode(email: string): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/verify/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export default api;