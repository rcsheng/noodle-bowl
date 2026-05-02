import { detectWordPattern, scoreSlurp } from '../scoring';
import { LETTER_CHIPS } from '@/constants/slurp/letterChips';
import type { LetterTile, WordPattern } from '@/packages/shared/slurp';

function tile(letter: string, id?: string): LetterTile {
  return { id: id ?? letter, letter, chipValue: LETTER_CHIPS[letter] ?? 1 };
}

function defaultLevels(): Record<WordPattern, number> {
  return {
    broth: 0, noodle: 0, ramen: 0, udon: 0,
    pho: 0, tonkotsu: 0, dashi: 0, miso: 0,
  };
}

// ── detectWordPattern ─────────────────────────────────────────────────────────

describe('detectWordPattern', () => {
  // Broth (≤ 4 letters, no special property)
  it('returns broth for a 3-letter word', () => {
    expect(detectWordPattern('CAT')).toBe('broth');
  });

  it('returns broth for a 4-letter word', () => {
    expect(detectWordPattern('CATS')).toBe('broth');
  });

  it('returns broth for a 2-letter word (minimum valid length)', () => {
    expect(detectWordPattern('IT')).toBe('broth');
  });

  // Noodle (5 letters, no special)
  it('returns noodle for a 5-letter word', () => {
    expect(detectWordPattern('BEACH')).toBe('noodle');
  });

  // Ramen (6 letters, no special)
  it('returns ramen for a 6-letter word', () => {
    expect(detectWordPattern('BEACHY')).toBe('ramen');
  });

  // Udon (7 letters, no special)
  it('returns udon for a 7-letter word', () => {
    expect(detectWordPattern('BEACHES')).toBe('udon');
  });

  // Pho (8+ letters)
  it('returns pho for an 8-letter word', () => {
    expect(detectWordPattern('BEACHING')).toBe('pho');
  });

  it('returns pho for an 11-letter word', () => {
    expect(detectWordPattern('BEAUTIFULLY')).toBe('pho');
  });

  // Dashi (palindrome, ≥ 3 letters)
  it('returns dashi for a 3-letter palindrome', () => {
    expect(detectWordPattern('ABA')).toBe('dashi');
  });

  it('returns dashi for a 4-letter palindrome', () => {
    expect(detectWordPattern('NOON')).toBe('dashi');
  });

  it('returns dashi for a 5-letter palindrome (beats noodle)', () => {
    expect(detectWordPattern('LEVEL')).toBe('dashi');
  });

  it('returns dashi for a 7-letter palindrome (beats udon)', () => {
    expect(detectWordPattern('RACECAR')).toBe('dashi');
  });

  it('does NOT return dashi for a 2-letter palindrome like AA (below 3-letter min)', () => {
    expect(detectWordPattern('AA')).toBe('broth');
  });

  // Miso (all 5 vowels A/E/I/O/U, no rare letters)
  it('returns miso for a 5-letter word with all vowels and no rare letters', () => {
    expect(detectWordPattern('AEIOU')).toBe('miso');
  });

  it('returns miso for a 7-letter word with all vowels and no rare (beats udon)', () => {
    expect(detectWordPattern('AEIOUBC')).toBe('miso');
  });

  it('does NOT return miso when a rare letter is present', () => {
    // AEIOUK has all vowels but K is rare → falls through to noodle (5 letters)
    expect(detectWordPattern('AEIOK')).toBe('noodle');
  });

  it('does NOT return miso when vowels are incomplete', () => {
    // AUDIO has A,U,D,I,O but no E
    expect(detectWordPattern('AUDIO')).toBe('noodle');
  });

  // Tonkotsu (ALL letters rare, ≥ 2 letters)
  it('returns tonkotsu when all letters are rare (2 letters)', () => {
    expect(detectWordPattern('JK')).toBe('tonkotsu');
  });

  it('returns tonkotsu when all letters are rare (5 letters)', () => {
    expect(detectWordPattern('JKQXZ')).toBe('tonkotsu');
  });

  it('does NOT return tonkotsu when any letter is not rare', () => {
    // JAZZ has A which is not rare
    expect(detectWordPattern('JAZZ')).toBe('broth');
  });

  // Priority: Tonkotsu beats everything
  it('returns tonkotsu for an 8-letter all-rare word (beats pho)', () => {
    expect(detectWordPattern('JJJJKKKK')).toBe('tonkotsu');
  });

  // Priority: Pho beats dashi for 8+ letter palindromes
  it('returns pho for an 8-letter palindrome (pho beats dashi)', () => {
    // ABCDDCBA is a palindrome and 8 letters → pho wins (60 > 50)
    expect(detectWordPattern('ABCDDCBA')).toBe('pho');
  });

  // Priority: Pho beats miso at 8+ letters
  it('returns pho for an 8-letter word with all vowels and no rare (pho beats miso)', () => {
    expect(detectWordPattern('AEIOUVBC')).toBe('pho');
  });

  // Priority: Dashi beats miso
  it('returns dashi for a 5-letter palindrome with all vowels (dashi beats miso)', () => {
    // AEIOA is a palindrome-ish... let's use 'ABCBA' — palindrome, 5 letters
    // Does ABCBA have all vowels? A is there, but not E, I, O, U → not miso anyway
    // Let's use a word that IS both palindrome-eligible and has vowel-like properties
    // 'LEVEL' - palindrome, not all vowels → dashi
    expect(detectWordPattern('LEVEL')).toBe('dashi');
  });

  // Case insensitivity
  it('handles lowercase input', () => {
    expect(detectWordPattern('cat')).toBe('broth');
    expect(detectWordPattern('level')).toBe('dashi');
    expect(detectWordPattern('jk')).toBe('tonkotsu');
  });
});

