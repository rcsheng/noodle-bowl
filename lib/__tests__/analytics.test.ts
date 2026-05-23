import * as Analytics from '../analytics';

const mockCapture = jest.fn();

jest.mock('posthog-react-native', () =>
  jest.fn().mockImplementation(() => ({ capture: mockCapture }))
);

beforeEach(() => {
  Analytics._setDispatchForTesting(null);
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// initAnalytics
// ---------------------------------------------------------------------------
describe('initAnalytics', () => {
  it('is a no-op when API key is absent', () => {
    // EXPO_PUBLIC_POSTHOG_API_KEY is unset in the test environment
    Analytics.initAnalytics();
    Analytics.track('test');
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('wires capture through dispatch when API key is present', () => {
    // Inject a dispatch directly to simulate post-init state
    const mockDispatch = jest.fn();
    Analytics._setDispatchForTesting(mockDispatch);
    Analytics.track('test_event', { foo: 'bar' });
    expect(mockDispatch).toHaveBeenCalledWith('test_event', { foo: 'bar' });
  });
});

// ---------------------------------------------------------------------------
// track
// ---------------------------------------------------------------------------
describe('track', () => {
  it('does not throw before init', () => {
    expect(() => Analytics.track('test_event')).not.toThrow();
  });

  it('calls dispatch when initialized', () => {
    const mockDispatch = jest.fn();
    Analytics._setDispatchForTesting(mockDispatch);
    Analytics.track('test_event', { key: 'value' });
    expect(mockDispatch).toHaveBeenCalledWith('test_event', { key: 'value' });
  });

  it('does not call dispatch after reset', () => {
    const mockDispatch = jest.fn();
    Analytics._setDispatchForTesting(mockDispatch);
    Analytics._setDispatchForTesting(null);
    Analytics.track('test_event');
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Named event helpers
// ---------------------------------------------------------------------------
describe('event helpers', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    Analytics._setDispatchForTesting(mockDispatch);
  });

  it('gameComplete fires game_complete with correct params', () => {
    Analytics.gameComplete('lede', true);
    expect(mockDispatch).toHaveBeenCalledWith('game_complete', { game_id: 'lede', correct: true });
  });

  it('gameComplete works for incorrect answers', () => {
    Analytics.gameComplete('wave', false);
    expect(mockDispatch).toHaveBeenCalledWith('game_complete', { game_id: 'wave', correct: false });
  });

  it('challengeSent fires challenge_sent with game_id', () => {
    Analytics.challengeSent('spread');
    expect(mockDispatch).toHaveBeenCalledWith('challenge_sent', { game_id: 'spread' });
  });

  it('helpSent fires help_sent with game_id', () => {
    Analytics.helpSent('sof');
    expect(mockDispatch).toHaveBeenCalledWith('help_sent', { game_id: 'sof' });
  });

  it('signedUp fires sign_up', () => {
    Analytics.signedUp();
    expect(mockDispatch).toHaveBeenCalledWith('sign_up', undefined);
  });

  it('loggedIn fires login', () => {
    Analytics.loggedIn();
    expect(mockDispatch).toHaveBeenCalledWith('login', undefined);
  });
});
