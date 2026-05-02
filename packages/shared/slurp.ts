export type WordPattern = 'broth' | 'noodle' | 'ramen' | 'udon' | 'pho' | 'tonkotsu' | 'dashi' | 'miso';

export type BrothBaseId = 'classicChicken' | 'tonkotsu' | 'clearDashi' | 'miso';

export type PantryId =
  | 'miseEnPlace'
  | 'doubleBroth'
  | 'fermented'
  | 'agedStock'
  | 'larder'
  | 'recipeBook';

export type ChefsChallengeModifier =
  | 'thePickyEater'
  | 'theHealthInspector'
  | 'theRushHour'
  | 'theIngredientShortage'
  | 'theFoodCritic'
  | 'theClosingHour';

export type ToppingId =
  | 'chiliOil'
  | 'softBoiledEgg'
  | 'crispyShallots'
  | 'fishCake'
  | 'nori'
  | 'wontons'
  | 'scallions'
  | 'charSiu'
  | 'porkBelly'
  | 'teaEgg'
  | 'menma'
  | 'narutomaki'
  | 'corn'
  | 'sesameSeeds'
  | 'yuzuKosho'
  | 'mirin'
  | 'aburaAge'
  | 'shiitake'
  | 'doubanjiang'
  | 'gochujang'
  | 'togarashi'
  | 'lard'
  | 'kombu'
  | 'natto';

export type SpiceCardId =
  | 'sichuanPepper'
  | 'msg'
  | 'sesameOil'
  | 'ginger'
  | 'fiveSpice'
  | 'starAnise'
  | 'garlicConfit'
  | 'bonitoFlakes';

export type SecretIngredientId = 'truffleShavings' | 'saffron' | 'blackGarlic' | 'yuzu';

export type ConsumableId = SpiceCardId | SecretIngredientId;

export interface LetterTile {
  id: string;
  letter: string; // 'A'–'Z' or '*' for wildcard
  chipValue: number;
}

export interface SlurpRunState {
  ownerUid: string | null;
  brothBase: BrothBaseId;
  pot: LetterTile[];
  bowl: LetterTile[];
  discard: LetterTile[];
  toppings: ToppingId[];
  consumables: ConsumableId[];
  pantryOwned: PantryId[];
  noodleLevels: Record<WordPattern, number>;
  course: number;
  tasting: 1 | 2 | 3;
  brothQuota: number;
  brothScored: number;
  totalBrothScored: number;
  slurpsRemaining: number;
  spitoutsRemaining: number;
  bowlSize: number;
  coins: number;
  modifier: ChefsChallengeModifier | null;
  modifiersUsed: ChefsChallengeModifier[];
  phase: 'reveal' | 'play' | 'result' | 'market' | 'over';
  runStartedAt: number;
  rngSeed: number;
  rngState: number;
  finalScore: number | null;
  // Topping / run-tracking state
  slurpCountThisTasting: number;
  consecutiveNoSpitoutSlurps: number;
  lastWordLetters: string[];
  pendingChipBonus: number;
  togarashiLetter: string | null;
  coursesCompleted: number;
}

export type SlurpAction =
  | { type: 'START_RUN'; brothBase: BrothBaseId; ownerUid: string | null; seed: number }
  | { type: 'BEGIN_TASTING' }
  | { type: 'SLURP'; tileIds: string[] }
  | { type: 'SPIT_OUT'; tileIds: string[] }
  | { type: 'OPEN_MARKET' }
  | { type: 'ADVANCE' }
  | { type: 'ABANDON_RUN' }
  | { type: 'LOAD_STATE'; state: SlurpRunState };