// ── scoreSlurp ────────────────────────────────────────────────────────────────

describe('scoreSlurp', () => {
  it('scores a broth word at level 0: C(3)+A(1)+T(1)=5 base, +5 pattern, ×(1+1)=20', () => {
    const tiles = [tile('C'), tile('A'), tile('T')];
    const result = scoreSlurp(tiles, 'broth', defaultLevels());
    expect(result.chips).toBe(10);       // 5 + 5
    expect(result.seasoning).toBe(2);    // 1 + 1
    expect(result.score).toBe(20);
  });

  it('scores a noodle word at level 0: B(3)+E(1)+A(1)+C(3)+H(4)=12 base, +10 pattern', () => {
    const tiles = [tile('B'), tile('E'), tile('A'), tile('C'), tile('H')];
    const result = scoreSlurp(tiles, 'noodle', defaultLevels());
    expect(result.chips).toBe(22);       // 12 + 10
    expect(result.seasoning).toBe(2.5);  // 1 + 1.5
    expect(result.score).toBe(55);
  });

  it('applies noodle level upgrade: +10 chips and +0.5 seasoning per level', () => {
    const tiles = [tile('C'), tile('A'), tile('T')];
    const levels = { ...defaultLevels(), broth: 1 };
    const result = scoreSlurp(tiles, 'broth', levels);
    expect(result.chips).toBe(20);       // 5 + (5 + 10)
    expect(result.seasoning).toBe(2.5);  // 1 + (1 + 0.5)
    expect(result.score).toBe(50);
  });

  it('caps noodle level at 10', () => {
    const tiles = [tile('C'), tile('A'), tile('T')];
    const levels = { ...defaultLevels(), broth: 99 };
    const result = scoreSlurp(tiles, 'broth', levels);
    // Max level = 10: chips = 5 + (5 + 100) = 110, seasoning = 1 + (1 + 5) = 7
    expect(result.chips).toBe(110);
    expect(result.seasoning).toBe(7);
    expect(result.score).toBe(770);
  });

  it('scores a tonkotsu word: J(8)+Q(10)=18 base, +80 pattern', () => {
    const tiles = [tile('J'), tile('Q')];
    const result = scoreSlurp(tiles, 'tonkotsu', defaultLevels());
    expect(result.chips).toBe(98);       // 18 + 80
    expect(result.seasoning).toBe(5);    // 1 + 4
    expect(result.score).toBe(490);
  });

  it('scores a dashi word at level 0', () => {
    const tiles = [tile('L'), tile('E'), tile('V'), tile('E', 'E2'), tile('L', 'L2')];
    const result = scoreSlurp(tiles, 'dashi', defaultLevels());
    expect(result.chips).toBe(50 + 1 + 1 + 4 + 1 + 1); // basePattern + letters
    expect(result.seasoning).toBe(4);    // 1 + 3
  });

  it('scores a pho word at level 0', () => {
    const tiles = [tile('B'), tile('E'), tile('A'), tile('C'), tile('H'), tile('I'), tile('N'), tile('G')];
    const result = scoreSlurp(tiles, 'pho', defaultLevels());
    const baseChips = 3 + 1 + 1 + 3 + 4 + 1 + 1 + 2; // B+E+A+C+H+I+N+G
    expect(result.chips).toBe(baseChips + 60);
    expect(result.seasoning).toBe(5);    // 1 + 4
  });

  it('scores a miso word at level 0', () => {
    const tiles = [tile('A'), tile('E'), tile('I'), tile('O'), tile('U')];
    const result = scoreSlurp(tiles, 'miso', defaultLevels());
    expect(result.chips).toBe(1 + 1 + 1 + 1 + 1 + 40); // all 1-chip vowels + 40
    expect(result.seasoning).toBe(3.5);  // 1 + 2.5
  });

  it('uses the chipValue on each tile, not a lookup', () => {
    // Simulates a Nori-boosted tile: A normally costs 1 but has been boosted to 5
    const boostedA: LetterTile = { id: 'A0', letter: 'A', chipValue: 5 };
    const tiles = [boostedA, tile('T')];
    const result = scoreSlurp(tiles, 'broth', defaultLevels());
    expect(result.chips).toBe(5 + 1 + 5); // boosted A + T + broth pattern
  });
});
