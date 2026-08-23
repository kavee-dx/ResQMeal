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

// ---------- CREATE ----------
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

// ---------- READ ----------
export function getDonations(status?: string): Promise<Donation[]> {
  const query = status && status !== 'all' ? `?status=${status}` : '';
  return request<Donation[]>(`/donor/donations${query}`);
}

export function getDonationById(id: string): Promise<Donation> {
  return request<Donation>(`/donor/donations/${id}`);
}

// ---------- UPDATE ----------
/**
 * Partial update — only send the fields that actually changed.
 * e.g. updateDonation(donation._id, { quantity: '25' })
 */
export function updateDonation(
  id: string,
  changes: Partial<DonationFormValues>
): Promise<Donation> {
  const payload: Record<string, unknown> = { ...changes };
  if (changes.quantity !== undefined) payload.quantity = Number(changes.quantity);
  if (changes.numberOfPortions !== undefined) payload.numberOfPortions = Number(changes.numberOfPortions);

  return request<Donation>(`/donor/donations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ---------- DELETE ----------
export function deleteDonation(id: string): Promise<{ _id: string }> {
  return request<{ _id: string }>(`/donor/donations/${id}`, {
    method: 'DELETE',
  });
}