import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RisoBorder } from '@/components/slurp/RisoBorder';
import { RisoButton } from '@/components/slurp/RisoButton';
import { RisoMisreg } from '@/components/slurp/RisoMisreg';
import { R, RF } from '@/constants/slurp/riso';
import { TOPPING_DEFS, MAX_TOPPINGS } from '@/constants/slurp/toppings';
import { PANTRY_DEFS } from '@/constants/slurp/pantry';
import { FLAVOR_PACK_DEFS, REROLL_COSTS } from '@/constants/slurp/flavorPacks';
import { SPICE_CARD_MAP } from '@/constants/slurp/spiceCards';
import { WORD_PATTERN_DEFS } from '@/constants/slurp/wordPatterns';
import { useSlurp } from '@/context/SlurpContext';
import { slurpMarketPurchase } from '@/lib/analytics';
import type { MarketOffer, ToppingId } from '@/packages/shared/slurp';

const KIND_LABELS: Record<string, string> = {
  topping: 'TOPPING',
  flavorPack: 'FLAVOR PACK',
  pantry: 'PANTRY',
  spice: 'SPICE',
};

const KIND_COLORS: Record<string, string> = {
  topping: R.cream,
  flavorPack: R.mustard,
  pantry: R.creamDeep,
  spice: R.cream,
};

function getOfferLabel(offer: MarketOffer): { name: string; desc: string } {
  switch (offer.kind) {
    case 'topping': {
      const def = TOPPING_DEFS[offer.itemId as ToppingId];
      return { name: def?.name ?? offer.itemId, desc: def?.effectDesc ?? '' };
    }
    case 'flavorPack': {
      const def = FLAVOR_PACK_DEFS[offer.itemId as keyof typeof FLAVOR_PACK_DEFS];
      return { name: def?.name ?? offer.itemId, desc: def?.desc ?? '' };
    }
    case 'pantry': {
      const def = PANTRY_DEFS[offer.itemId as keyof typeof PANTRY_DEFS];
      return { name: def?.name ?? offer.itemId, desc: def?.desc ?? '' };
    }
    case 'spice': {
      const def = SPICE_CARD_MAP[offer.itemId as keyof typeof SPICE_CARD_MAP];
      return { name: def?.name ?? offer.itemId, desc: def?.desc ?? '' };
    }
    default:
      return { name: offer.itemId, desc: '' };
  }
}

function getChoiceLabel(packId: string, choice: string): string {
  if (packId === 'spicePack') return SPICE_CARD_MAP[choice as keyof typeof SPICE_CARD_MAP]?.name ?? choice;
  if (packId === 'umamiPack') return TOPPING_DEFS[choice as ToppingId]?.name ?? choice;
  if (packId === 'noodlePack') return WORD_PATTERN_DEFS[choice as keyof typeof WORD_PATTERN_DEFS]?.name ?? choice;
  if (packId === 'brothPack') return `Letter "${choice}"`;
  return choice;
}

