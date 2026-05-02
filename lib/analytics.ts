import PostHog from 'posthog-react-native';

type EventParams = Record<string, string | number | boolean>;

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const HOST = 'https://us.i.posthog.com';

let _dispatch: ((name: string, params?: EventParams) => void) | null = null;

export function initAnalytics(): void {
  if (!API_KEY) return;
  const client = new PostHog(API_KEY, { host: HOST });
  _dispatch = (name, params) => client.capture(name, params);
}

export function track(name: string, params?: EventParams): void {
  _dispatch?.(name, params);
}

export function _setDispatchForTesting(fn: ((name: string, params?: EventParams) => void) | null): void {
  _dispatch = fn;
}

export const gameComplete = (gameId: string, correct: boolean, points: number): void =>
  track('game_complete', { game_id: gameId, correct, points });

export const challengeSent = (gameId: string): void =>
  track('challenge_sent', { game_id: gameId });

export const helpSent = (gameId: string): void =>
  track('help_sent', { game_id: gameId });

export const signedUp = (): void => track('sign_up');

export const loggedIn = (): void => track('login');

// Slurp analytics
export const slurpRunStarted = (brothBase: string): void =>
  track('slurp_run_started', { broth_base: brothBase });

export const slurpTastingWon = (course: number, tasting: number, score: number, slurpsUsed: number): void =>
  track('slurp_tasting_won', { course, tasting, score, slurps_used: slurpsUsed });

export const slurpTastingLost = (course: number, tasting: number, score: number, quota: number): void =>
  track('slurp_tasting_lost', { course, tasting, score, quota });

export const slurpRunCompleted = (finalScore: number, toppingCount: number, pantryCount: number): void =>
  track('slurp_run_completed', { final_score: finalScore, topping_count: toppingCount, pantry_count: pantryCount });

export const slurpRunAbandoned = (course: number, tasting: number): void =>
  track('slurp_run_abandoned', { course, tasting });

export const slurpMarketPurchase = (itemType: string, itemId: string, cost: number): void =>
  track('slurp_market_purchase', { item_type: itemType, item_id: itemId, cost });

export const slurpEndlessMode = (finalScoreSoFar: number): void =>
  track('slurp_endless_course', { final_score_so_far: finalScoreSoFar });
