import type { PantryId } from '@/packages/shared/slurp';

export interface PantryDef {
  id: PantryId;
  name: string;
  price: number;
  desc: string;
}

export const PANTRY_DEFS: Record<PantryId, PantryDef> = {
  miseEnPlace: {
    id: 'miseEnPlace', name: 'Mise en Place', price: 10,
    desc: '+1 bowl size permanently',
  },
  doubleBroth: {
    id: 'doubleBroth', name: 'Double Broth', price: 10,
    desc: '+1 Slurp per Tasting permanently',
  },
  fermented: {
    id: 'fermented', name: 'Fermented', price: 10,
    desc: 'Letters Spit-out gain +2 chip value when they return to The Pot',
  },
  agedStock: {
    id: 'agedStock', name: 'Aged Stock', price: 10,
    desc: 'Every 3rd Slurp of a Tasting awards +20 flat Broth Points',
  },
  larder: {
    id: 'larder', name: 'Larder', price: 8,
    desc: 'Consumable tray expands from 2 to 4 slots',
  },
  recipeBook: {
    id: 'recipeBook', name: 'Recipe Book', price: 12,
    desc: 'At Tasting start, peek at the next 4 letters at the top of The Pot',
  },
};

export const PANTRY_IDS = Object.keys(PANTRY_DEFS) as PantryId[];
