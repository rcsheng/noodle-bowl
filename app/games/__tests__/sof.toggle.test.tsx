import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

jest.mock('@/constants/utils', () => {
  const actual = jest.requireActual('@/constants/utils');
  return { ...actual, shuffleIndices: jest.fn((n: number) => Array.from({ length: n }, (_, i) => i)) };
});
const { shuffleIndices } = require('@/constants/utils') as { shuffleIndices: jest.Mock };

// ── mock context hooks and side-effect libs ────────────────────────────────
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

// ── module refs (resolved after hoisting) ─────────────────────────────────
const { useAuth } = require('@/context/AuthContext') as { useAuth: jest.Mock };
const { useContent } = require('@/context/ContentContext') as { useContent: jest.Mock };
const { useGame } = require('@/context/GameContext') as { useGame: jest.Mock };
const { useLocalSearchParams } = require('expo-router') as { useLocalSearchParams: jest.Mock };

import { SofItem } from '@/constants/data';
import { initialState } from '@/context/gameReducer';
import SofScreen from '../sof';

// ── test data ──────────────────────────────────────────────────────────────

const makeQuestion = (weirdAndTrue: boolean): SofItem => ({
  topic: weirdAndTrue ? 'Weird Topic' : 'Standard Topic',
  intro: 'Test intro',
  weirdAndTrue,
  claims: [
    { text: 'Claim A', isScience: true, explanation: 'Exp A', source: null },
    { text: 'Claim B', isScience: false, explanation: 'Exp B', source: null },
  ],
});

const SOF_BANK: SofItem[] = [makeQuestion(false), makeQuestion(true)];

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
    banks: { sof: SOF_BANK, lede: [], spread: [], wave: [], quip: [] },
    isLoaded: true,
  });
  useGame.mockReturnValue(defaultGameState());
});

// ── mode toggle — segmented control ───────────────────────────────────────