export default function MarketScreen() {
  const { runState: state, dispatch } = useSlurp();
  const [showSellModal, setShowSellModal] = useState(false);
  const [pendingBuyOfferId, setPendingBuyOfferId] = useState<string | null>(null);

  if (!state) return null;

  const rerollCost = REROLL_COSTS[Math.min(state.marketRerollCount, REROLL_COSTS.length - 1)];
  const maxConsumables = state.pantryOwned.includes('larder') ? 4 : 2;

  function handleBuy(offer: MarketOffer) {
    if (!state) return;
    if (state.coins < offer.price) {
      Alert.alert('Not enough coins', `You need ¢${offer.price} but have ¢${state.coins}.`);
      return;
    }
    if (offer.kind === 'topping' && state.toppings.length >= MAX_TOPPINGS) {
      setPendingBuyOfferId(offer.id);
      setShowSellModal(true);
      return;
    }
    if (offer.kind === 'spice' && state.consumables.length >= maxConsumables) {
      Alert.alert('Tray full', `You can hold ${maxConsumables} consumables. Use or sell one first.`);
      return;
    }
    dispatch({ type: 'BUY_ITEM', offerId: offer.id });
    slurpMarketPurchase(offer.kind, offer.itemId, offer.price);
  }

  function handleSellAndBuy(toppingId: ToppingId) {
    if (!state || !pendingBuyOfferId) return;
    const pendingOffer = state.marketItems.find(o => o.id === pendingBuyOfferId);
    dispatch({ type: 'SELL_TOPPING', toppingId });
    dispatch({ type: 'BUY_ITEM', offerId: pendingBuyOfferId });
    if (pendingOffer) slurpMarketPurchase(pendingOffer.kind, pendingOffer.itemId, pendingOffer.price);
    setShowSellModal(false);
    setPendingBuyOfferId(null);
  }

  function handleReroll() {
    if (!state) return;
    if (state.coins < rerollCost) {
      Alert.alert('Not enough coins', `Reroll costs ¢${rerollCost}.`);
      return;
    }
    dispatch({ type: 'REROLL' });
  }

  function handleSkip() {
    dispatch({ type: 'SKIP_MARKET' });
    router.back();
  }

  function handleNext() {
    dispatch({ type: 'ADVANCE' });
    router.back();
  }

  function handleFlavorChoice(choice: string) {
    if (!state?.pendingFlavorPack) return;
    dispatch({ type: 'CHOOSE_FLAVOR', offerId: state.pendingFlavorPack.offerId, choice });
  }

  const pendingPack = state.pendingFlavorPack;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>INTERMISSION</Text>
          <RisoMisreg size={22}>The Market</RisoMisreg>
        </View>
        <View style={styles.coinBadge}>
          <Text style={styles.coinText}>¢{state.coins}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Market items */}
        <View style={styles.grid}>
          {state.marketItems.map((offer, i) => {
            const { name, desc } = getOfferLabel(offer);
            const canAfford = state.coins >= offer.price;
            return (
              <View
                key={offer.id}
                style={[
                  styles.itemCard,
                  { backgroundColor: KIND_COLORS[offer.kind] },
                  offer.sold && styles.itemCardSold,
                  { transform: [{ rotate: `${i % 2 === 0 ? -0.5 : 0.5}deg` }] },
                ]}
              >
                <Text style={styles.itemCategory}>{KIND_LABELS[offer.kind]}</Text>
                <Text style={styles.itemName}>{name}</Text>
                <Text style={styles.itemDesc}>{desc}</Text>
                <View style={styles.itemFooter}>
                  <Text style={styles.itemPrice}>¢{offer.price}</Text>
                  {offer.sold ? (
                    <Text style={styles.soldLabel}>SOLD</Text>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleBuy(offer)}
                      style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
                      disabled={!canAfford}
                    >
                      <Text style={styles.buyBtnText}>BUY</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
          {state.marketItems.length === 0 && (
            <Text style={styles.emptyLabel}>Loading market…</Text>
          )}
        </View>

        {/* Equipped toppings */}
        {state.toppings.length > 0 && (
          <RisoBorder bg={R.creamDeep} pad={10} style={styles.section}>
            <Text style={styles.sectionTitle}>EQUIPPED TOPPINGS</Text>
            {state.toppings.map(tId => {
              const def = TOPPING_DEFS[tId];
              return (
                <View key={tId} style={styles.toppingRow}>
                  <View style={styles.toppingInfo}>
                    <Text style={styles.toppingName}>{def?.name ?? tId}</Text>
                    <Text style={styles.toppingEffect}>{def?.effectDesc ?? ''}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => dispatch({ type: 'SELL_TOPPING', toppingId: tId })}
                    style={styles.sellBtn}
                  >
                    <Text style={styles.sellBtnText}>SELL ¢{def?.sellValue ?? 2}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </RisoBorder>
        )}

        {/* Run stats */}
        <RisoBorder bg={R.creamDeep} pad={12} style={styles.runStats}>
          <Text style={styles.statsTitle}>THIS RUN</Text>
          <View style={styles.statsGrid}>
            <StatCell label="COURSE" value={`${state.course} / 3`} />
            <StatCell label="TASTING" value={`${state.tasting} / 3`} />
            <StatCell label="BROTH" value={state.totalBrothScored.toLocaleString()} />
            <StatCell label="TOPPINGS" value={`${state.toppings.length} / ${MAX_TOPPINGS}`} />
          </View>
        </RisoBorder>

        {/* Noodle upgrade levels */}
        <RisoBorder bg={R.creamDeep} pad={12} style={styles.noodleLevels}>
          <Text style={styles.statsTitle}>NOODLE UPGRADES</Text>
          {(Object.entries(WORD_PATTERN_DEFS) as [string, typeof WORD_PATTERN_DEFS[keyof typeof WORD_PATTERN_DEFS]][]).map(([id, def]) => {
            const lvl = state.noodleLevels[id as keyof typeof WORD_PATTERN_DEFS] ?? 0;
            return (
              <View key={id} style={styles.noodleRow}>
                <Text style={styles.noodlePatternName}>{def.name}</Text>
                <Text style={styles.noodleBonus}>
                  {`+${def.baseChips + lvl * 10} / ×${(def.baseSeasoning + lvl * 0.5).toFixed(1)}`}
                </Text>
                <View style={styles.noodleLvlBadge}>
                  <Text style={styles.noodleLvlText}>{lvl > 0 ? `LV.${lvl}` : '—'}</Text>
                </View>
              </View>
            );
          })}
        </RisoBorder>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <RisoButton
          variant="cream"
          flex={1}
          onPress={handleReroll}
          disabled={state.coins < rerollCost}
        >
          {`REROLL ¢${rerollCost}`}
        </RisoButton>
        <RisoButton variant="mustard" flex={1} onPress={handleSkip}>
          SKIP +¢5
        </RisoButton>
        <RisoButton variant="ink" flex={1} onPress={handleNext}>
          NEXT →
        </RisoButton>
      </View>

      {/* Sell-to-make-room modal */}
      <Modal visible={showSellModal} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { setShowSellModal(false); setPendingBuyOfferId(null); }}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Topping Tray Full</Text>
            <Text style={styles.modalSub}>Sell a Topping to make room.</Text>
            {state.toppings.map(tId => {
              const def = TOPPING_DEFS[tId];
              return (
                <TouchableOpacity key={tId} style={styles.sellRow} onPress={() => handleSellAndBuy(tId)}>
                  <Text style={styles.sellRowName}>{def?.name ?? tId}</Text>
                  <Text style={styles.sellRowValue}>Sell for ¢{def?.sellValue ?? 2}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowSellModal(false); setPendingBuyOfferId(null); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Flavor Pack choice modal */}
      <Modal visible={!!pendingPack} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {pendingPack && (
              <>
                <Text style={styles.modalTitle}>{FLAVOR_PACK_DEFS[pendingPack.packId]?.name}</Text>
                <Text style={styles.modalSub}>
                  {pendingPack.packId === 'brothPack' && pendingPack.picksRemaining === 2
                    ? 'Choose 2 letters (pick your first):'
                    : pendingPack.packId === 'brothPack' && pendingPack.picksRemaining === 1
                    ? 'Choose 1 more letter:'
                    : 'Choose one:'}
                </Text>
                {pendingPack.choices.map(choice => (
                  <TouchableOpacity key={choice} style={styles.choiceBtn} onPress={() => handleFlavorChoice(choice)}>
                    <Text style={styles.choiceBtnText}>{getChoiceLabel(pendingPack.packId, choice)}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: R.cream },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: R.ink,
    borderStyle: 'dashed',
  },
  eyebrow: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
    color: R.red,
    marginBottom: 2,
  },
  coinBadge: {
    backgroundColor: R.mustard,
    borderWidth: 2,
    borderColor: R.ink,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: R.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  coinText: {
    fontFamily: RF.mono,
    fontWeight: '900',
    fontSize: 13,
    color: R.ink,
  },
  content: { padding: 12, paddingBottom: 20 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  itemCard: {
    width: '47%',
    borderWidth: 2,
    borderColor: R.ink,
    borderRadius: 6,
    padding: 8,
    minHeight: 120,
    shadowColor: R.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  itemCardSold: { opacity: 0.45 },
  itemCategory: {
    fontFamily: RF.mono,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: R.red,
    marginBottom: 3,
  },
  itemName: {
    fontWeight: '900',
    fontSize: 12,
    color: R.ink,
    marginBottom: 3,
    lineHeight: 15,
  },
  itemDesc: {
    fontFamily: RF.serifItalic,
    fontSize: 9,
    color: R.ink,
    opacity: 0.65,
    flex: 1,
    marginBottom: 6,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontFamily: RF.mono,
    fontWeight: '900',
    fontSize: 11,
    color: R.ink,
  },
  soldLabel: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    color: R.ink,
    opacity: 0.45,
  },
  buyBtn: {
    backgroundColor: R.red,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  buyBtnDisabled: { opacity: 0.35 },
  buyBtnText: {
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 1,
    color: R.cream,
  },
  emptyLabel: {
    fontFamily: RF.serifItalic,
    fontSize: 12,
    color: R.ink,
    opacity: 0.5,
    padding: 16,
  },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
    color: R.ink,
    opacity: 0.6,
    marginBottom: 8,
  },
  toppingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: R.ink,
    borderStyle: 'dashed',
    gap: 8,
  },
  toppingInfo: { flex: 1 },
  toppingName: { fontWeight: '900', fontSize: 12, color: R.ink },
  toppingEffect: {
    fontFamily: RF.serifItalic,
    fontSize: 9,
    color: R.ink,
    opacity: 0.6,
  },
  sellBtn: {
    borderWidth: 1.5,
    borderColor: R.ink,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  sellBtnText: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    color: R.ink,
  },
  runStats: { marginTop: 4 },
  noodleLevels: { marginTop: 8 },
  noodleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  noodlePatternName: {
    fontWeight: '700',
    fontSize: 11,
    color: R.ink,
    width: 72,
  },
  noodleBonus: {
    flex: 1,
    fontFamily: RF.mono,
    fontSize: 9,
    color: R.ink,
    opacity: 0.65,
  },
  noodleLvlBadge: {
    backgroundColor: R.mustard,
    borderWidth: 1,
    borderColor: R.ink,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 30,
    alignItems: 'center',
  },
  noodleLvlText: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    color: R.ink,
  },
  statsTitle: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
    color: R.ink,
    opacity: 0.6,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCell: { width: '45%' },
  statLabel: {
    fontFamily: RF.mono,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: R.ink,
    opacity: 0.55,
  },
  statValue: { fontWeight: '900', fontSize: 13, color: R.ink, marginTop: 1 },
  footer: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: R.creamDeep,
  },
  // Modals
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(43,32,20,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: R.cream,
    borderWidth: 2,
    borderColor: R.ink,
    borderRadius: 6,
    padding: 16,
    width: '100%',
    shadowColor: R.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  modalTitle: {
    fontWeight: '900',
    fontSize: 16,
    color: R.ink,
    marginBottom: 4,
  },
  modalSub: {
    fontFamily: RF.serifItalic,
    fontSize: 11,
    color: R.ink,
    opacity: 0.65,
    marginBottom: 12,
  },
  sellRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: R.ink,
    borderStyle: 'dashed',
  },
  sellRowName: { fontWeight: '700', fontSize: 13, color: R.ink },
  sellRowValue: {
    fontFamily: RF.mono,
    fontSize: 11,
    fontWeight: '700',
    color: R.red,
  },
  cancelBtn: { alignItems: 'center', marginTop: 12 },
  cancelText: {
    fontFamily: RF.serifItalic,
    fontSize: 12,
    color: R.ink,
    opacity: 0.55,
  },
  choiceBtn: {
    backgroundColor: R.creamDeep,
    borderWidth: 2,
    borderColor: R.ink,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    shadowColor: R.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  choiceBtnText: {
    fontWeight: '900',
    fontSize: 14,
    color: R.ink,
    textAlign: 'center',
  },
});
