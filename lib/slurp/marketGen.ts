import type { ToppingId, PantryId, ConsumableId, FlavorPackId, MarketOffer, SlurpRunState, WordPattern } from '@/packages/shared/slurp';
import type { Rng } from './rng';
import { TOPPING_IDS } from '@/constants/slurp/toppings';
import { SPICE_CARD_DEFS } from '@/constants/slurp/spiceCards';
import { PANTRY_IDS } from '@/constants/slurp/pantry';
import { FLAVOR_PACK_IDS } from '@/constants/slurp/flavorPacks';

export function generateMarketOffers(state: SlurpRunState, rng: Rng): MarketOffer[] {
  const offers: MarketOffer[] = [];

  // 2 Topping slots — exclude already-owned to avoid immediate duplicates
  const ownedSet = new Set<ToppingId>(state.toppings);
  const toppingPool = TOPPING_IDS.filter(id => !ownedSet.has(id));
  const shuffledToppings = rng.shuffle(toppingPool.length >= 2 ? toppingPool : TOPPING_IDS);
  for (let i = 0; i < 2; i++) {
    offers.push({
      id: `topping_${i}`,
      kind: 'topping',
      itemId: shuffledToppings[i % shuffledToppings.length],
      price: 4,
      sold: false,
    });
  }

  // 2 Flavor Pack slots
  const shuffledPacks = rng.shuffle([...FLAVOR_PACK_IDS]);
  for (let i = 0; i < 2; i++) {
    const packId = shuffledPacks[i % shuffledPacks.length] as FlavorPackId;
    const prices: Record<FlavorPackId, number> = {
      brothPack: 4, spicePack: 4, umamiPack: 6, noodlePack: 4,
    };
    offers.push({
      id: `flavor_${i}`,
      kind: 'flavorPack',
      itemId: packId,
      price: prices[packId],
      sold: false,
    });
  }

  // 1 Pantry slot (only un-purchased pantry items)
  const ownedPantry = new Set<PantryId>(state.pantryOwned);
  const availablePantry = PANTRY_IDS.filter(id => !ownedPantry.has(id));
  if (availablePantry.length > 0) {
    const pantryId = rng.shuffle(availablePantry)[0] as PantryId;
    const prices: Record<PantryId, number> = {
      miseEnPlace: 10, doubleBroth: 10, fermented: 10,
      agedStock: 10, larder: 8, recipeBook: 12,
    };
    offers.push({
      id: 'pantry_0',
      kind: 'pantry',
      itemId: pantryId,
      price: prices[pantryId],
      sold: false,
    });
  }

  // 1 Spice Card slot (~10% chance of secret ingredient)
  const isSecret = rng.next() < 0.1;
  const spicePool = SPICE_CARD_DEFS.filter(s => s.isSecret === isSecret);
  const spiceDef = spicePool[rng.nextInt(spicePool.length)];
  offers.push({
    id: 'spice_0',
    kind: 'spice',
    itemId: spiceDef.id,
    price: spiceDef.price,
    sold: false,
  });

  return offers;
}

export function generateFlavorPackChoices(
  packId: FlavorPackId,
  state: SlurpRunState,
  rng: Rng,
): string[] {
  const ALL_PATTERNS: WordPattern[] = ['broth', 'noodle', 'ramen', 'udon', 'pho', 'tonkotsu', 'dashi', 'miso'];
  const COMMON_LETTERS = 'AAEEIILNNOORSSTU'.split('');

  switch (packId) {
    case 'spicePack': {
      const nonSecret = SPICE_CARD_DEFS.filter(s => !s.isSecret).map(s => s.id);
      return rng.shuffle(nonSecret as string[]).slice(0, 3);
    }
    case 'umamiPack': {
      const ownedSet = new Set<ToppingId>(state.toppings);
      const pool = TOPPING_IDS.filter(id => !ownedSet.has(id));
      return rng.shuffle((pool.length >= 2 ? pool : TOPPING_IDS) as string[]).slice(0, 2);
    }
    case 'noodlePack': {
      return rng.shuffle(ALL_PATTERNS as string[]).slice(0, 3);
    }
    case 'brothPack': {
      return rng.shuffle(COMMON_LETTERS).slice(0, 4);
    }
  }
}
