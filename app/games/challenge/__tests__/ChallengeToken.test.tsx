import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// Override expo-router mock so we can control useLocalSearchParams per test.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(),
  Link: 'Link',
}));

jest.mock('@/lib/challengeApi', () => ({ fetchChallenge: jest.fn() }));
jest.mock('firebase/auth', () => ({ signOut: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/firebase', () => ({ auth: {}, db: {} }));
jest.mock('@/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/context/GameContext', () => ({ useGame: jest.fn() }));
jest.mock('@/components/Masthead', () => ({ Masthead: 'Masthead' }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLocalSearchParams } = require('expo-router') as { useLocalSearchParams: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fetchChallenge } = require('@/lib/challengeApi') as { fetchChallenge: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { signOut } = require('firebase/auth') as { signOut: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth } = require('@/context/AuthContext') as { useAuth: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useGame } = require('@/context/GameContext') as { useGame: jest.Mock };

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ChallengeScreen = require('../[token]').default;

const VALID_PAYLOAD = {
  gameId: 'lede',
  questionIndex: 3,
  senderName: 'Richard',
  senderPrediction: 'Reporter A',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
};

const SENT_INTERACTION = {
  id: 'int-1',
  type: 'sent_challenge' as const,
  token: 'TESTABC1',
  friendName: 'Bob',
  gameId: 'lede' as const,
  questionIndex: 3,
  shieldEarned: false,
  date: '2026-04-27',
};

function makeGame(friendInteractions: object[] = []) {
  return {
    isLoaded: true,
    state: { friendInteractions },
    addFriendInteraction: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchChallenge.mockResolvedValue(VALID_PAYLOAD);
  useAuth.mockReturnValue({ user: { uid: 'uid-richard', displayName: 'Richard' }, isAnonymous: false });
  useLocalSearchParams.mockReturnValue({ token: 'TESTABC1' });
});

describe('ChallengeScreen - self-challenge guard', () => {
  test('shows guard when token matches a sent_challenge interaction', async () => {
    useGame.mockReturnValue(makeGame([SENT_INTERACTION]));
    const { getByTestId } = render(<ChallengeScreen />);
    await waitFor(() => expect(getByTestId('self-challenge-guard')).toBeTruthy());
  });

  test('does not record received_challenge when isSender is true', async () => {
    const addFriendInteraction = jest.fn();
    useGame.mockReturnValue({ ...makeGame([SENT_INTERACTION]), addFriendInteraction });
    render(<ChallengeScreen />);
    await waitFor(() => expect(fetchChallenge).toHaveBeenCalled());
    expect(addFriendInteraction).not.toHaveBeenCalled();
  });

  test('sign out button calls signOut', async () => {
    useGame.mockReturnValue(makeGame([SENT_INTERACTION]));
    const { getByTestId } = render(<ChallengeScreen />);
    await waitFor(() => expect(getByTestId('self-challenge-guard')).toBeTruthy());
    fireEvent.press(getByTestId('self-challenge-signout-btn'));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  test('shows normal challenge UI when token does not match any sent_challenge', async () => {
    useGame.mockReturnValue(makeGame([]));
    const { getByText } = render(<ChallengeScreen />);
    await waitFor(() => expect(getByText(/Challenge from Richard/i)).toBeTruthy());
  });

  test('does not show guard when isAnonymous=true even if token matches a sent_challenge', async () => {
    useAuth.mockReturnValue({ user: null, isAnonymous: true });
    useGame.mockReturnValue(makeGame([SENT_INTERACTION]));
    const { getByText, queryByTestId } = render(<ChallengeScreen />);
    await waitFor(() => expect(getByText(/Challenge from Richard/i)).toBeTruthy());
    expect(queryByTestId('self-challenge-guard')).toBeNull();
  });

  test('records received_challenge when not the sender', async () => {
    const addFriendInteraction = jest.fn();
    useGame.mockReturnValue({ ...makeGame([]), addFriendInteraction });
    render(<ChallengeScreen />);
    await waitFor(() => expect(addFriendInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'received_challenge' }),
    ));
  });
});
