import type { LedeItem, QuipPrompt, SofItem, SpreadItem, WaveItem } from '@/constants/data';

export interface ContentBanks {
  lede: LedeItem[];
  spread: SpreadItem[];
  sof: SofItem[];
  quip: QuipPrompt[];
  wave: WaveItem[];
}

export interface ContentVersion {
  id: string;
  active: boolean;
  createdAt: string;
  banks: ContentBanks;
}
