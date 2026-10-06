/**
 * amasha-FoodRescueMapScreen.test.tsx
 * Location: frontend/tests/amasha-FoodRescueMapScreen.test.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AmashaFoodRescueMapScreen from '../src/screens/amasha-FoodRescueMapScreen';
import { getFoodRescueLocations } from '../src/services/amasha-mapApi';
import { useUserLocation } from '../src/components/communityMonitoring/amasha-useUserLocation';
import { RescueLocation } from '../src/types/amasha-map';

// React 19 + the test renderer need this flag for act() to work; without it
// async state updates behave inconsistently between tests.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../src/services/amasha-mapApi', () => ({
  getFoodRescueLocations: jest.fn(),
}));

// Stub the real map so react-native-maps isn't needed in tests; the stub
// surfaces the visible marker titles so filtering can be asserted.
jest.mock('../src/components/communityMonitoring/amasha-BaseMap', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ locations }: { locations: RescueLocation[] }) => (
      <Text testID="map-stub">
        {locations.map((loc) => loc.title).join('|')}
      </Text>
    ),
  };
});

jest.mock('../src/components/communityMonitoring/amasha-LocationDetailsSheet', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/components/communityMonitoring/amasha-useUserLocation', () => ({
  useUserLocation: jest.fn(),
}));

function renderScreen() {
  return render(
    <NavigationContainer>
      <AmashaFoodRescueMapScreen />
    </NavigationContainer>,
  );
}

function mockUserLocation(region: { latitude: number; longitude: number } | null) {
  (useUserLocation as jest.Mock).mockReturnValue({ region, errorMsg: null });
}

const COLOMBO = { latitude: 6.9271, longitude: 79.8612 };
const KANDY = { latitude: 7.2906, longitude: 80.6337 };

const sampleLocations: RescueLocation[] = [
  {
    id: 'donation-1',
    type: 'available_food',
    title: 'Rice & Curry',
    description: 'Ref: RM-2026-1',
    latitude: COLOMBO.latitude,
    longitude: COLOMBO.longitude,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'donor-1',
    type: 'donor',
    title: 'Amaya Bakery',
    description: 'Colombo, Colombo',
    latitude: COLOMBO.latitude + 0.01,
    longitude: COLOMBO.longitude + 0.01,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ngo-1',
    type: 'ngo',
    title: 'Kandy Food Bank',
    description: 'Kandy, Kandy',
    latitude: KANDY.latitude,
    longitude: KANDY.longitude,
    updatedAt: new Date().toISOString(),
  },
];

describe('AmashaFoodRescueMapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserLocation(null);
  });

  it('renders all locations returned from the API', async () => {
    (getFoodRescueLocations as jest.Mock).mockResolvedValue(sampleLocations);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('map-stub').props.children).toBe(
        'Rice & Curry|Amaya Bakery|Kandy Food Bank',
      );
    });
  });

  it('filters markers by type when a filter chip is pressed', async () => {
    (getFoodRescueLocations as jest.Mock).mockResolvedValue(sampleLocations);
    renderScreen();

    await waitFor(() => expect(getFoodRescueLocations).toHaveBeenCalled());

    fireEvent.press(screen.getByText('Donors'));

    await waitFor(() => {
      expect(screen.getByTestId('map-stub').props.children).toBe('Amaya Bakery');
    });

    fireEvent.press(screen.getByText('NGOs'));

    await waitFor(() => {
      expect(screen.getByTestId('map-stub').props.children).toBe('Kandy Food Bank');
    });
  });

  it('filters to nearby locations when Near Me is toggled with a known location', async () => {
    (getFoodRescueLocations as jest.Mock).mockResolvedValue(sampleLocations);
    // User sits in Colombo — Kandy (~85 km away) should be filtered out.
    mockUserLocation(COLOMBO);
    renderScreen();

    await waitFor(() => expect(getFoodRescueLocations).toHaveBeenCalled());

    fireEvent.press(screen.getByText('Near Me'));

    await waitFor(() => {
      expect(screen.getByTestId('map-stub').props.children).toBe(
        'Rice & Curry|Amaya Bakery',
      );
    });
  });

  it('shows a hint instead of filtering when location is unavailable', async () => {
    (getFoodRescueLocations as jest.Mock).mockResolvedValue(sampleLocations);
    mockUserLocation(null);
    renderScreen();

    await waitFor(() => expect(getFoodRescueLocations).toHaveBeenCalled());

    fireEvent.press(screen.getByText('Near Me'));

    await waitFor(() => {
      expect(
        screen.getByText(/Location unavailable — allow location access/i),
      ).toBeTruthy();
    });
    // Nothing is filtered away without a location.
    expect(screen.getByTestId('map-stub').props.children).toBe(
      'Rice & Curry|Amaya Bakery|Kandy Food Bank',
    );
  });

  it('shows the no-continuous-tracking privacy note', async () => {
    (getFoodRescueLocations as jest.Mock).mockResolvedValue([]);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/never tracked\s+continuously/i)).toBeTruthy();
    });
  });

  it('shows an error state with a retry button when loading fails', async () => {
    (getFoodRescueLocations as jest.Mock).mockRejectedValue(new Error('network down'));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Could not load map locations. Please try again.')).toBeTruthy();
    });
    expect(screen.getByText('Try Again')).toBeTruthy();
  });
});
