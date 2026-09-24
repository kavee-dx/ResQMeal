import api from './api';

export interface AvailabilityPayload {
  availabilityStatus: 'AVAILABLE' | 'UNAVAILABLE';
  availableDays: string[];
  availableFrom: string;
  availableTo: string;
}

export async function getAvailability(): Promise<AvailabilityPayload> {
  const response = await api.get('/volunteer-profile/availability');
  return response.data;
}

export async function updateAvailability(
  payload: AvailabilityPayload
): Promise<AvailabilityPayload> {
  const response = await api.patch('/volunteer-profile/availability', payload);
  return response.data.availability;
}