import React from 'react';
import { act, fireEvent, render, within } from '@testing-library/react-native';

jest.mock('@/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/context/ContentContext', () => ({ useContent: jest.fn() }));
jest.mock('@/context/GameContext', () => ({ useGame: jest.fn() }));
jest.mock('@/lib/authGuard', () => ({
  useAuthGate: () => ({
    requireAuth: (f: () => void) => f(),
    authGateVisible: false,
    dismissAuthGate: jest.fn(),
  }),
}));
jest.mock('@/lib/challengeApi', () => ({
  createChallenge: jest.fn(),
  respondToChallenge: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/helpApi', () => ({
  createHelp: jest.fn(),
  respondToHelp: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/pushTokens', () => ({ getCachedPushToken: jest.fn().mockReturnValue(null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));
jest.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
}));

const { useAuth } = require('@/context/AuthContext') as { useAuth: jest.Mock };
const { useContent } = require('@/context/ContentContext') as { useContent: jest.Mock };
const { useGame } = require('@/context/GameContext') as { useGame: jest.Mock };
const { useLocalSearchParams } = require('expo-router') as { useLocalSearchParams: jest.Mock };

import { LedeItem } from '@/constants/data';
import { initialState } from '@/context/gameReducer';
import LedeScreen from '../lede';

// partialHeadline has ___ midway so replace() is meaningful
const ITEM: LedeItem = {
  partialHeadline: 'Banks ordered to stop ___ by regulators',
  sourceHint: 'test',
  panelists: [
    { name: 'Alice', role: 'Reporter', pitch: 'pitch1', isCorrect: false, completion: 'funding AI models' },
    { name: 'Bob', role: 'Editor', pitch: 'pitch2', isCorrect: true, completion: 'sharing client data' },
    { name: 'Charlie', role: 'Analyst', pitch: 'pitch3', isCorrect: false, completion: 'paying dividends' },
  ],
  explanation: 'A 1963 law still prohibits this practice.',
};

function defaultGameState() {
  return {
    state: initialState,
    isLoaded: true,
    updateGameStats: jest.fn(),
    setSeen: jest.fn(),
    addFriendInteraction: jest.fn(),
    earnStreakShield: jest.fn(),
    removeFriendInteraction: jest.fn(),
    dismissHelpCard: jest.fn(),
    dismissStreakSavedBanner: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useLocalSearchParams.mockReturnValue({});
  useAuth.mockReturnValue({ user: null, isAnonymous: true, displayName: null });
  useContent.mockReturnValue({
    banks: { lede: [ITEM], spread: [], sof: [], wave: [], quip: [] },
    isLoaded: true,
  });
  useGame.mockReturnValue(defaultGameState());
});

// ── helpers ──────────────────────────────────────────────────────────────────

async function renderAndWait() {
  const screen = render(<LedeScreen />);
  await act(async () => {});
  return screen;
}

async function reachReveal(screen: ReturnType<typeof render>) {
  // press any choice to enable Lock In
  fireEvent.press(screen.getByText('funding AI models'));
  await act(async () => {});
  fireEvent.press(screen.getByText(/Lock In/i));
  await act(async () => {});
}

// ── pill always shows '...' ───────────────────────────────────────────────────

describe('Lede headline pill', () => {
  it('shows ... before any selection', async () => {
    const { getByTestId } = await renderAndWait();
    const pill = getByTestId('lede-headline-pill');
    expect(pill.props.children).toContain('...');
  });

  it('still shows ... after a choice is selected', async () => {
    const { getByTestId, getByText } = await renderAndWait();
    fireEvent.press(getByText('funding AI models'));
    await act(async () => {});
    const pill = getByTestId('lede-headline-pill');
    expect(pill.props.children).toContain('...');
  });

  it('does not show a letter (A/B/C) in the pill after selection', async () => {
    const { getByTestId, getByText } = await renderAndWait();
    fireEvent.press(getByText('funding AI models'));
    await act(async () => {});
    const pillText: string = String(getByTestId('lede-headline-pill').props.children);
    expect(pillText.trim()).not.toMatch(/^[ABC]$/);
  });
});

// ── friend hint rendering ─────────────────────────────────────────────────────

describe('Lede friend hint', () => {
  it('shows a hint indicator on the hinted panelist option', async () => {
    useLocalSearchParams.mockReturnValue({
      hintQuestionIndex: '0',
      friendHint: '1', // friend picked panelist index 1 (Bob)
    });
    const { getByTestId } = await renderAndWait();
    expect(getByTestId('choice-friend-hint-1')).toBeTruthy();
  });

  it('does not show a hint indicator on the wrong option', async () => {
    useLocalSearchParams.mockReturnValue({
      hintQuestionIndex: '0',
      friendHint: '1',
    });
    const { queryByTestId } = await renderAndWait();
    expect(queryByTestId('choice-friend-hint-0')).toBeNull();
    expect(queryByTestId('choice-friend-hint-2')).toBeNull();
  });

  it('shows no hint indicator when friendHint is absent', async () => {
    useLocalSearchParams.mockReturnValue({});
    const { queryByTestId } = await renderAndWait();
    expect(queryByTestId('choice-friend-hint-0')).toBeNull();
    expect(queryByTestId('choice-friend-hint-1')).toBeNull();
  });
});

// ── combined reveal box ───────────────────────────────────────────────────────

describe('Lede reveal box', () => {
  it('renders the explanation in reveal', async () => {
    const screen = await renderAndWait();
    await reachReveal(screen);
    expect(screen.getByText('A 1963 law still prohibits this practice.')).toBeTruthy();
  });

  it('shows explanation inside the reveal box', async () => {
    const screen = await renderAndWait();
    await reachReveal(screen);
    const box = screen.getByTestId('lede-reveal-box');
    const { getByText } = within(box);
    expect(getByText('A 1963 law still prohibits this practice.')).toBeTruthy();
  });

  it('does not show reporter names in the reveal', async () => {
    const screen = await renderAndWait();
    await reachReveal(screen);
    expect(screen.queryByText('Alice')).toBeNull();
    expect(screen.queryByText('Bob')).toBeNull();
    expect(screen.queryByText('Charlie')).toBeNull();
  });
});

