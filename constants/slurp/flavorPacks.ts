import type { FlavorPackId } from '@/packages/shared/slurp';

export interface FlavorPackDef {
  id: FlavorPackId;
  name: string;
  price: number;
  choiceCount: number;
  desc: string;
}

export const FLAVOR_PACK_DEFS: Record<FlavorPackId, FlavorPackDef> = {
  brothPack: {
    id: 'brothPack', name: 'Broth Pack', price: 4, choiceCount: 2,
    desc: 'Choose 2 of 4 letters to permanently add to The Pot',
  },
  spicePack: {
    id: 'spicePack', name: 'Spice Pack', price: 4, choiceCount: 1,
    desc: 'Choose 1 of 3 Spice Cards to add to your tray',
  },
  umamiPack: {
    id: 'umamiPack', name: 'Umami Pack', price: 6, choiceCount: 1,
    desc: 'Choose 1 of 2 Toppings to equip',
  },
  noodlePack: {
    id: 'noodlePack', name: 'Noodle Pack', price: 4, choiceCount: 1,
    desc: 'Choose 1 of 3 Word Pattern upgrades (+1 level)',
  },
};

export const FLAVOR_PACK_IDS = Object.keys(FLAVOR_PACK_DEFS) as FlavorPackId[];

export const REROLL_COSTS = [5, 7, 10, 15, 25];
