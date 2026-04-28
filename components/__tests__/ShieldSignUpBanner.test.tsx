import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ShieldSignUpBanner } from '../ShieldSignUpBanner';

describe('ShieldSignUpBanner', () => {
  test('renders heading and body explaining shield earning', () => {
    const { getByText } = render(
      <ShieldSignUpBanner
        onCreateAccount={jest.fn()}
        onSignIn={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(getByText('🛡 Sign up to keep your shield')).toBeTruthy();
    // Body should mention helping friends and challenges
    expect(getByText(/help a friend|answer a challenge|streak shield/i)).toBeTruthy();
  });

  test('Create Account button calls onCreateAccount', () => {
    const onCreateAccount = jest.fn();
    const { getByTestId } = render(
      <ShieldSignUpBanner
        onCreateAccount={onCreateAccount}
        onSignIn={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('shield-signup-create-btn'));
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
  });

  test('Sign In button calls onSignIn', () => {
    const onSignIn = jest.fn();
    const { getByTestId } = render(
      <ShieldSignUpBanner
        onCreateAccount={jest.fn()}
        onSignIn={onSignIn}
        onDismiss={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('shield-signup-signin-btn'));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  test('Maybe Later button calls onDismiss', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <ShieldSignUpBanner
        onCreateAccount={jest.fn()}
        onSignIn={jest.fn()}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.press(getByTestId('shield-signup-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
