import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/authApi', () => ({ signOutAndGoAnonymous: jest.fn() }));
jest.mock('@/context/GameContext', () => ({
  useGame: () => ({
    state: { stats: { dailyStreak: 0, streakShieldsAvailable: 0 } },
    isLoaded: true,
  }),
}));
jest.mock('@/context/ContentContext', () => ({
  useContent: () => ({ contentWeek: '', banks: {}, isLoading: false, reload: jest.fn(), versionId: '' }),
}));
jest.mock('firebase/firestore', () => ({}));
jest.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));

const { useAuth } = require('@/context/AuthContext') as { useAuth: jest.Mock };

import ProfileScreen from '../profile';

const anonAuth = { user: null, isAnonymous: true, displayName: null };

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue(anonAuth);
  delete process.env.EXPO_PUBLIC_USE_EMULATOR;
});

describe('Profile — Clear local data button', () => {
  it('shows in dev mode (emulator)', () => {
    // __DEV__ is true in the Jest/React Native environment
    const { getByText } = render(<ProfileScreen />);
    expect(getByText(/clear local data/i)).toBeTruthy();
  });

  it('shows in QA mode (prod Firebase, EXPO_PUBLIC_USE_EMULATOR=false)', () => {
    process.env.EXPO_PUBLIC_USE_EMULATOR = 'false';
    const { getByText } = render(<ProfileScreen />);
    expect(getByText(/clear local data/i)).toBeTruthy();
  });
});
