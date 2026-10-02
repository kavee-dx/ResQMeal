import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import RecipientAskPanel from './dushani-recipientAskPanel';
import { getDonationAsks } from '../services/dushani-foodRequestApi';
import type { DonationAsk } from '../services/dushani-foodRequestApi';

jest.mock('../services/dushani-foodRequestApi', () => ({
  getDonationAsks: jest.fn(),
}));

// The panel refreshes on screen focus; outside a navigator that hook needs the
// navigation context, so the test runs the callback once per mount — exactly
// what a focus does for a component whose load callback is stable.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require('react');
    React.useEffect(callback, [callback]);
  },
}));

const load = jest.mocked(getDonationAsks);

function ask(overrides: Partial<DonationAsk> = {}): DonationAsk {
  return {
    id: 'ask1',
    recipientId: 'u1',
    recipientName: 'Lighthouse Home',
    note: 'We feed 40 children every evening.',
    askedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    requestId: 'req1',
    need: 'Cooked Rice',
    quantity: 'Cooked Rice - 6 packets',
    area: 'No. 24, Galle Road, Colombo 03',
    urgency: 'URGENT',
    neededBy: null,
    stillWaiting: true,
    ...overrides,
  };
}

async function renderPanel() {
  await render(<RecipientAskPanel donationId="don1" />);
  await waitFor(() => expect(load).toHaveBeenCalledWith('don1'));
}

describe('recipient asks panel — what the donor sees', () => {
  // Only this call mock is reset — jest.resetAllMocks() also wipes the asset
  // stubs jest-expo installs for @expo/vector-icons, which breaks rendering.
  beforeEach(() => load.mockReset());

  it('names each recipient and what they need', async () => {
    load.mockResolvedValue({
      donationId: 'don1',
      donationCode: 'RQ-1001',
      count: 2,
      requests: [
        ask(),
        ask({
          id: 'ask2',
          recipientName: 'Tharushi Fernando',
          urgency: 'NORMAL',
          note: 'Single mother of three in Colombo 05.',
          // A chosen time reads as that moment, not "right away".
          neededBy: new Date(Date.now() + 20 * 3_600_000).toISOString(),
          askedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
        }),
      ],
    });
    await renderPanel();

    expect(screen.getByText('2 recipients asked for this donation')).toBeTruthy();
    expect(screen.getByText('Lighthouse Home')).toBeTruthy();
    expect(screen.getByText('Tharushi Fernando')).toBeTruthy();
    expect(screen.getAllByText('Cooked Rice · Cooked Rice - 6 packets')).toHaveLength(2);
    expect(screen.getByText('“We feed 40 children every evening.”')).toBeTruthy();
    expect(screen.getByText('“Single mother of three in Colombo 05.”')).toBeTruthy();
    // Only the urgent ask carries the flag.
    expect(screen.getAllByText('URGENT')).toHaveLength(1);
    expect(screen.getByText('Needed right away')).toBeTruthy();
    expect(screen.getByText(/^Needed (Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d+ \w{3}, \d/)).toBeTruthy();
    expect(screen.getByText(/40 min ago/)).toBeTruthy();
    expect(screen.getByText('3 hours ago')).toBeTruthy();
  });

  it('says nothing has been asked yet', async () => {
    load.mockResolvedValue({ donationId: 'don1', donationCode: null, count: 0, requests: [] });
    await renderPanel();

    expect(screen.getByText(/No recipient has asked for this donation yet/)).toBeTruthy();
  });

  it('marks an ask whose request has since closed', async () => {
    load.mockResolvedValue({
      donationId: 'don1',
      donationCode: null,
      count: 1,
      requests: [ask({ stillWaiting: false })],
    });
    await renderPanel();

    expect(screen.getByText('That request has since closed — it no longer needs food')).toBeTruthy();
    expect(screen.queryByText('URGENT')).toBeNull();
  });

  it('hides itself when the caller cannot read the asks', async () => {
    load.mockRejectedValue({ response: { status: 403 } });
    await renderPanel();

    expect(screen.queryByText(/recipient/i)).toBeNull();
  });

  it('offers a retry when the check fails', async () => {
    load.mockRejectedValue(new Error('network'));
    await renderPanel();

    expect(screen.getByText('Could not load the recipient asks just now.')).toBeTruthy();
    expect(screen.getByLabelText('Try again')).toBeTruthy();
  });
});
