import api from './api';
import type { AnyProfile } from '@/types/dilshara-profileTypes';

// TEMPORARY — replace with the real logged-in user's ID once login/JWT exists
const TEMP_USER_ID = '6a7ed78337612444247021a5'; // Dushani's test RECIPIENT account, swap as needed

export async function getMyProfile(): Promise<AnyProfile> {
  const response = await api.get('/profile', {
    headers: { 'x-user-id': TEMP_USER_ID },
  });
  return response.data.profile;
}

export async function updateMyProfile(updates: Partial<AnyProfile>): Promise<AnyProfile> {
  const response = await api.patch('/profile', updates, {
    headers: { 'x-user-id': TEMP_USER_ID },
  });
  return response.data.profile;
}