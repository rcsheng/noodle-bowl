import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { GameProvider, useGame } from '../GameContext';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({ db: {} }));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = require('@/context/AuthContext') as { useAuth: jest.Mock };
const { getDocs, setDoc } = require('firebase/firestore') as {
  getDocs: jest.Mock;
  setDoc: jest.Mock;
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

const baseInteraction = {
  type: 'sent_help' as const,
  friendName: 'A',
  gameId: 'lede' as const,
  questionIndex: 0,
  shieldEarned: false,
};

describe('GameContext Firestore persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDocs.mockResolvedValue({ docs: [] });
  });

  test('addFriendInteraction dispatches locally when isAnonymous=true and does NOT call setDoc', async () => {
    useAuth.mockReturnValue({ user: { uid: 'anon1', isAnonymous: true }, isAnonymous: true });

    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => {
      result.current.addFriendInteraction(baseInteraction);
    });

    expect(setDoc).not.toHaveBeenCalled();
    expect(result.current.state.friendInteractions).toHaveLength(1);
  });

  test('addFriendInteraction calls setDoc when signed in', async () => {
    useAuth.mockReturnValue({ user: { uid: 'user1', isAnonymous: false }, isAnonymous: false });
    getDocs.mockResolvedValue({ docs: [] });
    setDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => {
      result.current.addFriendInteraction(baseInteraction);
    });

    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  test('loads friendInteractions from Firestore when user is not anonymous', async () => {
    useAuth.mockReturnValue({ user: { uid: 'user1', isAnonymous: false }, isAnonymous: false });
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            id: '123',
            type: 'sent_help',
            friendName: 'A',
            gameId: 'lede',
            questionIndex: 0,
            date: '2026-01-01',
            shieldEarned: false,
          }),
        },
      ],
    });

    const { result } = renderHook(() => useGame(), { wrapper });

    // Wait for: AsyncStorage to resolve (setting isLoaded=true), then Firestore to load and dispatch
    await act(async () => {
      // Flush AsyncStorage promise chain: getItem -> .then -> .catch -> .finally -> setIsLoaded
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      // Now isLoaded=true triggers Firestore useEffect; flush getDocs promise chain
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.state.friendInteractions.some(i => i.id === '123')).toBe(true);
  });
});
