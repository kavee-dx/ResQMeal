import api from './api';

export interface DeliveryPreferences {
  preferredDeliveryArea: string;
  preferredDeliveryTime: string;
  maxDeliveryDistance: number | null;
  location: {
    latitude: number | null;
    longitude: number | null;
  };
}

export interface DeliveryPreferencesPayload {
  preferredDeliveryArea: string;
  preferredDeliveryTime?: string;
  maxDeliveryDistance: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export async function getDeliveryPreferences(): Promise<DeliveryPreferences> {
  const response = await api.get('/volunteer-profile/delivery-preferences');
  const data = response.data;

  return {
    preferredDeliveryArea: data.preferredDeliveryArea ?? '',
    preferredDeliveryTime: data.preferredDeliveryTime ?? '',
    maxDeliveryDistance: data.maxDeliveryDistance ?? null,
    location: {
      latitude: data.location?.latitude ?? null,
      longitude: data.location?.longitude ?? null,
    },
  };
}

export async function updateDeliveryPreferences(
  payload: DeliveryPreferencesPayload
): Promise<DeliveryPreferences> {
  const response = await api.patch('/volunteer-profile/delivery-preferences', payload);
  return response.data.preferences;
}