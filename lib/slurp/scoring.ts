import type { WordPattern, LetterTile } from '@/packages/shared/slurp';
import { WORD_PATTERN_DEFS, NOODLE_UPGRADE_CAP } from '@/constants/slurp/wordPatterns';
import { RARE_LETTERS } from '@/constants/slurp/letterChips';

const ALL_VOWELS = new Set<string>(['A', 'E', 'I', 'O', 'U']);

function isPalindrome(word: string): boolean {
  return word === word.split('').reverse().join('');
}

function hasAllVowels(word: string): boolean {
  for (const v of ALL_VOWELS) {
    if (!word.includes(v)) return false;
  }
  return true;
}

function allRare(word: string): boolean {
  for (const ch of word) {
    if (!RARE_LETTERS.has(ch)) return false;
  }
  return true;
}

function hasAnyRare(word: string): boolean {
  for (const ch of word) {
    if (RARE_LETTERS.has(ch)) return true;
  }
  return false;
}

// Priority order matches base-chip values (highest wins):
// tonkotsu(80) > pho(60) > dashi(50) > miso(40) > udon(35) > ramen(20) > noodle(10) > broth(5)
export function detectWordPattern(word: string): WordPattern {
  const w = word.toUpperCase();
  const len = w.length;

  if (len >= 2 && allRare(w)) return 'tonkotsu';
  if (len >= 8) return 'pho';
  if (len >= 3 && isPalindrome(w)) return 'dashi';
  if (hasAllVowels(w) && !hasAnyRare(w)) return 'miso';
  if (len === 7) return 'udon';
  if (len === 6) return 'ramen';
  if (len === 5) return 'noodle';
  return 'broth';
}

export function scoreSlurp(
  tiles: LetterTile[],
  pattern: WordPattern,
  noodleLevels: Record<WordPattern, number>,
): { chips: number; seasoning: number; score: number } {
  const baseChips = tiles.reduce((sum, t) => sum + t.chipValue, 0);
  const def = WORD_PATTERN_DEFS[pattern];
  const level = Math.min(noodleLevels[pattern] ?? 0, NOODLE_UPGRADE_CAP);
  const patternChips = def.baseChips + level * 10;
  const patternSeasoning = def.baseSeasoning + level * 0.5;

  const chips = baseChips + patternChips;
  const seasoning = 1 + patternSeasoning;
  const score = chips * seasoning;

  return { chips, seasoning, score };
}
