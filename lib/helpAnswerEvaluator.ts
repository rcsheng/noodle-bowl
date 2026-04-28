import type { GameId } from '@/constants/data';
import { scoreSpread } from '@/constants/utils';
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
      const realPanelist = item.panelists.find(p => p.isCorrect);
      const picked = item.panelists.find(p => p.name === trimmed);
      return {
        correct: picked ? picked.isCorrect : null,
        label: picked ? picked.name : trimmed,
        questionText: item.partialHeadline,
        correctLabel: realPanelist?.name ?? null,
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
      const { correct } = scoreSpread(numeric, item.answer);
      return {
        correct,
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
