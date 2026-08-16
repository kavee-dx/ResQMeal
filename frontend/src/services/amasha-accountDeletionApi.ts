import { API_BASE_URL } from "./api";
import { getToken } from "../utils/kaveesha-authStorage";

type ApiResponse = {
  success: boolean;
  message?: string;
};

export async function deleteAccount(password: string): Promise<ApiResponse> {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/api/settings/account/me`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ password }),
  });

  return res.json();
}