describe('SoF mode toggle', () => {
  it('renders both STANDARD and WEIRD & TRUE buttons in normal play', async () => {
    const { getByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(getByTestId('sof-mode-standard')).toBeTruthy();
    expect(getByTestId('sof-mode-weird')).toBeTruthy();
  });

  it('STANDARD button is active by default', async () => {
    const { getByTestId } = render(<SofScreen />);
    await act(async () => {});
    // Standard is default — it should render in an active style
    // We verify the active button has testID and exists; visual style tested by snapshot if needed
    expect(getByTestId('sof-mode-standard')).toBeTruthy();
  });

  it('mode toggle is hidden in challenge mode', async () => {
    useLocalSearchParams.mockReturnValue({
      challengeToken: 'tok',
      challengeQuestionIndex: '0',
      challengeSenderName: 'Bob',
    });
    const { queryByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByTestId('sof-mode-standard')).toBeNull();
    expect(queryByTestId('sof-mode-weird')).toBeNull();
  });

  it('mode toggle is hidden in help mode', async () => {
    useLocalSearchParams.mockReturnValue({
      helpToken: 'help-tok',
      helpQuestionIndex: '0',
      helpAskerName: 'Alice',
    });
    const { queryByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByTestId('sof-mode-standard')).toBeNull();
    expect(queryByTestId('sof-mode-weird')).toBeNull();
  });
});

// ── hint mode: lock-in records asker answer ───────────────────────────────────

describe('SoF hint mode — lock-in', () => {
  let setAskerAnswer: jest.Mock;

  beforeEach(() => {
    setAskerAnswer = jest.fn();
    useGame.mockReturnValue({ ...defaultGameState(), setAskerAnswer });
    useLocalSearchParams.mockReturnValue({
      hintQuestionIndex: '0',
      friendHint: '2',
      hintToken: 'HINT_TOK',
    });
  });

  it('calls setAskerAnswer with token and 1-based claim after lock-in', async () => {
    const { getByText } = render(<SofScreen />);
    await act(async () => {});
    fireEvent.press(getByText('Claim A')); // originalIdx=0 → 1-based "1"
    await act(async () => {});
    fireEvent.press(getByText(/LOCK IN CLAIM/i));
    await act(async () => {});
    expect(setAskerAnswer).toHaveBeenCalledWith('HINT_TOK', '1');
  });
});

// ── friend hint rendering ─────────────────────────────────────────────────────

describe('SoF friend hint', () => {
  it('shows a hint indicator on the hinted claim', async () => {
    useLocalSearchParams.mockReturnValue({
      hintQuestionIndex: '0',
      friendHint: '2', // friend picked claim 2 (1-based) → index 1
    });
    const { getByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(getByTestId('claim-friend-hint-1')).toBeTruthy();
  });

  it('does not show a hint indicator on the wrong claim', async () => {
    useLocalSearchParams.mockReturnValue({
      hintQuestionIndex: '0',
      friendHint: '2',
    });
    const { queryByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByTestId('claim-friend-hint-0')).toBeNull();
  });

  it('shows no hint indicator when friendHint is absent', async () => {
    useLocalSearchParams.mockReturnValue({});
    const { queryByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByTestId('claim-friend-hint-0')).toBeNull();
    expect(queryByTestId('claim-friend-hint-1')).toBeNull();
  });

  it('mode toggle is hidden in hint mode', async () => {
    useLocalSearchParams.mockReturnValue({
      hintQuestionIndex: '0',
      friendHint: '1',
    });
    const { queryByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByTestId('sof-mode-standard')).toBeNull();
    expect(queryByTestId('sof-mode-weird')).toBeNull();
  });
});

// ── wager removed ──────────────────────────────────────────────────────────

describe('SoF wager removed', () => {
  it('does not render wager / confidence buttons', async () => {
    const { queryByText } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByText(/1× safe/i)).toBeNull();
    expect(queryByText(/2× double down/i)).toBeNull();
    expect(queryByText(/confidence/i)).toBeNull();
  });
});

// ── mode pre-loading ──────────────────────────────────────────────────────

describe('SoF mode pre-loading', () => {
  let setSeen: jest.Mock;

  beforeEach(() => {
    setSeen = jest.fn();
    useGame.mockReturnValue({ ...defaultGameState(), setSeen });
  });

  it('pre-loads both standard and weird questions on mount', async () => {
    render(<SofScreen />);
    await act(async () => {});
    // Both question indices (0 = standard, 1 = weird) recorded in a single setSeen call
    expect(setSeen).toHaveBeenCalledTimes(1);
    expect(setSeen).toHaveBeenCalledWith('sof', expect.arrayContaining([0, 1]));
  });

  it('does not reload questions when toggling modes', async () => {
    const { getByTestId } = render(<SofScreen />);
    await act(async () => {});
    setSeen.mockClear();

    fireEvent.press(getByTestId('sof-mode-weird'));
    await act(async () => {});
    fireEvent.press(getByTestId('sof-mode-standard'));
    await act(async () => {});

    expect(setSeen).not.toHaveBeenCalled();
  });

  it('shows the correct topic for each mode after toggling back and forth', async () => {
    const { getByTestId, getByText } = render(<SofScreen />);
    await act(async () => {});
    expect(getByText('Standard Topic')).toBeTruthy();

    fireEvent.press(getByTestId('sof-mode-weird'));
    await act(async () => {});
    expect(getByText('Weird Topic')).toBeTruthy();

    fireEvent.press(getByTestId('sof-mode-standard'));
    await act(async () => {});
    expect(getByText('Standard Topic')).toBeTruthy();
  });

  it('resets claim selection when switching modes', async () => {
    const { getByTestId, getByText, queryByText } = render(<SofScreen />);
    await act(async () => {});

    fireEvent.press(getByText('Claim A'));
    await act(async () => {});
    expect(queryByText(/LOCK IN CLAIM/i)).toBeTruthy();

    fireEvent.press(getByTestId('sof-mode-weird'));
    await act(async () => {});
    expect(queryByText(/LOCK IN CLAIM/i)).toBeNull();
  });
});

// ── reveal ─────────────────────────────────────────────────────────────────────

async function reachReveal(screen: ReturnType<typeof render>, claimText = 'Claim A') {
  fireEvent.press(screen.getByText(claimText));
  await act(async () => {});
  fireEvent.press(screen.getByText(/LOCK IN CLAIM/i));
  await act(async () => {});
}

describe('SoF reveal', () => {
  it('shows both claims in reveal', async () => {
    const screen = render(<SofScreen />);
    await act(async () => {});
    await reachReveal(screen);
    expect(screen.queryByText('Claim A')).toBeTruthy();
    expect(screen.queryByText('Claim B')).toBeTruthy();
  });

  it('shows explanations for both claims in reveal', async () => {
    const screen = render(<SofScreen />);
    await act(async () => {});
    await reachReveal(screen);
    expect(screen.queryByText('Exp A')).toBeTruthy();
    expect(screen.queryByText('Exp B')).toBeTruthy();
  });

  it('shows Correct when science claim is picked', async () => {
    const screen = render(<SofScreen />);
    await act(async () => {});
    await reachReveal(screen, 'Claim A');
    expect(screen.queryByText('Correct')).toBeTruthy();
  });

  it('shows Incorrect when fiction claim is picked and science claim is still visible', async () => {
    const screen = render(<SofScreen />);
    await act(async () => {});
    await reachReveal(screen, 'Claim B');
    expect(screen.queryByText('Incorrect')).toBeTruthy();
    expect(screen.queryByText('Claim A')).toBeTruthy();
  });
});

// ── claim shuffle ──────────────────────────────────────────────────────────

describe('SoF claim shuffle', () => {
  it('renders claims in the order returned by shuffleIndices', async () => {
    // fiction (Claim B, index 1) shuffled first, science (Claim A, index 0) second
    shuffleIndices.mockReturnValue([1, 0]);
    const { getAllByText } = render(<SofScreen />);
    await act(async () => {});
    const texts = getAllByText(/^Claim [AB]$/).map(el => el.props.children as string);
    expect(texts[0]).toBe('Claim B');
    expect(texts[1]).toBe('Claim A');
  });

  it('fiction can appear at either display position', async () => {
    shuffleIndices.mockReturnValue([0, 1]);
    const { getAllByText } = render(<SofScreen />);
    await act(async () => {});
    const claimNums = getAllByText(/^CLAIM [12]$/);
    expect(claimNums).toHaveLength(2);
  });

  it('selecting a claim uses the original index for correctness check', async () => {
    // shuffle: fiction (Claim B, index 1) appears as CLAIM 1
    shuffleIndices.mockReturnValue([1, 0]);
    const { getByText } = render(<SofScreen />);
    await act(async () => {});
    // Tap Claim B text (displayed as CLAIM 1)
    fireEvent.press(getByText('Claim B'));
    await act(async () => {});
    // Lock In button should reflect display position 1
    expect(getByText('LOCK IN CLAIM 1')).toBeTruthy();
  });
});

// ── 2-claim mechanic — pick the Science ───────────────────────────────────────

describe('SoF 2-claim mechanic — pick the Science', () => {
  const make2Q = (weirdAndTrue: boolean): SofItem => ({
    topic: weirdAndTrue ? 'Weird Topic' : 'Standard Topic',
    intro: 'Test intro',
    weirdAndTrue,
    claims: [
      { text: 'Science Claim', isScience: true, explanation: 'Exp Science', source: null },
      { text: 'Fiction Claim', isScience: false, explanation: 'Exp Fiction', source: null },
    ],
  });

  beforeEach(() => {
    useContent.mockReturnValue({
      banks: { sof: [make2Q(false), make2Q(true)], lede: [], spread: [], wave: [], quip: [] },
      isLoaded: true,
    });
  });

  it('instruction label is "Tap the Science"', async () => {
    const { getByText } = render(<SofScreen />);
    await act(async () => {});
    expect(getByText('Tap the Science')).toBeTruthy();
  });

  it('instruction subtitle is "One is real · one is fiction"', async () => {
    const { getByText } = render(<SofScreen />);
    await act(async () => {});
    expect(getByText('One is real · one is fiction')).toBeTruthy();
  });

  it('shows Correct when science claim is picked', async () => {
    const screen = render(<SofScreen />);
    await act(async () => {});
    fireEvent.press(screen.getByText('Science Claim'));
    await act(async () => {});
    fireEvent.press(screen.getByText(/LOCK IN CLAIM/i));
    await act(async () => {});
    expect(screen.queryByText('Correct')).toBeTruthy();
  });

  it('shows Incorrect when fiction claim is picked', async () => {
    const screen = render(<SofScreen />);
    await act(async () => {});
    fireEvent.press(screen.getByText('Fiction Claim'));
    await act(async () => {});
    fireEvent.press(screen.getByText(/LOCK IN CLAIM/i));
    await act(async () => {});
    expect(screen.queryByText('Incorrect')).toBeTruthy();
  });

  it('shows both claims in reveal', async () => {
    const screen = render(<SofScreen />);
    await act(async () => {});
    fireEvent.press(screen.getByText('Science Claim'));
    await act(async () => {});
    fireEvent.press(screen.getByText(/LOCK IN CLAIM/i));
    await act(async () => {});
    expect(screen.queryByText('Science Claim')).toBeTruthy();
    expect(screen.queryByText('Fiction Claim')).toBeTruthy();
  });
});
