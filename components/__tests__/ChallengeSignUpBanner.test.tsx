import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ChallengeSignUpBanner } from '../ChallengeSignUpBanner';

describe('ChallengeSignUpBanner', () => {
  test('renders heading with sender name', () => {
    const { getByText } = render(
      <ChallengeSignUpBanner senderName="Richard" onCreateAccount={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText('Challenge Richard Back')).toBeTruthy();
  });

  test('Create Account button calls onCreateAccount', () => {
    const onCreateAccount = jest.fn();
    const { getByTestId } = render(
      <ChallengeSignUpBanner senderName="Richard" onCreateAccount={onCreateAccount} onDismiss={jest.fn()} />,
    );
    fireEvent.press(getByTestId('challenge-signup-create-btn'));
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
  });

  test('Maybe Later button calls onDismiss', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <ChallengeSignUpBanner senderName="Richard" onCreateAccount={jest.fn()} onDismiss={onDismiss} />,
    );
    fireEvent.press(getByTestId('challenge-signup-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
