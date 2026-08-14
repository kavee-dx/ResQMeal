// frontend/src/utils/kaveesha-authStorage.ts

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "resqmeal_auth_token";
const ROLE_KEY = "resqmeal_user_role";

export type StoredRole =
  | "DONOR"
  | "RECIPIENT"
  | "NGO"
  | "VOLUNTEER";

async function setSecureItem(
  key: string,
  value: string,
): Promise<void> {
  if (Platform.OS === "web") {
    // Temporary web fallback.
    // Native Android/iOS use SecureStore.
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getSecureItem(
  key: string,
): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function deleteSecureItem(
  key: string,
): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

/**
 * Save the JWT and user role after successful login.
 */
export async function saveSession(
  token: string,
  role: StoredRole,
): Promise<void> {
  if (!token) {
    throw new Error("Cannot save an empty authentication token.");
  }

  await setSecureItem(TOKEN_KEY, token);
  await setSecureItem(ROLE_KEY, role);
}

/**
 * Get the saved JWT.
 */
export async function getToken(): Promise<string | null> {
  return getSecureItem(TOKEN_KEY);
}

/**
 * Get the saved user role.
 */
export async function getRole(): Promise<StoredRole | null> {
  const role = await getSecureItem(ROLE_KEY);

  if (
    role === "DONOR" ||
    role === "RECIPIENT" ||
    role === "NGO" ||
    role === "VOLUNTEER"
  ) {
    return role;
  }

  return null;
}

/**
 * Remove the current login session.
 */
export async function clearSession(): Promise<void> {
  await deleteSecureItem(TOKEN_KEY);
  await deleteSecureItem(ROLE_KEY);
}

/**
 * Check whether a token currently exists.
 */
export async function hasSession(): Promise<boolean> {
  const token = await getToken();
  return Boolean(token);
}