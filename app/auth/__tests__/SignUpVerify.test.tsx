import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

// Mock dependencies before importing the SignUp screen.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(),
  Link: 'Link',
}));

jest.mock('@/lib/authApi', () => ({
  signUp: jest.fn().mockResolvedValue(undefined),
  resendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  mapAuthError: (code: string) => `mapped:${code}`,
}));

jest.mock('@/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/components/Masthead', () => ({ Masthead: 'Masthead' }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router, useLocalSearchParams } = require('expo-router') as {
  router: { back: jest.Mock; replace: jest.Mock; push: jest.Mock };
  useLocalSearchParams: jest.Mock;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { signUp } = require('@/lib/authApi') as { signUp: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth } = require('@/context/AuthContext') as { useAuth: jest.Mock };

// eslint-disable-next-line @typescript-eslint/no-var-requires
const SignUpScreen = require('../sign-up').default;

async function reachVerifyPhase(getByText: ReturnType<typeof render>['getByText']) {
  fireEvent.changeText(getByText(/Display Name/i).parent!, ''); // ensure inputs accessible
  // Submit the form to trigger phase=verify
  fireEvent.press(getByText('Create Account'));
  // Allow promise chain to resolve.
  await new Promise(r => setTimeout(r, 0));
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ isAnonymous: false, reloadUser: jest.fn() });
});

describe('SignUp verify phase — navigation CTAs (AC1.10, AC7.13)', () => {
  test('when from=reveal, renders BOTH "Back to Answers" and "Back to Home"', async () => {
    useLocalSearchParams.mockReturnValue({ from: 'reveal' });
    signUp.mockResolvedValue(undefined);

    const { getByText, queryByText, findByText, getAllByText } = render(<SignUpScreen />);
    // The first "Create Account" text is the card title; the second is the button.
    const submits = getAllByText('Create Account');
    fireEvent.press(submits[submits.length - 1]);

    await findByText('Check your inbox');
    expect(getByText('Back to Answers')).toBeTruthy();
    expect(getByText('Back to Home')).toBeTruthy();
    expect(queryByText('Back to Games')).toBeNull();
    expect(queryByText('Continue to Games')).toBeNull();
  });

  test('when from is not "reveal", renders ONLY "Back to Home" (no "Back to Answers")', async () => {
    useLocalSearchParams.mockReturnValue({});
    signUp.mockResolvedValue(undefined);

    const { getByText, queryByText, findByText, getAllByText } = render(<SignUpScreen />);
    // The first "Create Account" text is the card title; the second is the button.
    const submits = getAllByText('Create Account');
    fireEvent.press(submits[submits.length - 1]);

    await findByText('Check your inbox');
    expect(getByText('Back to Home')).toBeTruthy();
    expect(queryByText('Back to Answers')).toBeNull();
  });

  test('"Back to Answers" calls router.back()', async () => {
    useLocalSearchParams.mockReturnValue({ from: 'reveal' });
    signUp.mockResolvedValue(undefined);

    const { getByText, findByText, getAllByText } = render(<SignUpScreen />);
    const submits = getAllByText('Create Account');
    fireEvent.press(submits[submits.length - 1]);

    await findByText('Check your inbox');
    fireEvent.press(getByText('Back to Answers'));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('"Back to Home" calls router.replace("/")', async () => {
    useLocalSearchParams.mockReturnValue({ from: 'reveal' });
    signUp.mockResolvedValue(undefined);

    const { getByText, findByText, getAllByText } = render(<SignUpScreen />);
    const submits = getAllByText('Create Account');
    fireEvent.press(submits[submits.length - 1]);

    await findByText('Check your inbox');
    fireEvent.press(getByText('Back to Home'));
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
  });
});
