import type { BrothBaseId, LetterTile } from '@/packages/shared/slurp';
import { LETTER_CHIPS } from './letterChips';

export type LetterDistribution = Record<string, number>;

// All bases sum to 52 tiles
export const BROTH_BASE_DISTRIBUTIONS: Record<BrothBaseId, LetterDistribution> = {
  // Balanced default — Scrabble-like distribution
  classicChicken: {
    E: 6, A: 5, I: 4, O: 4, U: 3,
    N: 2, S: 3, T: 3, R: 3, L: 2, D: 2, G: 1,
    B: 1, C: 1, M: 1, P: 1, F: 1, H: 1, V: 1, W: 1, Y: 1,
    K: 1, J: 1, X: 1, Q: 1, Z: 1,
  },
  // Reduced vowels, extra consonants, 2× rare letters
  tonkotsu: {
    E: 3, A: 3, I: 2, O: 2, U: 2,
    N: 3, S: 3, T: 3, R: 3, L: 2, D: 3, G: 2,
    B: 2, C: 2, M: 2, P: 2, F: 1, H: 1, V: 1, W: 1, Y: 1,
    K: 2, J: 2, X: 2, Q: 1, Z: 1,
  },
  // Heavy vowels, no rare letters — easiest word finding
  clearDashi: {
    E: 8, A: 7, I: 6, O: 5, U: 4,
    N: 4, S: 4, T: 4, R: 4, L: 3, D: 2, G: 1,
  },
  // Standard + extra D, G, B, M — favors consonant combos
  miso: {
    E: 5, A: 4, I: 4, O: 3, U: 3,
    N: 3, S: 3, T: 3, R: 3, L: 2,
    D: 3, G: 3, B: 3, M: 3,
    P: 1, F: 1, H: 1, V: 1, W: 1, Y: 1, K: 1,
  },
};

export function generateTiles(distribution: LetterDistribution): LetterTile[] {
  const tiles: LetterTile[] = [];
  let counter = 0;
  for (const [letter, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      tiles.push({
        id: `${letter}${counter++}`,
        letter,
        chipValue: LETTER_CHIPS[letter] ?? 1,
      });
    }
  }
  return tiles;
}

export function distributionTotal(distribution: LetterDistribution): number {
  return Object.values(distribution).reduce((s, n) => s + n, 0);
}
