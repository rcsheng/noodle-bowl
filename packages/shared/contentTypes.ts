import type { LedeItem, QuipPrompt, SofItem, SpreadItem, WaveItem } from '../../constants/data';

export interface ContentBanks {
  lede: LedeItem[];
  spread: SpreadItem[];
  sof: SofItem[];
  quip: QuipPrompt[];
  wave: WaveItem[];
}

export interface ContentVersion {
  id: string;
  contentWeek: string; // ISO week string, e.g. "2026-W20". Empty string for bundled fallback.
  createdAt: string;
  banks: ContentBanks;
}

export interface ContentPackMeta {
  date: string;        // YYYY-MM-DD — primary identifier for the pack
  weekId: string;      // ISO week string, e.g. "2026-W20"
  publishedAt: string; // ISO timestamp
  ledeCount: number;
  spreadCount: number;
  sofCount: number;
}
