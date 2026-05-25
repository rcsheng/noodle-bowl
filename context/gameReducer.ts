import { GameId } from '@/constants/data';
import { getISOWeekYear, formatWeekId } from '@/lib/contentWeek';

/**
 * Returns `val` if it is a finite number, otherwise `fallback`.
 * Handles undefined, null, and NaN — all of which survive `?? 0` and
 * can cause silent arithmetic breakage (NaN + 1 = NaN).
 */
function safeNum(val: number | undefined | null, fallback: number): number {
  return typeof val === 'number' && isFinite(val) ? val : fallback;
}

export interface FriendInteraction {
  id: string;
  type: 'received_help' | 'gave_help' | 'sent_challenge' | 'challenge_accepted' | 'received_challenge' | 'sent_help';
  friendName: string;
  gameId: GameId;
  questionIndex: number;
  date: string; // YYYY-MM-DD
  shieldEarned: boolean;
  token?: string;
  senderPrediction?: string;
  friendAnswer?: string;
  askerAnswer?: string;
  bonusPointsEarned?: number;
  homeCardDismissed?: boolean;
  contentWeek?: string; // ISO week of the question; absent on old interactions
}

interface GameStats {
  played: number;
  correct: number;
  streak: number;
  bestStreak: number;
  lastPlayed?: string;
}

export interface OnboardingFlags {
  streakIntroSeen: boolean;       // §1a: StreakIgnitionModal shown
  shieldPrimerSeen: boolean;      // §1b: ShieldPrimerModal shown
  firstShieldEarnedSeen: boolean; // §1c: FirstShieldEarnedModal shown
  firstShieldSaveSeen: boolean;   // §1d: ShieldSavedModal shown
  atRiskWeekDismissed: string | null; // §1e: weekId of last dismissed at-risk banner
}

interface AppState {
  stats: {
    weeklyStreak: number;
    bestWeeklyStreak: number;
    lastPlayedWeek: string | null;
    totalWeeksPlayed: number;
    streakShieldsAvailable: number;
    streakShieldUsedThisWeek: boolean;
    streakSavedBannerSeen: boolean;
    showStreakCelebration: boolean;
    onboarding: OnboardingFlags;
    recentPlayedWeeks: string[]; // last ≤6 weekIds when user played; for week-chain UI
    shieldSaveWeeks: string[];   // weekIds when a shield saved the streak; for week-chain UI
    lede: GameStats;
    spread: GameStats;
    sof: GameStats;
    quip: GameStats;
    wave: GameStats;
  };
  seen: Record<GameId, number[]>;
  seenWeek: string; // ISO week string when seen arrays were last populated, e.g. "2026-W20"
  friendInteractions: FriendInteraction[];
}

export type { AppState, GameStats };

/** Maximum shields a player can hold at one time. */
const MAX_SHIELDS = 3;

const defaultGameStats: GameStats = { played: 0, correct: 0, streak: 0, bestStreak: 0 };

const defaultOnboarding: OnboardingFlags = {
  streakIntroSeen: false,
  shieldPrimerSeen: false,
  firstShieldEarnedSeen: false,
  firstShieldSaveSeen: false,
  atRiskWeekDismissed: null,
};

export const initialState: AppState = {
  stats: {
    weeklyStreak: 0,
    bestWeeklyStreak: 0,
    lastPlayedWeek: null,
    totalWeeksPlayed: 0,
    streakShieldsAvailable: 0,
    streakShieldUsedThisWeek: false,
    streakSavedBannerSeen: true,
    showStreakCelebration: false,
    onboarding: { ...defaultOnboarding },
    recentPlayedWeeks: [],
    shieldSaveWeeks: [],
    lede: { ...defaultGameStats },
    spread: { ...defaultGameStats },
    sof: { ...defaultGameStats },
    quip: { ...defaultGameStats },
    wave: { ...defaultGameStats },
  },
  seen: { quip: [], spread: [], lede: [], wave: [], sof: [] },
  seenWeek: '',
  friendInteractions: [],
};

