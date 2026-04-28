import type { ContentBanks } from '@/packages/shared/contentTypes';
import { evaluateHelperAnswer } from '../helpAnswerEvaluator';

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
    test('returns label, questionText, correctLabel when helper picked the real panelist', () => {
      const r = evaluateHelperAnswer('lede', 0, 'Bea', banks);
      expect(r.correct).toBe(true);
      expect(r.label).toBe('Bea');
      expect(r.questionText).toBe('Cat Burglar Caught');
      expect(r.correctLabel).toBe('Bea');
    });

    test('wrong when helper picked a fake panelist (correctLabel still set)', () => {
      const r = evaluateHelperAnswer('lede', 0, 'Alex', banks);
      expect(r.correct).toBe(false);
      expect(r.label).toBe('Alex');
      expect(r.correctLabel).toBe('Bea');
    });

    test('null correct when panelist name is unknown but questionText present', () => {
      const r = evaluateHelperAnswer('lede', 0, 'Nobody', banks);
      expect(r.correct).toBeNull();
      expect(r.questionText).toBe('Cat Burglar Caught');
      expect(r.correctLabel).toBe('Bea');
    });
  });

  describe('spread', () => {
    test('correct + correctLabel formatted with unit', () => {
      const r = evaluateHelperAnswer('spread', 0, '110', banks);
      expect(r.correct).toBe(true);
      expect(r.label).toBe('110 units');
      expect(r.correctLabel).toBe('100 units');
      expect(r.questionText).toBe('q');
    });

    test('wrong when deviation exceeds 30%', () => {
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
