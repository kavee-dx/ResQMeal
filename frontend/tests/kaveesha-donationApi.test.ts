/**
 * kaveesha-donationApi.test.ts
 * Location: frontend/test/kaveesha-donationApi.test.ts
 */

import {
  createDonation,
  getDonations,
  getDonationById,
  updateDonation,
  deleteDonation,
} from '../src/services/kaveesha-donationApi';
import { emptyDonationForm } from '../src/types/kaveesha-donation.types';

function mockFetchOnce(body: any, ok = true) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    json: async () => body,
  });
}

describe('kaveesha-donationApi', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('createDonation sends a POST with numeric quantity/portions', async () => {
    mockFetchOnce({ success: true, data: { _id: 'd1' } });

    const values = { ...emptyDonationForm, foodType: 'Rice', quantity: '30', numberOfPortions: '30' };
    const result = await createDonation(values);

    expect(result).toEqual({ _id: 'd1' });
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.method).toBe('POST');
    const sentBody = JSON.parse(options.body);
    expect(sentBody.quantity).toBe(30);
    expect(sentBody.numberOfPortions).toBe(30);
  });

  it('getDonations requests without a query string when no status is given', async () => {
    mockFetchOnce({ success: true, data: [] });
    await getDonations();
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).not.toContain('?status=');
  });

  it('getDonations omits the query string for status="all"', async () => {
    mockFetchOnce({ success: true, data: [] });
    await getDonations('all');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).not.toContain('?status=');
  });

  it('getDonations appends a status filter when provided', async () => {
    mockFetchOnce({ success: true, data: [] });
    await getDonations('active');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('?status=active');
  });

  it('getDonationById requests the correct path', async () => {
    mockFetchOnce({ success: true, data: { _id: 'd1' } });
    await getDonationById('d1');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/donor/donations/d1');
  });

  it('updateDonation sends a PATCH with only the changed fields', async () => {
    mockFetchOnce({ success: true, data: { _id: 'd1', quantity: 25 } });
    await updateDonation('d1', { quantity: '25' });

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/donor/donations/d1');
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body)).toEqual({ quantity: 25 });
  });

  it('updateDonation converts numberOfPortions to a number when present', async () => {
    mockFetchOnce({ success: true, data: { _id: 'd1' } });
    await updateDonation('d1', { numberOfPortions: '12' });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(options.body).numberOfPortions).toBe(12);
  });

  it('deleteDonation sends a DELETE request to the right path', async () => {
    mockFetchOnce({ success: true, data: { _id: 'd1' } });
    await deleteDonation('d1');

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/donor/donations/d1');
    expect(options.method).toBe('DELETE');
  });

  it('throws with the server message when success: false', async () => {
    mockFetchOnce({ success: false, message: 'Nope, not allowed' });
    await expect(getDonationById('d1')).rejects.toThrow('Nope, not allowed');
  });

  it('throws when the HTTP response itself is not ok', async () => {
    mockFetchOnce({ message: 'Server error' }, false);
    await expect(getDonationById('d1')).rejects.toThrow('Server error');
  });
});