import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ChallengeSignUpBanner } from '../ChallengeSignUpBanner';

const defaultProps = {
  senderName: 'Richard',
  onCreateAccount: jest.fn(),
  onSignIn: jest.fn(),
  onDismiss: jest.fn(),
};

describe('ChallengeSignUpBanner', () => {
  test('renders heading with sender name', () => {
    const { getByText } = render(<ChallengeSignUpBanner {...defaultProps} />);
    expect(getByText('Challenge Richard Back')).toBeTruthy();
  });

  test('Create Account button calls onCreateAccount', () => {
    const onCreateAccount = jest.fn();
    const { getByTestId } = render(<ChallengeSignUpBanner {...defaultProps} onCreateAccount={onCreateAccount} />);
    fireEvent.press(getByTestId('challenge-signup-create-btn'));
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
  });

  test('Sign In button calls onSignIn', () => {
    const onSignIn = jest.fn();
    const { getByTestId } = render(<ChallengeSignUpBanner {...defaultProps} onSignIn={onSignIn} />);
    fireEvent.press(getByTestId('challenge-signup-signin-btn'));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  test('Maybe Later button calls onDismiss', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(<ChallengeSignUpBanner {...defaultProps} onDismiss={onDismiss} />);
    fireEvent.press(getByTestId('challenge-signup-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
