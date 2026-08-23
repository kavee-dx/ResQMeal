import { Donation, DonationFormValues } from '@/types/kaveesha-donation.types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const json = await res.json();

  if (!res.ok || json.success === false) {
    throw new Error(json.message || 'Request failed');
  }

  return json.data as T;
}

export function createDonation(values: DonationFormValues): Promise<Donation> {
  return request<Donation>('/donor/donations', {
    method: 'POST',
    body: JSON.stringify({
      ...values,
      quantity: Number(values.quantity),
      numberOfPortions: Number(values.numberOfPortions),
    }),
  });
}

export function getDonations(status?: string): Promise<Donation[]> {
  const query = status && status !== 'all' ? `?status=${status}` : '';
  return request<Donation[]>(`/donor/donations${query}`);
}

export function getDonationById(id: string): Promise<Donation> {
  return request<Donation>(`/donor/donations/${id}`);
}