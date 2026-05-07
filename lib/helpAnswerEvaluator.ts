import type { GameId } from '@/constants/data';
import type { ContentBanks } from '@/packages/shared/contentTypes';

export interface HelperAnswerEvaluation {
  correct: boolean | null;
  label: string;                   // friend's answer, formatted
  questionText: string;            // the question prompt the friend saw
  correctLabel: string | null;     // the right answer, formatted; null when no objective answer
}

const WAVE_DISTANCE_THRESHOLD = 30;

const EMPTY: HelperAnswerEvaluation = {
  correct: null,
  label: '',
  questionText: '',
  correctLabel: null,
};

export function evaluateHelperAnswer(
  gameId: GameId,
  questionIndex: number,
  helperAnswer: string,
  banks: ContentBanks,
): HelperAnswerEvaluation {
  const trimmed = helperAnswer.trim();

  switch (gameId) {
    case 'lede': {
      const item = banks.lede[questionIndex];
      if (!item) return { ...EMPTY, label: trimmed };
      const correctPanelist = item.panelists.find(p => p.isCorrect);
      const correctLabel = correctPanelist?.completion ?? null;
      const idx = parseInt(trimmed, 10);
      if (isNaN(idx) || !item.panelists[idx]) {
        return { correct: null, label: trimmed, questionText: item.partialHeadline, correctLabel };
      }
      const panelist = item.panelists[idx];
      return {
        correct: panelist.isCorrect,
        label: panelist.completion,
        questionText: item.partialHeadline,
        correctLabel,
      };
    }

    case 'spread': {
      const item = banks.spread[questionIndex];
      if (!item) return { ...EMPTY, label: trimmed };
      const numeric = parseFloat(trimmed.replace(/,/g, ''));
      const correctLabel = `${item.answer} ${item.unit}`;
      if (Number.isNaN(numeric)) {
        return { correct: null, label: trimmed, questionText: item.question, correctLabel };
      }
      return {
        correct: numeric === item.answer,
        label: `${numeric} ${item.unit}`,
        questionText: item.question,
        correctLabel,
      };
    }

    case 'sof': {
      const item = banks.sof[questionIndex];
      if (!item) return { ...EMPTY, label: trimmed };
      const fictionIdx = item.claims.findIndex(c => !c.isScience);
      const correctLabel = fictionIdx >= 0 ? `Claim ${fictionIdx + 1}` : null;
      const claimIdx = parseInt(trimmed, 10) - 1;
      const claim = item.claims[claimIdx];
      if (!claim) {
        return { correct: null, label: trimmed, questionText: item.topic, correctLabel };
      }
      return {
        correct: !claim.isScience,
        label: `Claim ${claimIdx + 1}`,
        questionText: item.topic,
        correctLabel,
      };
    }

    case 'wave': {
      const item = banks.wave[questionIndex];
      if (!item) return { ...EMPTY, label: trimmed };
      const correctLabel = `${item.truthPosition}%`;
      const numeric = parseFloat(trimmed);
      if (Number.isNaN(numeric)) {
        return { correct: null, label: trimmed, questionText: item.story, correctLabel };
      }
      const distance = Math.abs(numeric - item.truthPosition);
      return {
        correct: distance <= WAVE_DISTANCE_THRESHOLD,
        label: `${Math.round(numeric)}%`,
        questionText: item.story,
        correctLabel,
      };
    }

    case 'quip': {
      const item = banks.quip[questionIndex];
      return {
        correct: null,
        label: trimmed,
        questionText: item?.setup ?? '',
        correctLabel: null,
      };
    }

    default:
      return { ...EMPTY, label: trimmed };
  }
}