/** Returns the ISO week string for the week before the given ISO week string. */
export function getPreviousWeek(isoWeek: string): string {
  // Subtract 7 days from Monday of the given week, then re-derive the ISO week.
  const [yearStr, weekStr] = isoWeek.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  // Jan 4 of the ISO year is always in week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7; // 1=Mon … 7=Sun
  const week1Mon = new Date(jan4.getTime() - (dow - 1) * 86_400_000);
  const targetMon = new Date(week1Mon.getTime() + (week - 1) * 7 * 86_400_000);
  const prevMon = new Date(targetMon.getTime() - 7 * 86_400_000);
  const { year: prevYear, week: prevWeekNum } = getISOWeekYear(prevMon);
  return formatWeekId(prevYear, prevWeekNum);
}

export type Action =
  | { type: 'LOAD'; payload: { stats?: Partial<AppState['stats']>; seen?: Partial<AppState['seen']>; seenWeek?: string; friendInteractions?: FriendInteraction[] }; activeWeek?: string }
  | { type: 'UPDATE_STATS'; game: GameId; correct: boolean; today: string }
  | { type: 'UPDATE_WEEKLY_STREAK'; weekId: string }
  | { type: 'SET_SEEN'; game: GameId; seen: number[] }
  | { type: 'EARN_SHIELD' }
  | { type: 'DISMISS_STREAK_SAVED_BANNER' }
  | { type: 'DISMISS_STREAK_CELEBRATION' }
  | { type: 'DISMISS_ONBOARDING_FLAG'; flag: keyof Omit<OnboardingFlags, 'atRiskWeekDismissed'> }
  | { type: 'DISMISS_AT_RISK'; weekId: string }
  | { type: 'ADD_FRIEND_INTERACTION'; interaction: FriendInteraction }
  | { type: 'SET_FRIEND_INTERACTIONS'; interactions: FriendInteraction[] }
  | { type: 'REMOVE_FRIEND_INTERACTION'; id: string }
  | { type: 'DISMISS_HELP_CARD'; token: string }
  | { type: 'SET_ASKER_ANSWER'; token: string; askerAnswer: string }
  | { type: 'MERGE_FROM_SERVER'; serverStats: AppState['stats']; serverSeen?: Partial<AppState['seen']>; serverSeenWeek?: string };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD': {
      const { stats, seen, seenWeek: storedSeenWeek, friendInteractions } = action.payload;
      const activeWeek = action.activeWeek ?? '';
      // Reset seen arrays when the stored week differs from the current active week.
      // If activeWeek is absent (empty string), skip the check for backward compat.
      const weekChanged = activeWeek !== '' && (storedSeenWeek ?? '') !== activeWeek;

      const mergedStats = { ...initialState.stats };
      if (stats) {
        mergedStats.weeklyStreak = safeNum(stats.weeklyStreak, 0);
        mergedStats.bestWeeklyStreak = safeNum(stats.bestWeeklyStreak, 0);
        mergedStats.lastPlayedWeek = stats.lastPlayedWeek ?? null;
        mergedStats.totalWeeksPlayed = safeNum(stats.totalWeeksPlayed, 0);
        mergedStats.streakShieldsAvailable = safeNum(stats.streakShieldsAvailable, 0);
        mergedStats.streakShieldUsedThisWeek = stats.streakShieldUsedThisWeek ?? false;
        mergedStats.streakSavedBannerSeen = stats.streakSavedBannerSeen ?? true;
        // showStreakCelebration is a transient display flag — never restored from storage
        mergedStats.onboarding = { ...defaultOnboarding, ...(stats.onboarding ?? {}) };
        mergedStats.recentPlayedWeeks = Array.isArray(stats.recentPlayedWeeks) ? stats.recentPlayedWeeks : [];
        mergedStats.shieldSaveWeeks = Array.isArray(stats.shieldSaveWeeks) ? stats.shieldSaveWeeks : [];
        (['lede', 'spread', 'sof', 'quip', 'wave'] as GameId[]).forEach(g => {
          const saved = stats[g];
          if (saved) mergedStats[g] = { ...defaultGameStats, ...(saved as GameStats) };
        });
      }
      // If the week changed, discard the old seen lists so users get a fresh bank.
      const mergedSeen = { ...initialState.seen };
      if (!weekChanged && seen) {
        (['quip', 'spread', 'lede', 'wave', 'sof'] as GameId[]).forEach(g => {
          if (seen[g]) mergedSeen[g] = seen[g]!;
        });
      }
      return {
        stats: mergedStats,
        seen: mergedSeen,
        seenWeek: activeWeek || storedSeenWeek || '',
        friendInteractions: friendInteractions ?? [],
      };
    }
    case 'UPDATE_STATS': {
      const { game, correct, today } = action;
      const prev = state.stats[game];
      const newStreak = correct ? prev.streak + 1 : 0;
      return {
        ...state,
        stats: {
          ...state.stats,
          [game]: {
            played: prev.played + 1,
            correct: prev.correct + (correct ? 1 : 0),
            streak: newStreak,
            bestStreak: Math.max(prev.bestStreak, newStreak),
            lastPlayed: today,
          },
        },
      };
    }
    case 'UPDATE_WEEKLY_STREAK': {
      const { weekId } = action;
      const { stats } = state;
      const currentStreak = safeNum(stats.weeklyStreak, 0);
      const isSameWeek = stats.lastPlayedWeek === weekId;

      // Idempotent: only update once per week.
      // Exception: allow one corrective run when weeklyStreak is 0 despite
      // lastPlayedWeek already matching (corrupted by old NaN bug).
      if (isSameWeek && currentStreak > 0) return state;

      // Self-heal path: same week but streak was corrupted to 0.
      // Repair it to 1 without touching shields, banners, or week count —
      // we know the user already played this week, so no shield should fire.
      if (isSameWeek) {
        return {
          ...state,
          stats: {
            ...stats,
            weeklyStreak: 1,
            bestWeeklyStreak: Math.max(safeNum(stats.bestWeeklyStreak, 0), 1),
            totalWeeksPlayed: Math.max(safeNum(stats.totalWeeksPlayed, 0), 1),
          },
        };
      }

      // Normal path: first play of a new week.
      const prevWeek = getPreviousWeek(weekId);
      let newWeeklyStreak = currentStreak;
      let newShields = safeNum(stats.streakShieldsAvailable, 0);
      let newShieldUsedThisWeek = false;
      let newBannerSeen = stats.streakSavedBannerSeen;
      let showStreakCelebration = false;
      let shieldUsedThisPlay = false;
      if (stats.lastPlayedWeek === prevWeek) {
        // Played last week too — consecutive streak continues.
        newWeeklyStreak = currentStreak + 1;
        showStreakCelebration = true;
      } else if (newShields > 0) {
        // Missed a week but have a shield — streak is preserved.
        newShields = newShields - 1;
        newShieldUsedThisWeek = true;
        newBannerSeen = false;
        shieldUsedThisPlay = true;
      } else {
        // No shield — streak resets.
        newWeeklyStreak = 1;
      }
      const prevRecent = Array.isArray(stats.recentPlayedWeeks) ? stats.recentPlayedWeeks : [];
      const newRecentPlayed = [...prevRecent, weekId].slice(-6);
      const prevShieldSave = Array.isArray(stats.shieldSaveWeeks) ? stats.shieldSaveWeeks : [];
      const newShieldSaveWeeks = shieldUsedThisPlay ? [...prevShieldSave, weekId] : prevShieldSave;
      return {
        ...state,
        stats: {
          ...stats,
          weeklyStreak: newWeeklyStreak,
          bestWeeklyStreak: Math.max(safeNum(stats.bestWeeklyStreak, 0), newWeeklyStreak),
          lastPlayedWeek: weekId,
          totalWeeksPlayed: safeNum(stats.totalWeeksPlayed, 0) + 1,
          streakShieldsAvailable: newShields,
          streakShieldUsedThisWeek: newShieldUsedThisWeek,
          streakSavedBannerSeen: newBannerSeen,
          showStreakCelebration,
          recentPlayedWeeks: newRecentPlayed,
          shieldSaveWeeks: newShieldSaveWeeks,
        },
      };
    }
    case 'SET_SEEN':
      return { ...state, seen: { ...state.seen, [action.game]: action.seen } };
    case 'EARN_SHIELD':
      return {
        ...state,
        stats: {
          ...state.stats,
          streakShieldsAvailable: Math.min(state.stats.streakShieldsAvailable + 1, MAX_SHIELDS),
        },
      };
    case 'DISMISS_STREAK_SAVED_BANNER':
      if (state.stats.streakSavedBannerSeen) return state;
      return {
        ...state,
        stats: { ...state.stats, streakSavedBannerSeen: true },
      };
    case 'DISMISS_STREAK_CELEBRATION':
      if (!state.stats.showStreakCelebration) return state;
      return {
        ...state,
        stats: { ...state.stats, showStreakCelebration: false },
      };
    case 'DISMISS_ONBOARDING_FLAG': {
      const { flag } = action;
      if (state.stats.onboarding[flag]) return state; // already true
      return {
        ...state,
        stats: {
          ...state.stats,
          onboarding: { ...state.stats.onboarding, [flag]: true },
        },
      };
    }
    case 'DISMISS_AT_RISK': {
      const { weekId } = action;
      if (state.stats.onboarding.atRiskWeekDismissed === weekId) return state;
      return {
        ...state,
        stats: {
          ...state.stats,
          onboarding: { ...state.stats.onboarding, atRiskWeekDismissed: weekId },
        },
      };
    }
    case 'ADD_FRIEND_INTERACTION':
      return { ...state, friendInteractions: [action.interaction, ...state.friendInteractions] };
    case 'SET_FRIEND_INTERACTIONS':
      return { ...state, friendInteractions: action.interactions };
    case 'REMOVE_FRIEND_INTERACTION':
      return {
        ...state,
        friendInteractions: state.friendInteractions.filter(i => i.id !== action.id),
      };
    case 'DISMISS_HELP_CARD':
      return {
        ...state,
        friendInteractions: state.friendInteractions.map(i =>
          i.token === action.token && (i.type === 'received_help' || i.type === 'challenge_accepted')
            ? { ...i, homeCardDismissed: true }
            : i,
        ),
      };
    case 'SET_ASKER_ANSWER':
      return {
        ...state,
        friendInteractions: state.friendInteractions.map(i =>
          i.token === action.token && i.type === 'received_help'
            ? { ...i, askerAnswer: action.askerAnswer }
            : i,
        ),
      };
    case 'MERGE_FROM_SERVER': {
      const { serverStats, serverSeen = {}, serverSeenWeek } = action;
      const serverWeek = serverStats.lastPlayedWeek;
      const localWeek = state.stats.lastPlayedWeek;

      // --- Week-aware streak merge ---
      // When an anonymous user plays a game and then signs in, the local streak (1)
      // reflects a fresh-start calculation that doesn't know about the user's server
      // history. We detect the "consecutive week" pattern (local week directly follows
      // server's last played week) and reconstruct the correct streak from server data.
      const isLocalConsecutiveAfterServer =
        localWeek !== null &&
        serverWeek !== null &&
        localWeek > serverWeek &&
        getPreviousWeek(localWeek) === serverWeek;

      let mergedWeeklyStreak: number;
      let mergedTotalWeeksPlayed: number;
      let mergedLastPlayedWeek: string | null;
      let mergedRecentPlayedWeeks: string[];
      let mergedShieldSaveWeeks: string[];

      if (isLocalConsecutiveAfterServer) {
        // Local week directly follows server's last played week — the user played on an
        // anonymous device this week, then signed in. Reconstruct the correct streak by
        // continuing from server history: serverStreak + 1 for the current (local) week.
        const serverRecent = Array.isArray(serverStats.recentPlayedWeeks) ? serverStats.recentPlayedWeeks : [];
        mergedWeeklyStreak = safeNum(serverStats.weeklyStreak, 0) + 1;
        mergedTotalWeeksPlayed = safeNum(serverStats.totalWeeksPlayed, 0) + 1;
        mergedLastPlayedWeek = localWeek;
        mergedRecentPlayedWeeks = [...serverRecent, localWeek].slice(-6);
        mergedShieldSaveWeeks = Array.isArray(serverStats.shieldSaveWeeks) ? serverStats.shieldSaveWeeks : [];
      } else {
        // Same week, server ahead, or non-consecutive gap: use Math.max for streak fields
        // so a multi-device race never downgrades a value already earned in this session.
        const serverWinsForStreak = serverWeek !== null && (localWeek === null || serverWeek >= localWeek);
        mergedWeeklyStreak = Math.max(
          safeNum(serverStats.weeklyStreak, 0),
          safeNum(state.stats.weeklyStreak, 0),
        );
        mergedTotalWeeksPlayed = Math.max(
          safeNum(serverStats.totalWeeksPlayed, 0),
          safeNum(state.stats.totalWeeksPlayed, 0),
        );
        mergedLastPlayedWeek = serverWinsForStreak ? serverWeek : localWeek;
        // recentPlayedWeeks and shieldSaveWeeks: defer to the base-stats spread below,
        // which picks server or local arrays based on serverWins.
        mergedRecentPlayedWeeks = serverWinsForStreak
          ? (Array.isArray(serverStats.recentPlayedWeeks) ? serverStats.recentPlayedWeeks : [])
          : (Array.isArray(state.stats.recentPlayedWeeks) ? state.stats.recentPlayedWeeks : []);
        mergedShieldSaveWeeks = serverWinsForStreak
          ? (Array.isArray(serverStats.shieldSaveWeeks) ? serverStats.shieldSaveWeeks : [])
          : (Array.isArray(state.stats.shieldSaveWeeks) ? state.stats.shieldSaveWeeks : []);
      }

      // Shield cap: enforce MAX_SHIELDS regardless of what's stored in Firestore.
      // Old documents written before the cap was introduced may have values > 3.
      const mergedShields = Math.min(
        Math.max(
          safeNum(serverStats.streakShieldsAvailable, 0),
          safeNum(state.stats.streakShieldsAvailable, 0),
        ),
        MAX_SHIELDS,
      );

      // For per-game stats (lede, spread, etc.) and other non-streak fields, the
      // "newer week wins" heuristic selects the most current snapshot as the base.
      const serverWins = serverWeek !== null && (localWeek === null || serverWeek >= localWeek);
      const baseStats = serverWins ? serverStats : state.stats;

      // "Any-true-wins" merge: once a user has seen an onboarding surface on any
      // device, we never show it again. atRiskWeekDismissed takes the later weekId.
      const serverOnboarding: OnboardingFlags = (serverStats as any).onboarding ?? defaultOnboarding;
      const localOnboarding: OnboardingFlags = state.stats.onboarding ?? defaultOnboarding;
      const mergedOnboarding: OnboardingFlags = {
        streakIntroSeen: localOnboarding.streakIntroSeen || serverOnboarding.streakIntroSeen,
        shieldPrimerSeen: localOnboarding.shieldPrimerSeen || serverOnboarding.shieldPrimerSeen,
        firstShieldEarnedSeen: localOnboarding.firstShieldEarnedSeen || serverOnboarding.firstShieldEarnedSeen,
        firstShieldSaveSeen: localOnboarding.firstShieldSaveSeen || serverOnboarding.firstShieldSaveSeen,
        atRiskWeekDismissed: [serverOnboarding.atRiskWeekDismissed, localOnboarding.atRiskWeekDismissed]
          .filter((w): w is string => w !== null && w !== undefined)
          .sort()
          .pop() ?? null,
      };
      const mergedStats: AppState['stats'] = {
        ...initialState.stats,
        ...baseStats,
        weeklyStreak: mergedWeeklyStreak,
        bestWeeklyStreak: Math.max(
          safeNum(serverStats.bestWeeklyStreak, 0),
          safeNum(state.stats.bestWeeklyStreak, 0),
          mergedWeeklyStreak, // ensure best reflects the newly computed streak
        ),
        lastPlayedWeek: mergedLastPlayedWeek,
        totalWeeksPlayed: mergedTotalWeeksPlayed,
        streakShieldsAvailable: mergedShields,
        recentPlayedWeeks: mergedRecentPlayedWeeks,
        shieldSaveWeeks: mergedShieldSaveWeeks,
        // showStreakCelebration is a transient session flag — never restore from server,
        // even if old Firestore data has it set to true.
        showStreakCelebration: false,
        onboarding: mergedOnboarding,
      };
      const mergedSeen = { ...state.seen };
      // Only apply server seen if it was written for the same week as the local seenWeek.
      // If serverSeenWeek is absent (old Firestore data) or mismatches, the indices
      // index into a different content bank — discarding them prevents false exhaustion.
      if (serverSeenWeek !== undefined && serverSeenWeek === state.seenWeek) {
        (['lede', 'spread', 'sof', 'quip', 'wave'] as GameId[]).forEach(g => {
          const local = state.seen[g] ?? [];
          const remote = serverSeen[g] ?? [];
          mergedSeen[g] = [...new Set([...local, ...remote])];
        });
      }
      return { ...state, stats: mergedStats, seen: mergedSeen };
    }
    default:
      return state;
  }
}
