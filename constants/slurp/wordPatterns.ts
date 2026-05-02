import type { WordPattern } from '@/packages/shared/slurp';

export interface WordPatternDef {
  id: WordPattern;
  name: string;
  baseChips: number;
  baseSeasoning: number;
}

export const WORD_PATTERN_DEFS: Record<WordPattern, WordPatternDef> = {
  broth:    { id: 'broth',    name: 'Broth',    baseChips:  5, baseSeasoning: 1.0 },
  noodle:   { id: 'noodle',   name: 'Noodle',   baseChips: 10, baseSeasoning: 1.5 },
  ramen:    { id: 'ramen',    name: 'Ramen',    baseChips: 20, baseSeasoning: 2.0 },
  udon:     { id: 'udon',     name: 'Udon',     baseChips: 35, baseSeasoning: 3.0 },
  pho:      { id: 'pho',      name: 'Pho',      baseChips: 60, baseSeasoning: 4.0 },
  tonkotsu: { id: 'tonkotsu', name: 'Tonkotsu', baseChips: 80, baseSeasoning: 4.0 },
  dashi:    { id: 'dashi',    name: 'Dashi',    baseChips: 50, baseSeasoning: 3.0 },
  miso:     { id: 'miso',     name: 'Miso',     baseChips: 40, baseSeasoning: 2.5 },
};

export const NOODLE_UPGRADE_CAP = 10;
