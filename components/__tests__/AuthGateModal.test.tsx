import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { AuthGateModal } from '../AuthGateModal';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('AuthGateModal', () => {
  const onDismiss = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('navigates to /auth/sign-in and dismisses when Sign In is tapped', () => {
    const { getByTestId } = render(
      <AuthGateModal visible={true} onDismiss={onDismiss} />,
    );
    fireEvent.press(getByTestId('auth-gate-signin-btn'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/auth/sign-in');
  });

  it('navigates to /auth/sign-up and dismisses when Create Account is tapped', () => {
    const { getByTestId } = render(
      <AuthGateModal visible={true} onDismiss={onDismiss} />,
    );
    fireEvent.press(getByTestId('auth-gate-create-btn'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/auth/sign-up');
  });

  it('calls onDismiss without navigating when Not Now is tapped', () => {
    const { getByTestId } = render(
      <AuthGateModal visible={true} onDismiss={onDismiss} />,
    );
    fireEvent.press(getByTestId('auth-gate-dismiss-btn'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });
});
