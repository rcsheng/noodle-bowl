import type { ConsumableId } from '@/packages/shared/slurp';

export interface SpiceCardDef {
  id: ConsumableId;
  name: string;
  price: number;
  desc: string;
  isSecret: boolean;
}

export const SPICE_CARD_DEFS: SpiceCardDef[] = [
  {
    id: 'sichuanPepper', name: 'Sichuan Pepper', price: 3, isSecret: false,
    desc: 'Add 3 copies of a chosen letter to The Pot',
  },
  {
    id: 'msg', name: 'MSG', price: 3, isSecret: false,
    desc: 'Gain +30 Coins immediately',
  },
  {
    id: 'sesameOil', name: 'Sesame Oil', price: 3, isSecret: false,
    desc: 'Choose 2 Bowl letters; they become wildcards for the next Slurp',
  },
  {
    id: 'ginger', name: 'Ginger', price: 3, isSecret: false,
    desc: 'Permanently remove 1 chosen letter from The Pot',
  },
  {
    id: 'fiveSpice', name: 'Five Spice', price: 3, isSecret: false,
    desc: 'The next Slurp scores 5× (chips and seasoning both ×5)',
  },
  {
    id: 'starAnise', name: 'Star Anise', price: 3, isSecret: false,
    desc: 'Discard all Bowl letters and draw a fresh one; free action',
  },
  {
    id: 'garlicConfit', name: 'Garlic Confit', price: 3, isSecret: false,
    desc: 'All copies of a chosen letter in The Pot gain +2 chip value permanently',
  },
  {
    id: 'bonitoFlakes', name: 'Bonito Flakes', price: 3, isSecret: false,
    desc: 'The next Word Pattern triggered is leveled up by +1 for that Slurp',
  },
  {
    id: 'truffleShavings', name: 'Truffle Shavings', price: 6, isSecret: true,
    desc: 'Double the chip value of every letter currently in The Pot (permanent)',
  },
  {
    id: 'saffron', name: 'Saffron', price: 6, isSecret: true,
    desc: 'Sell all equipped Toppings for 2× their sell price; clears the tray',
  },
  {
    id: 'blackGarlic', name: 'Black Garlic', price: 6, isSecret: true,
    desc: 'Convert all letters of one chosen value into a chosen new letter',
  },
  {
    id: 'yuzu', name: 'Yuzu', price: 6, isSecret: true,
    desc: 'Skip the next Tasting entirely (auto-passes; no Coins awarded)',
  },
];

export const SPICE_CARD_MAP = Object.fromEntries(
  SPICE_CARD_DEFS.map(d => [d.id, d]),
) as Record<ConsumableId, SpiceCardDef>;
