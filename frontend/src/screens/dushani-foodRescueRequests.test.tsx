import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import {
  acceptFoodRequest,
  getOpenFoodRequests,
  type OpenFoodRequest,
} from '../services/dushani-foodRequestApi';
import FoodRescueRequestsScreen from './kaveesha-FoodRescueRequestsScreen';

jest.mock('../services/dushani-foodRequestApi');
jest.mock('../utils/kaveesha-authStorage', () => ({
  getRole: jest.fn(),
}));

import { getRole } from '../utils/kaveesha-authStorage';

const HOUR = 60 * 60 * 1000;

function openRequest(overrides: Partial<OpenFoodRequest>): OpenFoodRequest {
  return {
    id: 'req1',
    recipientName: 'Dushani Naveendhya',
    foodType: 'Cooked Rice',
    quantity: 'Cooked Rice - 6 packets',
    location: 'No. 24, Galle Road, Colombo, 00300',
    details: 'Four of us at home, no cooking gas left today.',
    urgency: 'NORMAL',
    priority: 'NORMAL',
    status: 'PENDING',
    preferredAt: new Date(Date.now() + 8 * HOUR).toISOString(),
    expiresAt: new Date(Date.now() + 10 * HOUR).toISOString(),
    createdAt: new Date(Date.now() - HOUR).toISOString(),
    ...overrides,
  };
}

function renderScreen() {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  } as never;

  // render is async in testing-library 14 — awaiting it is what flushes act().
  return render(<FoodRescueRequestsScreen navigation={navigation} route={{} as never} />);
}

beforeEach(() => {
  jest.mocked(getRole).mockResolvedValue('DONOR' as never);
});

afterEach(() => jest.clearAllMocks());

it('shows the recipient posts the server returns, notes and all', async () => {
  (getOpenFoodRequests as jest.Mock).mockResolvedValue([
    openRequest({}),
    openRequest({
      id: 'req2',
      recipientName: 'Hope For All Charity',
      foodType: 'Bread, Water',
      quantity: 'Bread - 10 slices, Water - 6 bottles',
      location: 'Kandy Road, Peradeniya',
      details: 'The evening meal for twelve people.',
      urgency: 'URGENT',
      preferredAt: null,
    }),
  ]);

  await renderScreen();

  await waitFor(() => expect(screen.getByText('Dushani Naveendhya')));

  expect(screen.getByText('Hope For All Charity')).toBeTruthy();
  expect(screen.getByText('Four of us at home, no cooking gas left today.')).toBeTruthy();
  expect(screen.getByText('Bread - 10 slices, Water - 6 bottles')).toBeTruthy();
  expect(screen.getByText('Kandy Road, Peradeniya')).toBeTruthy();
  expect(screen.getByText('2 requests open right now')).toBeTruthy();
});

it('does not carry any of the old demo requests', async () => {
  (getOpenFoodRequests as jest.Mock).mockResolvedValue([openRequest({})]);

  await renderScreen();
  await waitFor(() => expect(screen.getByText('Dushani Naveendhya')));

  expect(screen.queryByText(/Riverside Soup Kitchen|Kelaniya Relief Committee|Golden Years/)).toBeNull();
  // Distance was invented demo data — a request has no coordinates.
  expect(screen.queryByText(/km away|km from you/)).toBeNull();
});

it('narrow the list with the search box', async () => {
  (getOpenFoodRequests as jest.Mock).mockResolvedValue([
    openRequest({}),
    openRequest({
      id: 'req2',
      recipientName: 'Kamala Perera',
      foodType: 'Dal curry',
      location: 'Negombo',
    }),
  ]);

  await renderScreen();
  await waitFor(() => expect(screen.getByText('Dushani Naveendhya')));

  fireEvent.changeText(screen.getByPlaceholderText(/Search food/), 'negombo');

  await waitFor(() => expect(screen.queryByText('Dushani Naveendhya')).toBeNull());
  expect(screen.getByText('Kamala Perera')).toBeTruthy();
});

it('says so when nobody has an open request', async () => {
  (getOpenFoodRequests as jest.Mock).mockResolvedValue([]);

  await renderScreen();

  await waitFor(() =>
    expect(screen.getByText('No recipient has an open request right now.')),
  );
});

it('lets a donor claim a post and then reveals the phone number', async () => {
  (getOpenFoodRequests as jest.Mock).mockResolvedValue([openRequest({})]);
  (acceptFoodRequest as jest.Mock).mockResolvedValue({
    id: 'req1',
    status: 'MATCHED',
    foodType: 'Cooked Rice',
    quantity: 'Cooked Rice - 6 packets',
    location: 'No. 24, Galle Road, Colombo',
    details: 'Four of us at home.',
    contactNumber: '0771234567',
    urgency: 'NORMAL',
    preferredAt: null,
    acceptedAt: new Date().toISOString(),
  });

  await renderScreen();
  await waitFor(() => expect(screen.getByText('Dushani Naveendhya')));

  fireEvent.press(screen.getByText('View details'));

  // fireEvent is async in testing-library 14, so the re-render only lands once
  // each press is awaited.
  await waitFor(() =>
    expect(screen.getByText("I'll deliver this request")).toBeTruthy(),
  );

  await fireEvent.press(screen.getByText("I'll deliver this request"));

  await waitFor(() => expect(acceptFoodRequest).toHaveBeenCalledWith('req1'));
  expect(await screen.findByText('0771234567')).toBeTruthy();
  expect(screen.getByText('You accepted this request')).toBeTruthy();
  // The claimed post leaves the open list behind it.
  expect(screen.queryByText('View details')).toBeNull();
});

it('hides the claim button from a volunteer', async () => {
  jest.mocked(getRole).mockResolvedValue('VOLUNTEER' as never);
  (getOpenFoodRequests as jest.Mock).mockResolvedValue([openRequest({})]);

  await renderScreen();
  await waitFor(() => expect(screen.getByText('Dushani Naveendhya')));

  fireEvent.press(screen.getByText('View details'));
  await waitFor(() => expect(screen.getByText('Donate to this request')));

  expect(screen.queryByText("I'll deliver this request")).toBeNull();
  expect(acceptFoodRequest).not.toHaveBeenCalled();
});
