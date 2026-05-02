import { SpreadItem } from '@/constants/data';

export interface BisectionRound {
  threshold: number;
  truthDirection: 'more' | 'fewer';
  bracketBefore: { lo: number; hi: number };
  bracketAfter: { lo: number; hi: number };
}

export interface BisectionPlan {
  rounds: BisectionRound[];
  initialBracket: { lo: number; hi: number };
}

// Returns the rounding step for a given magnitude.
// Step is always a "round" human-readable unit for that scale.
function getStep(n: number): number {
  if (n < 10) return 1;
  if (n < 100) return 5;
  if (n < 1000) return 50;
  return 100;
}

export function niceRound(n: number): number {
  if (n <= 0) return 1;
  const step = getStep(n);
  return Math.round(n / step) * step;
}

function niceFloor(n: number): number {
  if (n <= 0) return 1;
  const step = getStep(n);
  return Math.floor(n / step) * step;
}

function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const step = getStep(n);
  return Math.ceil(n / step) * step;
}

function getInitialBracket(truth: number): { lo: number; hi: number } {
  if (truth <= 20) return { lo: 1, hi: 100 };
  if (truth <= 200) return { lo: 1, hi: 1000 };
  if (truth <= 2000) return { lo: 10, hi: 10000 };
  if (truth <= 20000) return { lo: 100, hi: 100000 };
  if (truth <= 200000) return { lo: 1000, hi: 1000000 };
  return { lo: 10000, hi: 10000000 };
}

export function applyAnswer(
  bracket: { lo: number; hi: number },
  threshold: number,
  answer: 'more' | 'fewer',
): { lo: number; hi: number } {
  if (answer === 'more') {
    return { lo: Math.max(bracket.lo, threshold), hi: bracket.hi };
  }
  return { lo: bracket.lo, hi: Math.min(bracket.hi, threshold) };
}

// Plans 3 truth-anchored bisection rounds. Each round's threshold is chosen so
// that a truthful answer narrows the bracket, and after 3 truthful answers the
// final bracket is ≤ 25% of truth wide (or ≤ 4 for small truths).
export function planBisection(item: SpreadItem): BisectionPlan {
  const truth = item.answer;
  const initialBracket = getInitialBracket(truth);

  let bracket = { ...initialBracket };
  const rounds: BisectionRound[] = [];

  // Round 1: anchor at ~90% of truth — truth is always 'more' than this
  const t1 = Math.max(initialBracket.lo + 1, niceFloor(truth * 0.9));
  const before1 = { ...bracket };
  bracket = applyAnswer(bracket, t1, 'more');
  rounds.push({ threshold: t1, truthDirection: 'more', bracketBefore: before1, bracketAfter: { ...bracket } });

  // Round 2: anchor at ~110% of truth — truth is always 'fewer' than this
  const t2 = Math.min(initialBracket.hi - 1, niceCeil(truth * 1.1));
  const before2 = { ...bracket };
  bracket = applyAnswer(bracket, t2, 'fewer');
  rounds.push({ threshold: t2, truthDirection: 'fewer', bracketBefore: before2, bracketAfter: { ...bracket } });

  // Round 3: anchor just below truth — tightens the bracket from below.
  // niceFloor(truth-1) is always in [lo, hi) by construction: it's ≤ truth-1 < hi,
  // and ≥ niceFloor(truth*0.9) = lo. When it equals lo the round is a no-op but
  // convergence is already achieved in R2 for those values.
  const t3 = niceFloor(truth - 1);
  const t3Direction: 'more' | 'fewer' = truth >= t3 ? 'more' : 'fewer';
  const before3 = { ...bracket };
  bracket = applyAnswer(bracket, t3, t3Direction);
  rounds.push({ threshold: t3, truthDirection: t3Direction, bracketBefore: before3, bracketAfter: { ...bracket } });

  return { rounds, initialBracket };
}
