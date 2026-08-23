/**
 * kaveesha-MyDonationsScreen.test.tsx
 * Location: frontend/test/kaveesha-MyDonationsScreen.test.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import MyDonationsScreen from '../src/screens/kaveesha-MyDonationsScreen';
import { getDonations } from '../src/services/kaveesha-donationApi';

jest.mock('../src/services/kaveesha-donationApi', () => ({
  getDonations: jest.fn(),
}));

function renderScreen() {
  return render(
    <NavigationContainer>
      <MyDonationsScreen />
    </NavigationContainer>
  );
}

const sampleDonations = [
  {
    _id: 'd1',
    foodType: 'Rice & Curry',
    numberOfPortions: 30,
    expiryTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
  {
    _id: 'd2',
    foodType: 'Bread',
    numberOfPortions: 20,
    expiryTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  },
];

describe('MyDonationsScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders donations returned from the API', async () => {
    (getDonations as jest.Mock).mockResolvedValue(sampleDonations);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Rice & Curry')).toBeTruthy();
      expect(screen.getByText('Bread')).toBeTruthy();
    });
  });

  it('shows an empty state when there are no donations', async () => {
    (getDonations as jest.Mock).mockResolvedValue([]);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('No donations in this category yet.')).toBeTruthy();
    });
  });

  it('loads with the "all" filter by default', async () => {
    (getDonations as jest.Mock).mockResolvedValue([]);
    renderScreen();

    await waitFor(() => expect(getDonations).toHaveBeenCalledWith('all'));
  });

  it('refetches with the selected status filter when a pill is tapped', async () => {
    (getDonations as jest.Mock).mockResolvedValue([]);
    renderScreen();

    await waitFor(() => expect(getDonations).toHaveBeenCalledWith('all'));

    fireEvent.press(screen.getByText('Active'));

    await waitFor(() => expect(getDonations).toHaveBeenCalledWith('active'));
  });

  it('renders each donation with its status badge label', async () => {
    (getDonations as jest.Mock).mockResolvedValue(sampleDonations);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeTruthy();
      expect(screen.getByText('Pending')).toBeTruthy();
    });
  });
});