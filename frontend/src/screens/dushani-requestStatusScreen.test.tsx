import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getMyFoodRequests } from '../services/dushani-foodRequestApi';
import type { FoodRequest } from '../services/dushani-foodRequestApi';
import type { RootStackParamList } from '../navigation/types';
import RequestStatusScreen from './dushani-requestStatusScreen';

jest.mock('../services/dushani-foodRequestApi');
jest.mock('../utils/kaveesha-authStorage', () => ({
  getFullName: jest.fn(async () => 'Dushani Naveendhya'),
}));

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'RequestStatus'>;

const load = jest.mocked(getMyFoodRequests);

const inTwoHours = new Date(Date.now() + 2 * 3_600_000).toISOString();

// /mine returns every status the recipient still sees, newest first.
const requests: FoodRequest[] = [
  {
    _id: 'p1',
    foodType: 'Cooked Rice, Carrot',
    quantity: 'Cooked Rice - 6 packets, Carrot - 2 kg',
    location: 'Main Street, Colombo 05',
    contactNumber: '0771234567',
    urgency: 'NORMAL',
    priority: 'NORMAL',
    status: 'PENDING',
    createdAt: '2026-10-10T04:00:00.000Z',
    expiresAt: inTwoHours,
  },
  {
    _id: 'm1',
    foodType: 'Bread basket',
    quantity: '6 loaves',
    location: 'Gampaha town',
    contactNumber: '0771234567',
    urgency: 'URGENT',
    priority: 'HIGH',
    status: 'MATCHED',
    createdAt: '2026-10-09T04:00:00.000Z',
    acceptedAt: '2026-10-09T05:30:00.000Z',
  },
  {
    _id: 'f1',
    foodType: 'Dal curry',
    quantity: '20 portions',
    location: 'Kalutara',
    contactNumber: '0771234567',
    urgency: 'NORMAL',
    priority: 'NORMAL',
    status: 'FULFILLED',
    createdAt: '2026-10-01T04:00:00.000Z',
    fulfilledAt: '2026-10-01T09:15:00.000Z',
  },
  {
    _id: 'e1',
    foodType: 'Rice packets',
    quantity: '10 packets',
    location: 'Negombo',
    contactNumber: '0771234567',
    urgency: 'NORMAL',
    priority: 'NORMAL',
    status: 'EXPIRED',
    createdAt: '2026-08-11T04:00:00.000Z',
    expiresAt: '2026-08-12T04:00:00.000Z',
  },
  {
    _id: 'c1',
    foodType: 'Fruit box',
    quantity: '3 boxes',
    location: 'Kurunegala',
    contactNumber: '0771234567',
    urgency: 'NORMAL',
    priority: 'NORMAL',
    status: 'CANCELLED',
    createdAt: '2026-09-19T04:00:00.000Z',
    cancelledAt: '2026-09-20T10:05:00.000Z',
  },
];

async function renderScreen() {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  } as unknown as ScreenProps['navigation'];
  const route = {} as ScreenProps['route'];
  const view = await render(
    <RequestStatusScreen navigation={navigation} route={route} />,
  );
  await waitFor(() => expect(load).toHaveBeenCalled());
  return view;
}

describe('my requests list', () => {
  beforeEach(() => {
    load.mockReset();
    load.mockResolvedValue(requests);
  });

  it('keeps the running requests under a heading-free live group', async () => {
    await renderScreen();

    expect(screen.getByText('Cooked Rice, Carrot')).toBeTruthy();
    expect(screen.getByText('Bread basket')).toBeTruthy();
    expect(screen.queryByText('LIVE')).toBeNull();
    // The raw locale string with seconds is gone from the card footer.
    expect(screen.getAllByText(/^Posted /)).toHaveLength(3);
  });

  it('gives expired requests their own band with a reason and a date', async () => {
    await renderScreen();

    expect(screen.getByText('EXPIRED')).toBeTruthy();
    expect(screen.getByText(/^No donor claimed it in time ·/)).toBeTruthy();
    expect(screen.getByText('Rice packets')).toBeTruthy();
    expect(screen.getByText('10 packets · Negombo')).toBeTruthy();
  });

  it('bands cancelled requests separately instead of labelling them expired', async () => {
    await renderScreen();

    expect(screen.getByText('CANCELLED')).toBeTruthy();
    expect(screen.getByText(/^You cancelled this request ·/)).toBeTruthy();
    expect(screen.getByText('3 boxes · Kurunegala')).toBeTruthy();
    // Each closed band carries its own quiet count rather than a bare digit.
    expect(screen.getAllByText('1 request')).toHaveLength(3);
  });

  it('shows when a collected request was delivered', async () => {
    await renderScreen();

    expect(screen.getByText('COLLECTED')).toBeTruthy();
    expect(screen.getByText(/^Delivered /)).toBeTruthy();
    expect(screen.queryByText('Locked — a donor is handling this')).toBeNull();
  });

  it('never offers progress or deletion on a closed row', async () => {
    await renderScreen();

    // Only the three running cards carry a progress link, and only the waiting
    // one can still be deleted.
    expect(screen.getAllByText('View progress')).toHaveLength(3);
    expect(screen.getAllByLabelText('Delete this request')).toHaveLength(1);
  });
});
