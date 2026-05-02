import { SpreadItem } from '@/constants/data';

// Round to 2 significant figures for clean-looking numbers at any magnitude.
export function roundToSigFigs(n: number): number {
  if (n <= 0) return 1;
  if (n < 10) return Math.round(n);
  const d = Math.floor(Math.log10(n));
  const factor = Math.pow(10, d - 1);
  return Math.round(n / factor) * factor;
}

const MULTIPLIERS = [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0];

// Returns 4 distinct nicely-rounded choices including truth, shuffled.
export function generateChoices(truth: number, rng: () => number = Math.random): number[] {
  const seen = new Set<number>([truth]);
  const distractors: number[] = [];

  // Shuffle multiplier pool with the provided rng
  const pool = [...MULTIPLIERS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  for (const m of pool) {
    if (distractors.length === 3) break;
    const candidate = roundToSigFigs(Math.round(truth * m));
    if (candidate > 0 && !seen.has(candidate)) {
      seen.add(candidate);
      distractors.push(candidate);
    }
  }

  // Fallback if pool exhausted (rare for extreme values)
  let offset = 2;
  while (distractors.length < 3) {
    const fallback = roundToSigFigs(truth * offset);
    if (!seen.has(fallback) && fallback > 0) {
      seen.add(fallback);
      distractors.push(fallback);
    }
    offset++;
  }

  const choices = [truth, ...distractors];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

// Build choices from a SpreadItem, seeded by the answer value for determinism.
export function buildChoicesForItem(item: SpreadItem): number[] {
  let seed = item.answer;
  const seededRng = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };
  return generateChoices(item.answer, seededRng);
}
