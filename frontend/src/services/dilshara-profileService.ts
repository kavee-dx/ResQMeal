import api from './api';
import type { AnyProfile } from '@/types/dilshara-profileTypes';

export async function getMyProfile(): Promise<AnyProfile> {
  const response = await api.get('/profile');
  return response.data.profile;
}

export async function updateMyProfile(updates: Partial<AnyProfile>): Promise<AnyProfile> {
  const response = await api.patch('/profile', updates);
  return response.data.profile;
}