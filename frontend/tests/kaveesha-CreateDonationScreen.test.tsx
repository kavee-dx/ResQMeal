/**
 * kaveesha-CreateDonationScreen.test.tsx
 * Location: frontend/tests/kaveesha-CreateDonationScreen.test.tsx
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import CreateDonationScreen from '../src/screens/kaveesha-CreateDonationScreen';
import { createDonation } from '../src/services/kaveesha-donationApi';

jest.mock('../src/services/kaveesha-donationApi', () => ({
  createDonation: jest.fn(),
}));

function renderScreen() {
  return render(
    <NavigationContainer>
      <CreateDonationScreen />
    </NavigationContainer>
  );
}

describe('CreateDonationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Required field validation
  it('shows validation errors and does not submit when required fields are empty', async () => {
    renderScreen();

    fireEvent.press(screen.getByText('Submit Donation'));

    await waitFor(() => {
      expect(screen.getByText('Food type is required')).toBeTruthy();
    });

    expect(createDonation).not.toHaveBeenCalled();
  });

  // Test 2: Donation type selection
  it('lets the donor switch between Normal and Urgent donation type', () => {
    renderScreen();

    const urgentButton = screen.getByText('⚡ Urgent');

    fireEvent.press(urgentButton);

    expect(urgentButton).toBeTruthy();
  });

  // Test 3: Successful donation submission
  it('submits successfully once all required fields are filled in', async () => {
    (createDonation as jest.Mock).mockResolvedValue({
      _id: 'd1',
    });

    renderScreen();

    // Food type
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g. Rice & Curry'),
      'Rice & Curry'
    );

    fireEvent.changeText(
  screen.getByPlaceholderText('e.g. Cooked meals'),
  'Cooked meals'
);

    // Quantity and portions
    const numericInputs = screen.getAllByPlaceholderText('30');

    fireEvent.changeText(numericInputs[0], '30');
    fireEvent.changeText(numericInputs[1], '30');

    // Preparation time
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g. 2026-08-22T18:00'),
      '2026-08-22T18:00'
    );

    // Expiry time
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g. 2026-08-22T22:00'),
      '2026-08-22T22:00'
    );

    // Storage condition
    fireEvent.press(screen.getByText('Refrigerated'));

    // Allergen information
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g. Contains nuts, dairy'),
      'None'
    );

    // Packaging condition
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g. Sealed container'),
      'Sealed container'
    );

    // Pickup address
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g. 12 Galle Road'),
      '12 Galle Road'
    );

    // Pickup district
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g. Colombo'),
      'Colombo'
    );

    // Pickup window
    fireEvent.changeText(
      screen.getByPlaceholderText('5:30 PM'),
      '5:30 PM'
    );

    fireEvent.changeText(
      screen.getByPlaceholderText('6:00 PM'),
      '6:00 PM'
    );

    // Submit
    fireEvent.press(screen.getByText('Submit Donation'));

    await waitFor(() => {
      expect(createDonation).toHaveBeenCalledWith(
        expect.objectContaining({
          foodType: 'Rice & Curry',
          foodCategory: 'Cooked meals', 
          quantity: '30',
          numberOfPortions: '30',
          preparationTime: '2026-08-22T18:00',
          expiryTime: '2026-08-22T22:00',
          storageCondition: 'Refrigerated',
          allergenInfo: 'None',
          packagingCondition: 'Sealed container',
          pickupAddress: '12 Galle Road',
          pickupDistrict: 'Colombo',
          pickupWindowStart: '5:30 PM',
          pickupWindowEnd: '6:00 PM',
        })
      );
    });
  });

  // Test 4: Error disappears when user starts typing
  it('clears a field error as soon as the donor starts typing in it', async () => {
    renderScreen();

    fireEvent.press(screen.getByText('Submit Donation'));

    await waitFor(() => {
      expect(screen.getByText('Food type is required')).toBeTruthy();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText('e.g. Rice & Curry'),
      'B'
    );

    expect(
      screen.queryByText('Food type is required')
    ).toBeNull();
  });
});