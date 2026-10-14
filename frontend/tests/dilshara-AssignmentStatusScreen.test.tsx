/**
 * frontend/tests/dilshara-AssignmentStatusScreen.test.tsx
 * Owner: Dilshara — volunteer assignment screen (matching engine steps 12–13).
 *
 * The assignment service is mocked; this test only checks what the screen
 * renders and which status moves it sends — never a real backend. The
 * contact gate itself is server-side (see dilshara-assignment.controller.js);
 * here we only verify the screen renders what the server chose to return.
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// The first render of this screen pulls in the full Expo/RN module graph, which
// alone can take several seconds on a cold Jest run.
jest.setTimeout(20000);

// Runs the focus callback once per distinct callback (the screen's callback is
// useCallback-stable), so the initial load fires without a navigation container.
jest.mock('@react-navigation/native', () => {
  let lastCallback: unknown = null;
  return {
    useFocusEffect: (callback: () => void) => {
      if (callback !== lastCallback) {
        lastCallback = callback;
        callback();
      }
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../src/components/dilshara-VolunteerBottomNav', () => () => null);

jest.mock('../src/services/dilshara-assignmentService', () => ({
  getCurrentAssignmentDetail: jest.fn(),
  updateAssignmentStatus: jest.fn(),
}));

import AssignmentStatusScreen from '../src/screens/dilshara-AssignmentStatusScreen';
import {
  getCurrentAssignmentDetail,
  updateAssignmentStatus,
} from '../src/services/dilshara-assignmentService';

const mockDetail = getCurrentAssignmentDetail as jest.Mock;
const mockUpdate = updateAssignmentStatus as jest.Mock;

function assignment(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'a1',
    donationId: {
      foodType: 'Cooked Rice',
      numberOfPortions: 40,
      pickupAddress: '12 Temple Rd',
      pickupDistrict: 'Colombo',
    },
    volunteerId: 'v1',
    requestId: 'r1',
    status: 'ASSIGNED',
    matchScore: 92.4,
    matchBreakdown: {
      distance: { score: 90, points: 36 },
      area: { score: 100, points: 25 },
      time: { score: 80, points: 16 },
      urgency: { score: 100, points: 15 },
    },
    matchReasons: ['Within 3 km of the pickup'],
    routeDistanceKm: 12.4,
    locationPrecision: 'APPROXIMATE',
    assignedAt: '2026-10-15T03:00:00.000Z',
    ...overrides,
  };
}

function delivery(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ASSIGNED',
    stage: 'TO_PICKUP',
    pickup: {
      label: '12 Temple Rd',
      district: 'Colombo',
      exact: false,
      latitude: 6.9271,
      longitude: 79.8612,
    },
    dropoff: {
      label: 'Colombo 05',
      district: 'Colombo',
      exact: false,
      latitude: 6.9271,
      longitude: 79.8612,
    },
    recipientContact: null,
    ...overrides,
  };
}

function detailOnce(a: unknown, d: unknown) {
  mockDetail.mockResolvedValueOnce({ assignment: a, delivery: d });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<AssignmentStatusScreen />', () => {
  it('shows the offer with score breakdown, areas, and the contact hint while ASSIGNED', async () => {
    detailOnce(assignment(), delivery());

    const screen = await render(<AssignmentStatusScreen />);

    await waitFor(() => expect(screen.getByText('Assigned')).toBeTruthy());
    expect(screen.getByText('Accept Assignment')).toBeTruthy();
    expect(screen.getByText('Decline')).toBeTruthy();

    expect(screen.getByText('Match score 92.4 / 100')).toBeTruthy();
    expect(screen.getByText('Route distance: ~12 km (approximate)')).toBeTruthy();
    expect(screen.getByText('Within 3 km of the pickup')).toBeTruthy();
    expect(screen.getByText('Distance')).toBeTruthy();

    expect(screen.getByText('Pickup: 12 Temple Rd, Colombo')).toBeTruthy();
    expect(screen.getByText(/Drop-off: Colombo 05 \(approximate area\)/)).toBeTruthy();

    // The recipient's number must not appear before the volunteer accepts.
    expect(screen.getByText('Recipient contact details appear once you accept.')).toBeTruthy();
    expect(screen.queryByText('Recipient contact')).toBeNull();
    expect(screen.queryByText('0771234567')).toBeNull();
  });

  it('falls back to the donation fields when the server could not place the pickup', async () => {
    detailOnce(assignment(), delivery({ pickup: null }));

    const screen = await render(<AssignmentStatusScreen />);

    await waitFor(() => expect(screen.getByText('Assigned')).toBeTruthy());
    expect(screen.getByText('Pickup: 12 Temple Rd, Colombo')).toBeTruthy();
  });

  it('does not mark an exact drop-off as an approximate area', async () => {
    detailOnce(
      assignment({ status: 'IN_TRANSIT' }),
      delivery({
        status: 'IN_TRANSIT',
        stage: 'TO_DROPOFF',
        dropoff: {
          label: '12 Temple Rd',
          district: 'Colombo',
          exact: true,
          latitude: 6.9271,
          longitude: 79.8612,
        },
      }),
    );

    const screen = await render(<AssignmentStatusScreen />);

    await waitFor(() => expect(screen.getByText('In Transit')).toBeTruthy());
    expect(screen.getByText('Drop-off: 12 Temple Rd, Colombo')).toBeTruthy();
    expect(screen.queryByText(/approximate area/)).toBeNull();
  });

  it('shows recipient contact and pickup actions after accepting', async () => {
    detailOnce(
      assignment({ status: 'ACCEPTED' }),
      delivery({ recipientContact: { name: 'Kasun Perera', phone: '0771234567' } }),
    );

    const screen = await render(<AssignmentStatusScreen />);

    await waitFor(() => expect(screen.getByText('Accepted')).toBeTruthy());
    expect(screen.getByText('Start Pickup')).toBeTruthy();
    expect(screen.getByText('Cancel Assignment')).toBeTruthy();

    expect(screen.getByText('Kasun Perera')).toBeTruthy();
    expect(screen.getByText('0771234567')).toBeTruthy();
    expect(screen.queryByText('Recipient contact details appear once you accept.')).toBeNull();
  });

  it('offers only the completion action while IN_TRANSIT', async () => {
    detailOnce(
      assignment({ status: 'IN_TRANSIT' }),
      delivery({ recipientContact: { name: 'Kasun Perera', phone: '0771234567' } }),
    );

    const screen = await render(<AssignmentStatusScreen />);

    await waitFor(() => expect(screen.getByText('In Transit')).toBeTruthy());
    expect(screen.getByText('Mark Delivered')).toBeTruthy();
    expect(screen.queryByText('Cancel Assignment')).toBeNull();
  });

  it('sends ACCEPTED, refreshes, and shows success feedback', async () => {
    detailOnce(assignment(), delivery());
    mockUpdate.mockResolvedValueOnce({
      assignment: assignment({ status: 'ACCEPTED' }),
      requestSync: { status: 'SYNCED' },
    });
    detailOnce(
      assignment({ status: 'ACCEPTED' }),
      delivery({ recipientContact: { name: 'Kasun Perera', phone: '0771234567' } }),
    );

    const screen = await render(<AssignmentStatusScreen />);
    await waitFor(() => expect(screen.getByText('Accept Assignment')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Accept Assignment'));
    });

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('a1', 'ACCEPTED'),
    );
    // Refetched from the server, so the new status and contact appear.
    await waitFor(() => expect(screen.getByText('Accepted')).toBeTruthy());
    expect(screen.getByText('0771234567')).toBeTruthy();
    expect(
      screen.getByText('Assignment accepted. Head to the pickup when you are ready.'),
    ).toBeTruthy();
    expect(mockDetail).toHaveBeenCalledTimes(2);
  });

  it('confirms before declining and then sends CANCELLED', async () => {
    detailOnce(assignment(), delivery());
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockUpdate.mockResolvedValueOnce({
      assignment: assignment({ status: 'CANCELLED' }),
      requestSync: { status: 'SKIPPED' },
    });
    detailOnce(null, null);

    const screen = await render(<AssignmentStatusScreen />);
    await waitFor(() => expect(screen.getByText('Decline')).toBeTruthy());

    await fireEvent.press(screen.getByText('Decline'));

    expect(alert).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    const confirm = buttons.find((button) => button.text === 'Decline');
    await act(async () => {
      await confirm?.onPress?.();
    });

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('a1', 'CANCELLED'));
    // The delivery left this volunteer's list and the feedback stays visible.
    await waitFor(() => expect(screen.getByText('No active assignment')).toBeTruthy());
    expect(screen.getByText('Delivery declined — it goes back to matching.')).toBeTruthy();

    alert.mockRestore();
  });

  it('warns when the linked request could not be synced', async () => {
    detailOnce(assignment(), delivery());
    mockUpdate.mockResolvedValueOnce({
      assignment: assignment({ status: 'ACCEPTED' }),
      requestSync: { status: 'FAILED', requestId: 'r1' },
    });
    detailOnce(assignment({ status: 'ACCEPTED' }), delivery());

    const screen = await render(<AssignmentStatusScreen />);
    await waitFor(() => expect(screen.getByText('Accept Assignment')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Accept Assignment'));
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          "Status saved, but the recipient's request could not be updated — it is logged for recovery.",
        ),
      ).toBeTruthy(),
    );
  });

  it('hides the match card for assignments with no matching metadata', async () => {
    detailOnce(
      assignment({
        matchScore: null,
        matchBreakdown: null,
        matchReasons: [],
        routeDistanceKm: null,
        locationPrecision: null,
      }),
      delivery(),
    );

    const screen = await render(<AssignmentStatusScreen />);

    await waitFor(() => expect(screen.getByText('Assigned')).toBeTruthy());
    expect(screen.queryByText('Why you matched')).toBeNull();
  });

  it('shows the empty state when there is no active assignment', async () => {
    detailOnce(null, null);

    const screen = await render(<AssignmentStatusScreen />);

    await waitFor(() => expect(screen.getByText('No active assignment')).toBeTruthy());
  });

  it('shows an error state with retry when loading fails', async () => {
    mockDetail.mockRejectedValueOnce({});
    detailOnce(null, null);

    const screen = await render(<AssignmentStatusScreen />);

    await waitFor(() => expect(screen.getByText('Could not load your assignment')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Try again'));
    });

    await waitFor(() => expect(screen.getByText('No active assignment')).toBeTruthy());
  });
});
