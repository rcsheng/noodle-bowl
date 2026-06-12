import type { ContentBanks } from '@/packages/shared/contentTypes';
import { evaluateHelperAnswer, formatPredictionLabel } from '../helpAnswerEvaluator';

const banks: ContentBanks = {
  lede: [
    {
      partialHeadline: 'Cat Burglar Caught',
      sourceHint: 'Local',
      panelists: [
        { name: 'Alex', role: 'Reporter', completion: 'red-handed', pitch: 'p', isCorrect: false },
        { name: 'Bea', role: 'Reporter', completion: 'on tape', pitch: 'p', isCorrect: true },
        { name: 'Cam', role: 'Reporter', completion: 'sleeping', pitch: 'p', isCorrect: false },
      ],
      explanation: 'because',
    },
  ],
  spread: [{ question: 'q', answer: 100, unit: 'units', others: [], explanation: 'e' }],
  sof: [
    {
      topic: 't',
      intro: 'i',
      weirdAndTrue: false,
      claims: [
        { text: 'one', isScience: true, explanation: 'e', source: null },
        { text: 'two', isScience: false, explanation: 'e', source: null },
        { text: 'three', isScience: true, explanation: 'e', source: null },
      ],
    },
  ],
  wave: [{ leftLabel: 'L', rightLabel: 'R', story: 's', truthPosition: 60, explanation: 'e' }],
  quip: [{ setup: 's', sourceHint: 'h' }],
};

describe('evaluateHelperAnswer', () => {
  describe('lede', () => {
    test('returns completion as label and correctLabel when helper picked the correct option (index 1)', () => {
      const r = evaluateHelperAnswer('lede', 0, '1', banks);
      expect(r.correct).toBe(true);
      expect(r.label).toBe('on tape');
      expect(r.questionText).toBe('Cat Burglar Caught');
      expect(r.correctLabel).toBe('on tape');
    });

    test('wrong when helper picked a wrong option (correctLabel still set to correct completion)', () => {
      const r = evaluateHelperAnswer('lede', 0, '0', banks);
      expect(r.correct).toBe(false);
      expect(r.label).toBe('red-handed');
      expect(r.correctLabel).toBe('on tape');
    });

    test('null correct when index is out of range but questionText and correctLabel still returned', () => {
      const r = evaluateHelperAnswer('lede', 0, '9', banks);
      expect(r.correct).toBeNull();
      expect(r.questionText).toBe('Cat Burglar Caught');
      expect(r.correctLabel).toBe('on tape');
    });
  });

  describe('spread', () => {
    test('correct when answer matches exactly', () => {
      const r = evaluateHelperAnswer('spread', 0, '100', banks);
      expect(r.correct).toBe(true);
      expect(r.label).toBe('100 units');
      expect(r.correctLabel).toBe('100 units');
      expect(r.questionText).toBe('q');
    });

    test('wrong when answer does not match exactly', () => {
      const r = evaluateHelperAnswer('spread', 0, '110', banks);
      expect(r.correct).toBe(false);
      expect(r.label).toBe('110 units');
      expect(r.correctLabel).toBe('100 units');
    });

    test('wrong when far off', () => {
      const r = evaluateHelperAnswer('spread', 0, '500', banks);
      expect(r.correct).toBe(false);
    });

    test('null when answer is not numeric', () => {
      const r = evaluateHelperAnswer('spread', 0, 'banana', banks);
      expect(r.correct).toBeNull();
    });
  });

  describe('sof', () => {
    test('correct + correctLabel points to the fiction claim', () => {
      const r = evaluateHelperAnswer('sof', 0, '2', banks);
      expect(r.correct).toBe(true);
      expect(r.label).toBe('Claim 2');
      expect(r.correctLabel).toBe('Claim 2');
      expect(r.questionText).toBe('t');
    });

    test('wrong when helper flagged a real claim', () => {
      const r = evaluateHelperAnswer('sof', 0, '1', banks);
      expect(r.correct).toBe(false);
      expect(r.correctLabel).toBe('Claim 2');
    });

    test('null on out-of-range claim index', () => {
      const r = evaluateHelperAnswer('sof', 0, '9', banks);
      expect(r.correct).toBeNull();
    });
  });

  describe('wave', () => {
    test('correct + correctLabel formatted as percentage', () => {
      const r = evaluateHelperAnswer('wave', 0, '50', banks);
      expect(r.correct).toBe(true);
      expect(r.label).toBe('50%');
      expect(r.correctLabel).toBe('60%');
    });

    test('wrong when far from truth', () => {
      const r = evaluateHelperAnswer('wave', 0, '5', banks);
      expect(r.correct).toBe(false);
    });
  });

  describe('quip', () => {
    test('correct is null and correctLabel is null', () => {
      const r = evaluateHelperAnswer('quip', 0, 'something witty', banks);
      expect(r.correct).toBeNull();
      expect(r.label).toBe('something witty');
      expect(r.correctLabel).toBeNull();
      expect(r.questionText).toBe('s');
    });
  });

  test('returns null correct + empty fields when bank entry is missing', () => {
    const r = evaluateHelperAnswer('lede', 99, 'Bea', banks);
    expect(r.correct).toBeNull();
    expect(r.questionText).toBe('');
    expect(r.correctLabel).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatPredictionLabel
// ---------------------------------------------------------------------------
describe('formatPredictionLabel', () => {
  const MAX = 40;

  test('returns lede label as-is regardless of length', () => {
    const long = 'a'.repeat(80);
    expect(formatPredictionLabel('lede', long)).toBe(long);
  });

  test('returns spread label as-is', () => {
    expect(formatPredictionLabel('spread', '42.5 million')).toBe('42.5 million');
  });

  test('returns sof label as-is when within max chars', () => {
    expect(formatPredictionLabel('sof', 'Claim 1')).toBe('Claim 1');
    // exactly at limit
    expect(formatPredictionLabel('sof', 'a'.repeat(MAX))).toBe('a'.repeat(MAX));
  });

  test('truncates sof label with ellipsis when over max chars', () => {
    const long = 'a'.repeat(MAX + 10);
    const result = formatPredictionLabel('sof', long);
    expect(result).toBe('a'.repeat(MAX) + '…');
    expect(result.length).toBe(MAX + 1); // 40 chars + single '…' (1 char)
  });

  test('returns wave label as-is', () => {
    expect(formatPredictionLabel('wave', '75%')).toBe('75%');
  });

  test('returns quip label as-is', () => {
    expect(formatPredictionLabel('quip', 'some witty text')).toBe('some witty text');
  });
});
