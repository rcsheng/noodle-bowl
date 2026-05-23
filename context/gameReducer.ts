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

const defaultGameStats: GameStats = { played: 0, correct: 0, streak: 0, bestStreak: 0 };

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
      if (stats.lastPlayedWeek === prevWeek) {
        // Played last week too — consecutive streak continues.
        newWeeklyStreak = currentStreak + 1;
        showStreakCelebration = true;
      } else if (newShields > 0) {
        // Missed a week but have a shield — streak is preserved.
        newShields = newShields - 1;
        newShieldUsedThisWeek = true;
        newBannerSeen = false;
      } else {
        // No shield — streak resets.
        newWeeklyStreak = 1;
      }
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
          streakShieldsAvailable: state.stats.streakShieldsAvailable + 1,
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
      const serverWins = serverWeek !== null && (localWeek === null || serverWeek >= localWeek);
      const baseStats = serverWins ? serverStats : state.stats;
      // Spread initialState.stats first so any field absent from an old Firestore
      // document gets a safe default, then baseStats overlays the actual data.
      // Numeric streak fields are then re-assigned explicitly with safeNum so that
      // NaN values stored by the old bug cannot survive into state. We take the
      // max of server and local for each count so a multi-device race never
      // downgrades a value that was already earned in this session.
      const mergedStats: AppState['stats'] = {
        ...initialState.stats,
        ...baseStats,
        weeklyStreak: Math.max(
          safeNum(serverStats.weeklyStreak, 0),
          safeNum(state.stats.weeklyStreak, 0),
        ),
        bestWeeklyStreak: Math.max(
          safeNum(serverStats.bestWeeklyStreak, 0),
          safeNum(state.stats.bestWeeklyStreak, 0),
        ),
        totalWeeksPlayed: Math.max(
          safeNum(serverStats.totalWeeksPlayed, 0),
          safeNum(state.stats.totalWeeksPlayed, 0),
        ),
        streakShieldsAvailable: Math.max(
          safeNum(serverStats.streakShieldsAvailable, 0),
          safeNum(state.stats.streakShieldsAvailable, 0),
        ),
        // showStreakCelebration is a transient session flag — never restore from server,
        // even if old Firestore data has it set to true.
        showStreakCelebration: false,
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
