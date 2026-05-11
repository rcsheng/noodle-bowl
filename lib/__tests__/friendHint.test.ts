import { isFriendHintMatch } from '../friendHint';

describe('isFriendHintMatch', () => {
  describe('lede (0-based index)', () => {
    it('matches when hint equals option index', () => {
      expect(isFriendHintMatch('lede', 0, '0')).toBe(true);
      expect(isFriendHintMatch('lede', 2, '2')).toBe(true);
    });

    it('does not match when hint differs from option index', () => {
      expect(isFriendHintMatch('lede', 1, '0')).toBe(false);
      expect(isFriendHintMatch('lede', 0, '1')).toBe(false);
    });
  });

  describe('sof (1-based hint → 0-based index)', () => {
    it('matches when 1-based hint maps to option index', () => {
      expect(isFriendHintMatch('sof', 0, '1')).toBe(true);
      expect(isFriendHintMatch('sof', 1, '2')).toBe(true);
    });

    it('does not match for the wrong index', () => {
      expect(isFriendHintMatch('sof', 1, '1')).toBe(false);
      expect(isFriendHintMatch('sof', 0, '2')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for an empty hint', () => {
      expect(isFriendHintMatch('lede', 0, '')).toBe(false);
    });

    it('returns false for an undefined hint', () => {
      expect(isFriendHintMatch('lede', 0, undefined)).toBe(false);
    });

    it('returns false for a non-numeric hint', () => {
      expect(isFriendHintMatch('lede', 0, 'abc')).toBe(false);
      expect(isFriendHintMatch('sof', 0, 'abc')).toBe(false);
    });

    it('returns false for games without discrete options (spread, wave, quip)', () => {
      expect(isFriendHintMatch('spread', 0, '42')).toBe(false);
      expect(isFriendHintMatch('wave', 0, '50')).toBe(false);
      expect(isFriendHintMatch('quip', 0, 'anything')).toBe(false);
    });
  });
});
