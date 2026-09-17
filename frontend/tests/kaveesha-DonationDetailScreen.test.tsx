/**
 * kaveesha-DonationDetailScreen.test.tsx
 * Location:
 * frontend/tests/kaveesha-DonationDetailScreen.test.tsx
 */

import { Alert } from 'react-native';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';

import DonationDetailScreen from '../src/screens/kaveesha-DonationDetailScreen';

import {
  getDonationById,
  deleteDonation,
} from '../src/services/kaveesha-donationApi';

// =========================================================
// Navigation mocks
// =========================================================

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');

  return {
    useRoute: () => ({
      params: {
        donationId: 'd1',
      },
    }),

    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),

    useFocusEffect: (callback: () => void) => {
      useEffect(() => {
        callback();
      }, []);
    },
  };
});

// =========================================================
// API mocks
// =========================================================

jest.mock('../src/services/kaveesha-donationApi', () => ({
  getDonationById: jest.fn(),
  deleteDonation: jest.fn(),
}));

// =========================================================
// Mock donation
// =========================================================

const pendingDonation = {
  _id: 'd1',

  foodType: 'Rice & Curry',

  foodCategory: 'Cooked meals',

  quantity: 30,

  numberOfPortions: 30,

  preparationTime:
    '2026-08-22T18:00:00',

  expiryTime:
    '2026-08-22T22:00:00',

  storageCondition:
    'Refrigerated',

  allergenInfo:
    'None',

  packagingCondition:
    'Sealed container',

  pickupAddress:
    '12 Galle Road',

  pickupDistrict:
    'Colombo',

  pickupWindowStart:
    '2026-08-22T17:30:00',

  pickupWindowEnd:
    '2026-08-22T18:00:00',

  status: 'pending',

  priority: 'high',

  donationCode:
    'RM-2026-000125',

  createdAt:
    '2026-08-22T17:00:00',

  updatedAt:
    '2026-08-22T17:00:00',
};

// =========================================================
// Tests
// =========================================================

describe('DonationDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------
  // Render donation
  // -------------------------------------------------------

  it('renders donation details once loaded', async () => {
    (
      getDonationById as jest.Mock
    ).mockResolvedValue(pendingDonation);

    render(<DonationDetailScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('Rice & Curry')
      ).toBeTruthy();
    });

    expect(
      screen.getByText('#RM-2026-000125')
    ).toBeTruthy();

    expect(
      screen.getByText('Cooked meals')
    ).toBeTruthy();
  });

  // -------------------------------------------------------
  // Pending donation can be managed
  // -------------------------------------------------------

  it('shows Edit and Delete for a pending donation', async () => {
    (
      getDonationById as jest.Mock
    ).mockResolvedValue(pendingDonation);

    render(<DonationDetailScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('Rice & Curry')
      ).toBeTruthy();
    });

    expect(
      screen.getByText('Edit')
    ).toBeTruthy();

    expect(
      screen.getByText('Delete')
    ).toBeTruthy();
  });

  // -------------------------------------------------------
  // Completed donation cannot be managed
  // -------------------------------------------------------

  it('hides Edit and Delete once the donation is completed', async () => {
    (
      getDonationById as jest.Mock
    ).mockResolvedValue({
      ...pendingDonation,
      status: 'completed',
    });

    render(<DonationDetailScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('Rice & Curry')
      ).toBeTruthy();
    });

    expect(
      screen.queryByText('Edit')
    ).toBeNull();

    expect(
      screen.queryByText('Delete')
    ).toBeNull();

    expect(
      screen.getByText(
        /can no longer be edited or deleted/i
      )
    ).toBeTruthy();
  });

  // -------------------------------------------------------
  // Edit navigation
  // -------------------------------------------------------

  it('navigates to EditDonation with the donation id when Edit is tapped', async () => {
    (
      getDonationById as jest.Mock
    ).mockResolvedValue(pendingDonation);

    render(<DonationDetailScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('Edit')
      ).toBeTruthy();
    });

    fireEvent.press(
      screen.getByText('Edit')
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      'EditDonation',
      {
        donationId: 'd1',
      }
    );
  });

  // -------------------------------------------------------
  // Delete confirmed
  // -------------------------------------------------------

  it('calls deleteDonation and navigates back when delete is confirmed', async () => {
    (
      getDonationById as jest.Mock
    ).mockResolvedValue(pendingDonation);

    (
      deleteDonation as jest.Mock
    ).mockResolvedValue({
      _id: 'd1',
    });

    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(
        (
          _title,
          _message,
          buttons
        ) => {
          const deleteButton =
            buttons?.find(
              (button: any) =>
                button.text === 'Delete'
            );

          deleteButton?.onPress?.();
        }
      );

    render(<DonationDetailScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('Delete')
      ).toBeTruthy();
    });

    fireEvent.press(
      screen.getByText('Delete')
    );

    await waitFor(() => {
      expect(
        deleteDonation
      ).toHaveBeenCalledWith('d1');
    });

    expect(
      mockGoBack
    ).toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  // -------------------------------------------------------
  // Delete cancelled
  // -------------------------------------------------------

  it('does not call deleteDonation if the confirmation is cancelled', async () => {
    (
      getDonationById as jest.Mock
    ).mockResolvedValue(pendingDonation);

    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(
        (
          _title,
          _message,
          buttons
        ) => {
          const cancelButton =
            buttons?.find(
              (button: any) =>
                button.text === 'Cancel'
            );

          cancelButton?.onPress?.();
        }
      );

    render(<DonationDetailScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('Delete')
      ).toBeTruthy();
    });

    fireEvent.press(
      screen.getByText('Delete')
    );

    expect(
      deleteDonation
    ).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  // -------------------------------------------------------
  // Donation not found
  // -------------------------------------------------------

  it('shows a not-found message when the donation fails to load', async () => {
    (
      getDonationById as jest.Mock
    ).mockResolvedValue(null);

    render(<DonationDetailScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('Donation not found.')
      ).toBeTruthy();
    });
  });
});