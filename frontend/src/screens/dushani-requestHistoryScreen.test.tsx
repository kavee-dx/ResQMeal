import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getMyRequestHistory } from '../services/dushani-foodRequestApi';
import type { RootStackParamList } from '../navigation/types';
import RequestHistoryScreen from './dushani-requestHistoryScreen';

jest.mock('../services/dushani-foodRequestApi');
jest.mock('../utils/kaveesha-authStorage', () => ({
  getFullName: jest.fn(async () => 'Dushani Naveendhya'),
}));

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'RequestHistory'>;

const history = jest.mocked(getMyRequestHistory);

// /history already returns these newest-closure-first, which is what the list
// renders until the recipient flips the order.
const rows = [
  {
    _id: 'r1',
    foodType: 'Rice packets',
    quantity: '10 packets',
    location: 'Colombo 05',
    urgency: 'NORMAL',
    priority: 'NORMAL',
    status: 'FULFILLED',
    createdAt: '2026-09-25T06:00:00.000Z',
    acceptedAt: '2026-09-26T06:00:00.000Z',
    fulfilledAt: '2026-09-27T09:30:00.000Z',
    closedAt: '2026-09-27T09:30:00.000Z',
  },
  {
    _id: 'r2',
    foodType: 'Bread basket',
    quantity: '6 loaves',
    location: 'Gampaha',
    urgency: 'URGENT',
    priority: 'HIGH',
    status: 'CANCELLED',
    createdAt: '2026-09-19T06:00:00.000Z',
    acceptedAt: null,
    cancelledAt: '2026-09-20T14:05:00.000Z',
    closedAt: '2026-09-20T14:05:00.000Z',
  },
  {
    _id: 'r3',
    foodType: 'Dal curry',
    quantity: '4 portions',
    location: 'Kalutara',
    urgency: 'NORMAL',
    priority: 'NORMAL',
    status: 'EXPIRED',
    createdAt: '2026-08-11T06:00:00.000Z',
    expiresAt: '2026-08-12T06:00:00.000Z',
    closedAt: '2026-08-12T06:00:00.000Z',
  },
];

function renderScreen() {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  } as unknown as ScreenProps['navigation'];
  const route = {} as ScreenProps['route'];
  return render(<RequestHistoryScreen navigation={navigation} route={route} />);
}

// The food name is the one line each row owns, so its position in the rendered
// document is the list order.
function listedFoodNames() {
  return screen
    .getAllByText(/Rice packets|Bread basket|Dal curry/)
    .map((text) => String(text.props.children));
}

describe('request history list (sprint item 13)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    history.mockResolvedValue(rows as never);
  });

  it('lists the closed requests newest first with their outcome labels', async () => {
    renderScreen();
    await waitFor(() => expect(listedFoodNames()).toHaveLength(3));

    expect(listedFoodNames()).toEqual([
      'Rice packets',
      'Bread basket',
      'Dal curry',
    ]);
    expect(screen.getByText('Food received')).toBeDefined();
    expect(screen.getByText('The donation reached you.')).toBeDefined();
    expect(screen.getByText('You withdrew this request.')).toBeDefined();
    expect(screen.getByText('No donor accepted it before it closed.')).toBeDefined();
  });

  it('reads oldest first once the order is flipped', async () => {
    renderScreen();
    await waitFor(() => expect(listedFoodNames()).toHaveLength(3));

    // fireEvent is async in testing-library 14, so the re-render only lands
    // once the press is awaited.
    await fireEvent.press(screen.getByLabelText('Order the history oldest first'));

    expect(listedFoodNames()).toEqual([
      'Dal curry',
      'Bread basket',
      'Rice packets',
    ]);
  });

  it('heads each stretch of months, in the direction being read', async () => {
    renderScreen();
    await waitFor(() => expect(listedFoodNames()).toHaveLength(3));

    const months = screen
      .getAllByText(/SEPTEMBER 2026|AUGUST 2026/)
      .map((text) => String(text.props.children));
    expect(months).toEqual(['SEPTEMBER 2026', 'AUGUST 2026']);

    await fireEvent.press(screen.getByLabelText('Order the history oldest first'));

    const flipped = screen
      .getAllByText(/SEPTEMBER 2026|AUGUST 2026/)
      .map((text) => String(text.props.children));
    expect(flipped).toEqual(['AUGUST 2026', 'SEPTEMBER 2026']);
  });

  it('shows only the outcome being asked for', async () => {
    renderScreen();
    await waitFor(() => expect(listedFoodNames()).toHaveLength(3));

    await fireEvent.press(screen.getByLabelText('Never claimed requests'));

    expect(listedFoodNames()).toEqual(['Dal curry']);
    expect(screen.getByText('Showing 1 of 3')).toBeDefined();
  });

  it('says so when nothing has closed yet', async () => {
    history.mockResolvedValue([] as never);

    renderScreen();
    await waitFor(() =>
      expect(screen.getByText('No past requests yet')).toBeDefined(),
    );

    expect(screen.getByText('Make a food request')).toBeDefined();
  });
});
