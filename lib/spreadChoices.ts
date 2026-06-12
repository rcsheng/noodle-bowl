import { SpreadItem } from '@/constants/data';

// Round to 2 significant figures for clean-looking numbers at any magnitude.
export function roundToSigFigs(n: number): number {
  if (n <= 0) return 1;
  if (n < 10) return Math.round(n);
  const d = Math.floor(Math.log10(n));
  const factor = Math.pow(10, d - 1);
  return Math.round(n / factor) * factor;
}

function getDecimalPlaces(n: number): number {
  const dot = n.toString().indexOf('.');
  return dot === -1 ? 0 : n.toString().length - dot - 1;
}

function roundToDecimalPlaces(n: number, places: number): number {
  const factor = Math.pow(10, places);
  return Math.round(n * factor) / factor;
}

// Used for regular (unbounded) units — multiplicative spread around truth.
const MULTIPLIERS = [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0];

// Used when maxValue is set (e.g. percent) — additive spread so choices stay
// within (0, maxValue] and appear on both sides of the truth.
const ADDITIVE_OFFSETS = [-35, -25, -15, -10, 10, 15, 20, 25, 30, 35, 40, -40, -20, -5, 5, -30];

export interface GenerateChoicesOpts {
  /** Upper bound for all generated choices (e.g. 100 for percentages). */
  maxValue?: number;
}

// Returns 4 distinct nicely-rounded choices including truth, shuffled.
export function generateChoices(
  truth: number,
  rng: () => number = Math.random,
  opts: GenerateChoicesOpts = {},
): number[] {
  const { maxValue } = opts;
  const decimalPlaces = getDecimalPlaces(truth);
  const roundCandidate = (n: number): number =>
    decimalPlaces > 0
      ? roundToDecimalPlaces(n, decimalPlaces)
      : roundToSigFigs(Math.round(n));

  const seen = new Set<number>([truth]);
  const distractors: number[] = [];

  const isValid = (n: number) =>
    n > 0 && !seen.has(n) && (maxValue === undefined || n <= maxValue);

  if (maxValue !== undefined) {
    // Additive strategy: shuffle offsets then pick first 3 valid candidates.
    // Keeps distractors within (0, maxValue] and spread on both sides of truth.
    const offsets = [...ADDITIVE_OFFSETS];
    for (let i = offsets.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
    }
    for (const delta of offsets) {
      if (distractors.length === 3) break;
      const candidate = roundCandidate(truth + delta);
      if (isValid(candidate)) {
        seen.add(candidate);
        distractors.push(candidate);
      }
    }
    // Fallback: walk outward ±1 step at a time (handles very low/high truths)
    let step = 1;
    while (distractors.length < 3) {
      for (const sign of [-1, 1]) {
        if (distractors.length === 3) break;
        const candidate = roundCandidate(truth + sign * step);
        if (isValid(candidate)) {
          seen.add(candidate);
          distractors.push(candidate);
        }
      }
      step++;
    }
  } else {
    // Multiplicative strategy (original) — for unbounded units.
    const pool = [...MULTIPLIERS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (const m of pool) {
      if (distractors.length === 3) break;
      const candidate = roundCandidate(truth * m);
      if (candidate > 0 && !seen.has(candidate)) {
        seen.add(candidate);
        distractors.push(candidate);
      }
    }
    // Fallback if pool exhausted (rare for extreme values)
    let offset = 2;
    while (distractors.length < 3) {
      const fallback = roundCandidate(truth * offset);
      if (!seen.has(fallback) && fallback > 0) {
        seen.add(fallback);
        distractors.push(fallback);
      }
      offset++;
    }
  }

  const choices = [truth, ...distractors];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

function isPercentUnit(unit: string): boolean {
  const u = unit.toLowerCase().trim();
  return u === 'percent' || u === '%' || u === 'percentage';
}

// Build choices from a SpreadItem, seeded by the answer value for determinism.
export function buildChoicesForItem(item: SpreadItem): number[] {
  let seed = item.answer;
  const seededRng = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };
  const opts: GenerateChoicesOpts = isPercentUnit(item.unit ?? '') ? { maxValue: 100 } : {};
  return generateChoices(item.answer, seededRng, opts);
}
