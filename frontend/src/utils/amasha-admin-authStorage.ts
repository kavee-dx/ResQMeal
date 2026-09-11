import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_TOKEN_KEY = 'resqmeal_admin_token';
const ADMIN_NAME_KEY = 'resqmeal_admin_fullName';

export async function saveAdminSession(token: string, fullName: string) {
  await AsyncStorage.multiSet([
    [ADMIN_TOKEN_KEY, token],
    [ADMIN_NAME_KEY, fullName ?? ''],
  ]);
}

export async function getAdminSession(): Promise<{
  token: string | null;
  fullName: string | null;
}> {
  const values = await AsyncStorage.multiGet([ADMIN_TOKEN_KEY, ADMIN_NAME_KEY]);
  const map = Object.fromEntries(values);
  return {
    token: map[ADMIN_TOKEN_KEY] ?? null,
    fullName: map[ADMIN_NAME_KEY] ?? null,
  };
}

export async function clearAdminSession() {
  await AsyncStorage.multiRemove([ADMIN_TOKEN_KEY, ADMIN_NAME_KEY]);
}