import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RisoButton } from '@/components/slurp/RisoButton';
import { RisoMisreg } from '@/components/slurp/RisoMisreg';
import { R, RF } from '@/constants/slurp/riso';
import { useAuth } from '@/context/AuthContext';
import { useSlurp } from '@/context/SlurpContext';
import { slurpRunStarted } from '@/lib/analytics';
import type { BrothBaseId } from '@/packages/shared/slurp';

const BROTH_OPTIONS: { id: BrothBaseId; name: string; tag: string; emoji: string }[] = [
  { id: 'classicChicken', name: 'Classic Chicken', tag: 'balanced · good for beginners', emoji: '🐓' },
  { id: 'tonkotsu',       name: 'Tonkotsu',        tag: 'high variance · rare letters ×2', emoji: '🐷' },
  { id: 'clearDashi',     name: 'Clear Dashi',     tag: 'vowel-heavy · consistent scoring', emoji: '🌊' },
  { id: 'miso',           name: 'Miso',            tag: 'consonant clusters · tricky combos', emoji: '🌰' },
];

export default function BrothSelectScreen() {
  const { dispatch } = useSlurp();
  const { user } = useAuth();
  const [selected, setSelected] = useState<BrothBaseId>('classicChicken');

  function handleStart() {
    dispatch({
      type: 'START_RUN',
      brothBase: selected,
      ownerUid: user?.uid ?? null,
      seed: Date.now(),
    });
    slurpRunStarted(selected);
    router.replace('/slurp/tasting');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>STEP 1 / 1 · PREP</Text>
        <RisoMisreg size={22} style={styles.title}>pick your broth</RisoMisreg>
        <Text style={styles.sub}>Your broth base shapes the letter pool for the entire run.</Text>

        <View style={styles.list}>
          {BROTH_OPTIONS.map((b, i) => {
            const isSelected = b.id === selected;
            return (
              <TouchableOpacity
                key={b.id}
                onPress={() => setSelected(b.id)}
                activeOpacity={0.85}
                style={[
                  styles.card,
                  isSelected ? styles.cardSelected : styles.cardDefault,
                  { transform: [{ rotate: `${i % 2 === 0 ? -0.4 : 0.4}deg` }] },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: isSelected ? R.cream : R.creamDeep }]}>
                  <Text style={styles.emoji}>{b.emoji}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardName, { color: isSelected ? R.cream : R.ink }]}>{b.name}</Text>
                  <Text style={[styles.cardTag, { color: isSelected ? 'rgba(245,236,217,0.75)' : R.ink, opacity: isSelected ? 1 : 0.65 }]}>
                    {b.tag}
                  </Text>
                </View>
                {isSelected && <Text style={styles.star}>★</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <RisoButton variant="ink" onPress={handleStart} style={styles.startBtn}>
          START TASTING
        </RisoButton>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backText}>← back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: R.cream },
  content: { padding: 16, paddingBottom: 40 },
  eyebrow: {
    fontFamily: RF.mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: R.red,
    marginBottom: 4,
  },
  title: { marginBottom: 6 },
  sub: {
    fontFamily: RF.serifItalic,
    fontSize: 12,
    color: R.ink,
    opacity: 0.7,
    marginBottom: 20,
  },
  list: { gap: 8, marginBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 2,
    borderColor: R.ink,
    borderRadius: 6,
    gap: 10,
  },
  cardDefault: {
    backgroundColor: R.cream,
    shadowColor: R.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  cardSelected: {
    backgroundColor: R.red,
    shadowColor: R.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: R.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  cardText: { flex: 1 },
  cardName: { fontWeight: '900', fontSize: 14, marginBottom: 1 },
  cardTag: { fontFamily: RF.serifItalic, fontSize: 10 },
  star: { fontSize: 18, color: R.mustard, transform: [{ rotate: '15deg' }] },
  startBtn: { marginBottom: 10 },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backText: { fontFamily: RF.serifItalic, fontSize: 12, color: R.ink, opacity: 0.55 },
});
