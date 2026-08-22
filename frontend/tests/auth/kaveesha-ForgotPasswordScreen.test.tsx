// frontend/tests/auth/kaveesha-ForgotPasswordScreen.test.tsx
// Owner: Kavee
// Uses Jest + jest-expo + @testing-library/react-native v14 (async APIs).
//
// requestPasswordReset (the real API call) is mocked — this test only
// checks the screen's own behaviour, never a real backend.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
  requestPasswordReset: jest.fn(),
}));

import ForgotPasswordScreen from '../../src/screens/kaveesha-ForgotPasswordScreen';
import { requestPasswordReset } from '../../src/services/api';

const mockedRequestPasswordReset = requestPasswordReset as jest.Mock;

function buildNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    replace: jest.fn(),
    setOptions: jest.fn(),
  } as any;
}

async function renderScreen(navigation = buildNavigation()) {
  const route = { key: 'ForgotPassword', name: 'ForgotPassword', params: undefined } as any;
  const utils = await render(<ForgotPasswordScreen navigation={navigation} route={route} />);
  return { ...utils, navigation };
}

describe('<ForgotPasswordScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a validation error for an invalid email', async () => {
    const { getByText, getByPlaceholderText } = await renderScreen();

    await fireEvent.changeText(getByPlaceholderText('you@example.com'), 'not-an-email');
    await fireEvent.press(getByText('Send Reset Link'));

    expect(getByText('Enter a valid email address.')).toBeTruthy();
    expect(mockedRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('shows a validation error for an empty email', async () => {
    const { getByText } = await renderScreen();

    await fireEvent.press(getByText('Send Reset Link'));

    expect(getByText('Enter a valid email address.')).toBeTruthy();
  });

  it('navigates to the OTP screen when the code is sent successfully', async () => {
    mockedRequestPasswordReset.mockResolvedValueOnce({ success: true });

    const { getByText, getByPlaceholderText, navigation } = await renderScreen();

    await fireEvent.changeText(getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
      expect(mockedRequestPasswordReset).toHaveBeenCalledWith('jane@example.com');
    });

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith('VerifyResetOtp', {
        email: 'jane@example.com',
      });
    });
  });

  it('shows the server message when the request is not successful', async () => {
    mockedRequestPasswordReset.mockResolvedValueOnce({
      success: false,
      message: 'Please enter your email address.',
    });

    const { getByText, getByPlaceholderText, navigation } = await renderScreen();

    await fireEvent.changeText(getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
      expect(getByText('Please enter your email address.')).toBeTruthy();
    });

    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('shows a connection error when the request fails to reach the server', async () => {
    mockedRequestPasswordReset.mockRejectedValueOnce(new Error('Network Error'));

    const { getByText, getByPlaceholderText } = await renderScreen();

    await fireEvent.changeText(getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
      expect(
        getByText('Unable to connect to the server. Please check your connection.'),
      ).toBeTruthy();
    });
  });

  it('goes back to Login when "Back to login" is tapped', async () => {
    const { getByText, navigation } = await renderScreen();
    await fireEvent.press(getByText('Back to login'));
    expect(navigation.goBack).toHaveBeenCalled();
  });
});