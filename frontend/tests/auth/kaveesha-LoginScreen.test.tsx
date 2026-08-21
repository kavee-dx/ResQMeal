// frontend/tests/auth/kaveesha-LoginScreen.test.tsx
// Owner: Kavee
// Uses Jest + jest-expo + @testing-library/react-native v14 (async APIs).
//
// The real API call (api.post) and the session storage (saveSession) are
// mocked — this test only checks the screen's own behaviour (validation,
// banners, navigation), never a real backend.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('../../src/utils/kaveesha-authStorage', () => ({
  __esModule: true,
  saveSession: jest.fn().mockResolvedValue(undefined),
  getToken: jest.fn(),
  getRole: jest.fn(),
  getFullName: jest.fn(),
  clearSession: jest.fn(),
  hasSession: jest.fn(),
}));

import LoginScreen from '../../src/screens/kaveesha-LoginScreen';
import api from '../../src/services/api';
import { saveSession } from '../../src/utils/kaveesha-authStorage';

const mockedApi = api as jest.Mocked<typeof api>;
const mockedSaveSession = saveSession as jest.Mock;

function buildNavigation() {
  return {
    navigate: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    setOptions: jest.fn(),
  } as any;
}

async function renderLogin(navigation = buildNavigation()) {
  const route = { key: 'Login', name: 'Login', params: undefined } as any;
  const utils = await render(<LoginScreen navigation={navigation} route={route} />);
  return { ...utils, navigation };
}

describe('<LoginScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows validation errors when submitting an empty form', async () => {
    const { getByText } = await renderLogin();

    await fireEvent.press(getByText('Log In'));

    expect(getByText('Email is required.')).toBeTruthy();
    expect(getByText('Password is required.')).toBeTruthy();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('shows an error for an invalid email format', async () => {
    const { getByText, getByPlaceholderText } = await renderLogin();

    await fireEvent.changeText(getByPlaceholderText('you@example.com'), 'not-an-email');
    await fireEvent.changeText(getByPlaceholderText('Enter your password'), 'somePassword1');
    await fireEvent.press(getByText('Log In'));

    expect(getByText('Enter a valid email address.')).toBeTruthy();
  });

  it('logs in successfully, saves the session, and navigates home', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Login successful! Welcome back!',
        token: 'tok_123',
        role: 'DONOR',
        user: {
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          role: 'DONOR',
        },
      },
    });

    const { getByText, getByPlaceholderText, navigation } = await renderLogin();

    await fireEvent.changeText(getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.changeText(getByPlaceholderText('Enter your password'), 'SecurePass123');
    await fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'jane@example.com',
        password: 'SecurePass123',
      });
    });

    await waitFor(() => {
      expect(mockedSaveSession).toHaveBeenCalledWith('tok_123', 'DONOR', 'Jane Doe');
    });

    expect(getByText('Login successful! Welcome back!')).toBeTruthy();

    // The real component waits ~1s before navigating away, so give this
    // assertion more room than the default waitFor timeout.
    await waitFor(
      () => {
        expect(navigation.reset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: 'DonorHome', params: { fullName: 'Jane Doe' } }],
        });
      },
      { timeout: 2000 },
    );
  });

  it('shows an incorrect-credentials message on a 401 response', async () => {
    mockedApi.post.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Incorrect email or password.' } },
    });

    const { getByText, getByPlaceholderText } = await renderLogin();

    await fireEvent.changeText(getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.changeText(getByPlaceholderText('Enter your password'), 'WrongPassword1');
    await fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(getByText('Incorrect email or password. Please try again.')).toBeTruthy();
    });

    expect(mockedSaveSession).not.toHaveBeenCalled();
  });

  it('shows the server message when the account is not verified (403)', async () => {
    mockedApi.post.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { message: 'Your account has not been verified yet.' },
      },
    });

    const { getByText, getByPlaceholderText } = await renderLogin();

    await fireEvent.changeText(getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.changeText(getByPlaceholderText('Enter your password'), 'SecurePass123');
    await fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(getByText('Your account has not been verified yet.')).toBeTruthy();
    });
  });

  it('shows a connection error when the request never reaches the server', async () => {
    mockedApi.post.mockRejectedValueOnce({});

    const { getByText, getByPlaceholderText } = await renderLogin();

    await fireEvent.changeText(getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.changeText(getByPlaceholderText('Enter your password'), 'SecurePass123');
    await fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(
        getByText('Unable to connect to the server. Please check your internet connection.'),
      ).toBeTruthy();
    });
  });

  it('navigates to ForgotPassword when the link is tapped', async () => {
    const { getByText, navigation } = await renderLogin();
    await fireEvent.press(getByText('Forgot password?'));
    expect(navigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('navigates to Register when "Register here" is tapped', async () => {
    const { getByText, navigation } = await renderLogin();
    await fireEvent.press(getByText('Register here'));
    expect(navigation.navigate).toHaveBeenCalledWith('Register');
  });
});