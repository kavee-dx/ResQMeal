/**
 * kaveesha-DonationStatusBadge.test.tsx
 * Location: frontend/test/kaveesha-DonationStatusBadge.test.tsx
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DonationStatusBadge from '../src/components/kaveesha-DonationStatusBadge';
import { DonationStatus } from '../src/types/kaveesha-donation.types';

describe('DonationStatusBadge', () => {
  const cases: [DonationStatus, string][] = [
    ['pending', 'Pending'],
    ['active', 'Active'],
    ['expiring', 'Expiring Soon'],
    ['completed', 'Completed'],
    ['cancelled', 'Cancelled'],
  ];

  it.each(cases)('renders the correct label for status "%s"', (status, label) => {
    render(<DonationStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});