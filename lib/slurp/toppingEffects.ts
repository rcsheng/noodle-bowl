import type { ToppingId, LetterTile, WordPattern } from '@/packages/shared/slurp';
import { RARE_LETTERS } from '@/constants/slurp/letterChips';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function hasVowelCluster(word: string): boolean {
  for (let i = 0; i < word.length - 1; i++) {
    if (VOWELS.has(word[i]) && VOWELS.has(word[i + 1])) return true;
  }
  return false;
}

function hasAdjacentDouble(word: string): boolean {
  for (let i = 0; i < word.length - 1; i++) {
    if (word[i] === word[i + 1]) return true;
  }
  return false;
}

function distinctVowelCount(word: string): number {
  const seen = new Set<string>();
  for (const ch of word) if (VOWELS.has(ch)) seen.add(ch);
  return seen.size;
}

function vowelCount(word: string): number {
  let n = 0;
  for (const ch of word) if (VOWELS.has(ch)) n++;
  return n;
}

function hasNoRepeatedLetters(word: string): boolean {
  return new Set(word.split('')).size === word.length;
}

function rareLetterCount(word: string): number {
  let n = 0;
  for (const ch of word) if (RARE_LETTERS.has(ch)) n++;
  return n;
}

function mostUsedLetter(tiles: LetterTile[]): string {
  const freq: Record<string, number> = {};
  for (const t of tiles) freq[t.letter] = (freq[t.letter] ?? 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

export interface ToppingSlurpInput {
  toppings: ToppingId[];
  word: string;
  tiles: LetterTile[];
  pattern: WordPattern;
  baseLetterChips: number;
  patternChips: number;
  patternSeasoning: number;
  pendingChipBonus: number;
  slurpCountThisTasting: number;
  consecutiveNoSpitoutSlurps: number;
  lastWordLetters: string[];
  slurpsRemaining: number;
  togarashiLetter: string | null;
  coursesCompleted: number;
  bowl: LetterTile[];
  pot: LetterTile[];
  discard: LetterTile[];
}

export interface ToppingSlurpResult {
  chips: number;
  seasoning: number;
  score: number;
  bonusCoins: number;
  noriLetter: string | null;
  needsAburaAge: boolean;
  bowlSizeIncrease: number;
}

export function applyToppingEffectsOnSlurp(input: ToppingSlurpInput): ToppingSlurpResult {
  const {
    toppings, word, tiles, pattern,
    baseLetterChips, patternChips, patternSeasoning, pendingChipBonus,
    slurpCountThisTasting, consecutiveNoSpitoutSlurps, lastWordLetters,
    slurpsRemaining, togarashiLetter, coursesCompleted, bowl,
  } = input;

  const w = word.toUpperCase();
  const toppingSet = new Set(toppings);

  // Soft-Boiled Egg: first slurp → letter chips ×2
  const letterChips = toppingSet.has('softBoiledEgg') && slurpCountThisTasting === 0
    ? baseLetterChips * 2
    : baseLetterChips;

  let chips = letterChips + patternChips + pendingChipBonus;
  let seasoning = 1 + patternSeasoning;
  let scoreMultiplier = 1;
  let bonusCoins = 0;
  let bowlSizeIncrease = 0;
  let noriLetter: string | null = null;

  const playedIds = new Set(tiles.map(t => t.id));
  const unplayedLetters = new Set(bowl.filter(t => !playedIds.has(t.id)).map(t => t.letter));

  // Process toppings left-to-right in tray order
  for (const topping of toppings) {
    switch (topping) {
      case 'chiliOil':
        if (hasVowelCluster(w)) seasoning += 4;
        break;

      case 'softBoiledEgg':
        // handled above (chip doubling)
        break;

      case 'crispyShallots':
        if (hasAdjacentDouble(w)) seasoning *= 3;
        break;

      case 'fishCake':
        if (pattern === 'dashi') chips += 100;
        break;

      case 'nori':
        noriLetter = mostUsedLetter(tiles);
        break;

      case 'wontons':
        if (pattern === 'udon' || pattern === 'pho') bowlSizeIncrease = 1;
        break;

      case 'scallions':
        seasoning += vowelCount(w);
        break;

      case 'charSiu':
        if (slurpsRemaining === 1) scoreMultiplier *= 2;
        break;

      case 'porkBelly':
        // applied in OPEN_MARKET
        break;

      case 'teaEgg':
        chips += 5 * (slurpCountThisTasting + 1);
        break;

      case 'menma':
        chips += 5 * (consecutiveNoSpitoutSlurps + 1);
        break;

      case 'narutomaki':
        chips += 2 * toppings.length;
        break;

      case 'corn':
        if (distinctVowelCount(w) >= 3) seasoning += 4;
        break;

      case 'sesameSeeds': {
        for (const ch of new Set(w.split(''))) {
          if (unplayedLetters.has(ch)) chips += 1;
        }
        break;
      }

      case 'yuzuKosho':
        seasoning += coursesCompleted;
        break;

      case 'mirin':
        if (hasNoRepeatedLetters(w)) seasoning += 3;
        break;

      case 'aburaAge':
        // handled post-draw in reducer via needsAburaAge
        break;

      case 'shiitake':
        // pendingChipBonus already added above
        break;

      case 'doubanjiang':
        if (rareLetterCount(w) >= 2) seasoning *= 2;
        break;

      case 'gochujang':
        if (w.length >= 2 && w[0] === w[w.length - 1]) chips += 25;
        break;

      case 'togarashi':
        if (togarashiLetter && w.includes(togarashiLetter)) seasoning += 7;
        break;

      case 'lard':
        // checked post-score below
        break;

      case 'kombu':
        // applied in ADVANCE
        break;

      case 'natto': {
        const lastSet = new Set(lastWordLetters);
        let overlap = 0;
        for (const ch of new Set(w.split(''))) {
          if (lastSet.has(ch)) overlap++;
        }
        chips += 10 * overlap;
        break;
      }
    }
  }

  const score = chips * seasoning * scoreMultiplier;

  // Lard: post-score coin
  if (toppingSet.has('lard') && score >= 500) bonusCoins += 1;

  return {
    chips,
    seasoning,
    score,
    bonusCoins,
    noriLetter,
    needsAburaAge: toppingSet.has('aburaAge'),
    bowlSizeIncrease,
  };
}
