import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import DonationCard from './dushani-donationCard';
import type { BrowseDonation } from '../services/dushani-foodRequestApi';

// Sprint item 39 — asking a donor for their donation happens right on the card,
// and the card shows the server's reason inline when the ask is refused.
function donation(overrides: Partial<BrowseDonation> = {}): BrowseDonation {
  return {
    id: 'don1',
    donationCode: 'RQ-1001',
    foodType: 'Cooked rice',
    foodCategory: 'Rice',
    foodGroup: 'Rice',
    photoUrl: null,
    quantity: 10,
    numberOfPortions: 30,
    storageCondition: 'Refrigerated',
    pickupAddress: 'No. 12, Hill Road, Colombo 03',
    pickupDistrict: 'Colombo',
    pickupWindowStart: null,
    expiryTime: new Date(Date.now() + 6 * 3_600_000).toISOString(),
    status: 'active',
    readyWhen: 'Ready to collect now',
    distanceLabel: 'Same district (Colombo)',
    distanceTier: 0,
    inOwnDistrict: true,
    donorName: "Nimal's Kitchen",
    answering: {
      requestId: 'req1',
      requestFood: 'Cooked Rice',
      urgency: 'URGENT',
      urgent: true,
      score: 82,
      percent: 82,
      reasons: ['Same district as your pickup'],
    },
    asked: false,
    ...overrides,
  };
}

async function renderCard(props: Partial<React.ComponentProps<typeof DonationCard>> = {}) {
  const onAsk = jest.fn(async (_note: string) => undefined);
  const onToggle = jest.fn();
  await render(
    <DonationCard
      donation={donation()}
      expanded
      onToggle={onToggle}
      onAsk={onAsk}
      {...props}
    />,
  );
  return { onAsk, onToggle };
}

describe('donation card — asking the donor', () => {
  it('offers the ask on a donation nobody has asked for', async () => {
    await renderCard();
    expect(screen.getByText("Ask Nimal's Kitchen for this")).toBeTruthy();
    expect(screen.queryByText(/Donor messaging is not built/)).toBeNull();
  });

  it('sends the note the recipient typed', async () => {
    const { onAsk } = await renderCard();

    await fireEvent.press(screen.getByLabelText('Ask this donor for the donation'));
    await fireEvent.changeText(screen.getByLabelText('Note to the donor'), 'We feed 40 children.');
    await fireEvent.press(screen.getByLabelText('Send ask'));

    await waitFor(() => expect(onAsk).toHaveBeenCalledTimes(1));
    expect(onAsk.mock.calls[0][0]).toBe('We feed 40 children.');
  });

  it('says the ask is already with the donor', async () => {
    await renderCard({ donation: donation({ asked: true }) });
    expect(screen.getByLabelText('Ask already sent')).toBeTruthy();
    expect(screen.getByLabelText('Change your ask')).toBeTruthy();
  });

  it('keeps the note optional', async () => {
    const { onAsk } = await renderCard();

    await fireEvent.press(screen.getByLabelText('Ask this donor for the donation'));
    await fireEvent.press(screen.getByLabelText('Send ask'));

    await waitFor(() => expect(onAsk).toHaveBeenCalledTimes(1));
    expect(onAsk.mock.calls[0][0]).toBe('');
  });

  it('shows the server’s reason when the ask is refused', async () => {
    const onAsk = jest.fn(async () => {
      throw { response: { data: { message: 'Another recipient has already been given this donation' } } };
    });
    await renderCard({ onAsk });

    await fireEvent.press(screen.getByLabelText('Ask this donor for the donation'));
    await fireEvent.press(screen.getByLabelText('Send ask'));

    expect(
      await screen.findByText('Another recipient has already been given this donation'),
    ).toBeTruthy();
    // Still offered, because nothing was sent.
    expect(screen.queryByLabelText('Ask already sent')).toBeNull();
  });

  it('stays quiet when the card is collapsed', async () => {
    await renderCard({ expanded: false });
    expect(screen.queryByLabelText('Ask this donor for the donation')).toBeNull();
    expect(screen.getByText('Cooked rice')).toBeTruthy();
  });
});
