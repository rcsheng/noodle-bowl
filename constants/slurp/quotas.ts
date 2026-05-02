export const BROTH_QUOTAS: Record<number, Record<number, number>> = {
  1: { 1: 300,   2: 450,    3: 700   },
  2: { 1: 1200,  2: 2000,   3: 3500  },
  3: { 1: 6000,  2: 11000,  3: 22000 },
};

export const COIN_REWARDS: Record<number, number> = {
  1: 3,  // Sip
  2: 5,  // Bowl Tasting
  3: 8,  // Chef's Challenge
};

export const DEFAULT_BOWL_SIZE = 7;
export const DEFAULT_SLURPS = 4;
export const DEFAULT_SPITOUTS = 3;
