import type { ToppingId } from '@/packages/shared/slurp';

export interface ToppingDef {
  id: ToppingId;
  name: string;
  price: number;
  sellValue: number;
  triggerDesc: string;
  effectDesc: string;
}

export const TOPPING_DEFS: Record<ToppingId, ToppingDef> = {
  chiliOil: {
    id: 'chiliOil', name: 'Chili Oil', price: 4, sellValue: 2,
    triggerDesc: 'Word contains 2+ consecutive vowels',
    effectDesc: '+4 Seasoning',
  },
  softBoiledEgg: {
    id: 'softBoiledEgg', name: 'Soft-Boiled Egg', price: 4, sellValue: 2,
    triggerDesc: 'First Slurp of each Tasting',
    effectDesc: 'Letter chips count double',
  },
  crispyShallots: {
    id: 'crispyShallots', name: 'Crispy Shallots', price: 4, sellValue: 2,
    triggerDesc: 'Word contains double letters (e.g. BUBBLE)',
    effectDesc: '×3 Seasoning',
  },
  fishCake: {
    id: 'fishCake', name: 'Fish Cake', price: 4, sellValue: 2,
    triggerDesc: 'Word is a palindrome (Dashi pattern)',
    effectDesc: '+100 flat Broth Points',
  },
  nori: {
    id: 'nori', name: 'Nori', price: 4, sellValue: 2,
    triggerDesc: 'Any Slurp',
    effectDesc: 'Most-used letter gains +1 chip permanently',
  },
  wontons: {
    id: 'wontons', name: 'Wontons', price: 4, sellValue: 2,
    triggerDesc: 'Udon (7-letter) or Pho (8+ letter) word',
    effectDesc: '+1 bowl size permanently (max 11)',
  },
  scallions: {
    id: 'scallions', name: 'Scallions', price: 4, sellValue: 2,
    triggerDesc: 'Any Slurp',
    effectDesc: '+1 Seasoning per vowel in the word',
  },
  charSiu: {
    id: 'charSiu', name: 'Char Siu', price: 4, sellValue: 2,
    triggerDesc: 'Your last Slurp of a Tasting',
    effectDesc: 'Score for that Slurp is doubled',
  },
  porkBelly: {
    id: 'porkBelly', name: 'Pork Belly', price: 4, sellValue: 2,
    triggerDesc: 'End of each Tasting won',
    effectDesc: '+1 Coin per 200 Broth above Quota',
  },
  teaEgg: {
    id: 'teaEgg', name: 'Tea Egg', price: 4, sellValue: 2,
    triggerDesc: 'Any Slurp',
    effectDesc: '+5 chips × Slurps completed this Tasting',
  },
  menma: {
    id: 'menma', name: 'Menma', price: 4, sellValue: 2,
    triggerDesc: 'Any Slurp without a preceding Spit-out',
    effectDesc: '+5 chips per consecutive no-Spit-out streak',
  },
  narutomaki: {
    id: 'narutomaki', name: 'Narutomaki', price: 4, sellValue: 2,
    triggerDesc: 'Any Slurp',
    effectDesc: '+2 chips per Topping currently equipped',
  },
  corn: {
    id: 'corn', name: 'Corn', price: 4, sellValue: 2,
    triggerDesc: 'Word contains 3+ distinct vowels',
    effectDesc: '+4 Seasoning',
  },
  sesameSeeds: {
    id: 'sesameSeeds', name: 'Sesame Seeds', price: 4, sellValue: 2,
    triggerDesc: 'Any Slurp',
    effectDesc: '+1 chip per word letter also in the Bowl',
  },
  yuzuKosho: {
    id: 'yuzuKosho', name: 'Yuzu Kosho', price: 4, sellValue: 2,
    triggerDesc: 'Any Slurp',
    effectDesc: '+1 Seasoning per Course completed',
  },
  mirin: {
    id: 'mirin', name: 'Mirin', price: 4, sellValue: 2,
    triggerDesc: 'Word contains no repeated letters',
    effectDesc: '+3 Seasoning',
  },
  aburaAge: {
    id: 'aburaAge', name: 'Abura-age', price: 4, sellValue: 2,
    triggerDesc: 'After each Slurp',
    effectDesc: 'Leftmost Bowl letter gains +1 chip permanently',
  },
  shiitake: {
    id: 'shiitake', name: 'Shiitake', price: 4, sellValue: 2,
    triggerDesc: 'Spit-out includes a letter with chip value ≥ 5',
    effectDesc: '+15 chips on your next Slurp',
  },
  doubanjiang: {
    id: 'doubanjiang', name: 'Doubanjiang', price: 4, sellValue: 2,
    triggerDesc: 'Word contains 2+ rare letters (J/K/Q/X/Z)',
    effectDesc: '×2 Seasoning',
  },
  gochujang: {
    id: 'gochujang', name: 'Gochujang', price: 4, sellValue: 2,
    triggerDesc: 'Word starts and ends with the same letter',
    effectDesc: '+25 chips',
  },
  togarashi: {
    id: 'togarashi', name: 'Togarashi', price: 4, sellValue: 2,
    triggerDesc: 'Start of each Tasting',
    effectDesc: 'One Bowl letter designated; words with it give +7 Seasoning',
  },
  lard: {
    id: 'lard', name: 'Lard', price: 4, sellValue: 2,
    triggerDesc: 'Any Slurp scoring 500+ Broth Points',
    effectDesc: '+1 Coin',
  },
  kombu: {
    id: 'kombu', name: 'Kombu', price: 4, sellValue: 2,
    triggerDesc: 'Start of each new Course',
    effectDesc: 'All Pot letters permanently gain +1 chip',
  },
  natto: {
    id: 'natto', name: 'Natto', price: 4, sellValue: 2,
    triggerDesc: 'Word shares a letter with the previous word',
    effectDesc: '+10 chips per overlapping distinct letter',
  },
};

export const TOPPING_IDS = Object.keys(TOPPING_DEFS) as ToppingId[];
export const MAX_TOPPINGS = 5;
export const MAX_BOWL_SIZE = 11;
