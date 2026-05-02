import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RisoBorder } from '@/components/slurp/RisoBorder';
import { RisoButton } from '@/components/slurp/RisoButton';
import { RisoMisreg } from '@/components/slurp/RisoMisreg';
import { R, RF } from '@/constants/slurp/riso';
import { useSlurp } from '@/context/SlurpContext';

type ItemCategory = 'topping' | 'flavor' | 'pantry' | 'spice';

interface MarketItem {
  id: string;
  name: string;
  category: ItemCategory;
  price: number;
  desc: string;
}

const MARKET_ITEMS: MarketItem[] = [
  { id: 'shiitake',    name: 'Shiitake',       category: 'topping', price: 4, desc: '+2 chips on consonant-heavy words' },
  { id: 'nori',        name: 'Nori Sheet',     category: 'topping', price: 5, desc: 'Boosts one letter chip value +2' },
  { id: 'brothPack',   name: 'Broth Pack',     category: 'flavor',  price: 4, desc: 'Level up a Word Pattern once' },
  { id: 'spicePack',   name: 'Spice Pack',     category: 'flavor',  price: 4, desc: 'Add a spice card to your hand' },
  { id: 'miseEnPlace', name: 'Mise en Place',  category: 'pantry',  price: 10, desc: 'Bowl size +1 for this run' },
  { id: 'sichuanPep',  name: 'Sichuan Pepper', category: 'spice',   price: 3, desc: 'Next slurp: seasoning ×2' },
];

const CAT_COLORS: Record<ItemCategory, string> = {
  topping: R.cream,
  flavor: R.mustard,
  pantry: R.creamDeep,
  spice: R.cream,
};

export default function MarketScreen() {
  const { runState: state, dispatch } = useSlurp();
  const [rerolled, setRerolled] = useState(false);

  if (!state) return null;

  function handleBuy(item: MarketItem) {
    Alert.alert(`${item.name} — ¢${item.price}`, 'Market purchasing is coming in a future update. Keep playing!', [{ text: 'Got it' }]);
  }

  function handleReroll() {
    if ((state?.coins ?? 0) < 5) {
      Alert.alert('Not enough coins', 'Reroll costs ¢5.');
      return;
    }
    setRerolled(true);
    Alert.alert('Rerolled!', 'New items coming in a future update.', [{ text: 'OK' }]);
  }

  function handleNext() {
    dispatch({ type: 'ADVANCE' });
    router.back();
  }

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
        <View style={styles.grid}>
          {MARKET_ITEMS.map((item, i) => (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                { backgroundColor: CAT_COLORS[item.category] },
                { transform: [{ rotate: `${i % 2 === 0 ? -0.5 : 0.5}deg` }] },
              ]}
            >
              <Text style={styles.itemCategory}>{item.category}</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
              <View style={styles.itemFooter}>
                <Text style={styles.itemPrice}>¢{item.price}</Text>
                <TouchableOpacity
                  onPress={() => handleBuy(item)}
                  style={[styles.buyBtn, state.coins < item.price && styles.buyBtnDisabled]}
                >
                  <Text style={styles.buyBtnText}>BUY</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <RisoBorder bg={R.creamDeep} pad={12} style={styles.runStats}>
          <Text style={styles.statsTitle}>THIS RUN</Text>
          <View style={styles.statsGrid}>
            <StatCell label="COURSE" value={`${state.course} / 3`} />
            <StatCell label="TASTING" value={`${state.tasting} / 3`} />
            <StatCell label="BROTH" value={state.totalBrothScored.toLocaleString()} />
            <StatCell label="TOPPINGS" value={`${state.toppings.length} / 5`} />
          </View>
        </RisoBorder>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <RisoButton
          variant="cream"
          flex={1}
          onPress={handleReroll}
          disabled={rerolled || state.coins < 5}
        >
          REROLL ¢5
        </RisoButton>
        <RisoButton variant="ink" flex={1} onPress={handleNext}>
          NEXT →
        </RisoButton>
      </View>
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
    marginBottom: 16,
  },
  itemCard: {
    width: '47%',
    borderWidth: 2,
    borderColor: R.ink,
    borderRadius: 6,
    padding: 8,
    minHeight: 110,
    shadowColor: R.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
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
    fontSize: 13,
    color: R.ink,
    marginBottom: 3,
    lineHeight: 16,
  },
  itemDesc: {
    fontFamily: RF.serifItalic,
    fontSize: 10,
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
  buyBtn: {
    backgroundColor: R.red,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  buyBtnDisabled: { opacity: 0.4 },
  buyBtnText: {
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 1,
    color: R.cream,
  },
  runStats: { marginTop: 4 },
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: R.creamDeep,
  },
});
