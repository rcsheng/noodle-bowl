import { router } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RisoBorder } from '@/components/slurp/RisoBorder';
import { RisoButton } from '@/components/slurp/RisoButton';
import { RisoMisreg } from '@/components/slurp/RisoMisreg';
import { R, RF } from '@/constants/slurp/riso';
import { useSlurp } from '@/context/SlurpContext';
import { slurpRunAbandoned } from '@/lib/analytics';

export default function SlurpLanding() {
  const { runState, meta, dispatch } = useSlurp();
  const hasActiveRun = runState !== null && runState.phase !== 'over';

  function handleStart() {
    router.push('/slurp/broth-select');
  }

  function handleResume() {
    router.push('/slurp/tasting');
  }

  function handleAbandon() {
    Alert.alert(
      'Abandon Run?',
      'Your progress will be lost. This cannot be undone.',
      [
        { text: 'Keep Playing', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: () => {
            if (runState) slurpRunAbandoned(runState.course, runState.tasting);
            dispatch({ type: 'ABANDON_RUN' });
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>VOL. 01 / ISSUE 1</Text>
          <View style={styles.titleRow}>
            <RisoMisreg size={36}>SLURP</RisoMisreg>
            <RisoMisreg size={36} color={R.mustard} shift={R.scallion} italic>!</RisoMisreg>
          </View>
          <Text style={styles.tagline}>a noodle-soup zine of luck {'&'} vocabulary</Text>
        </View>

        {/* Hero bowl */}
        <View style={styles.heroWrap}>
          <RisoBorder bg={R.creamDeep} pad={0} double style={styles.hero}>
            <View style={styles.heroBowl}>
              <Text style={styles.bowlEmoji}>🍜</Text>
              <Text style={styles.steamRow}>≋  ≋  ≋</Text>
            </View>
          </RisoBorder>
        </View>

        {/* CTAs */}
        {hasActiveRun ? (
          <View style={styles.ctaStack}>
            <RisoButton variant="ink" onPress={handleResume} style={styles.ctaFull}>
              RESUME RUN
            </RisoButton>
            <View style={styles.abandonRow}>
              <TouchableOpacity onPress={handleAbandon} style={styles.abandonLink}>
                <Text style={styles.abandonText}>abandon run</Text>
              </TouchableOpacity>
              <Text style={styles.abandonSep}> · </Text>
              <TouchableOpacity onPress={handleStart} style={styles.newRunLink}>
                <Text style={styles.newRunText}>new run</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <RisoButton variant="ink" onPress={handleStart} style={styles.ctaFull}>
            START A RUN
          </RisoButton>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            ['BEST', meta.bestScore > 0 ? meta.bestScore.toLocaleString() : '—'],
            ['RUNS', meta.totalRuns.toString()],
            ['WINS', meta.wins.toString()],
          ].map(([k, v], i) => (
            <RisoBorder
              key={k}
              bg={i === 1 ? R.mustard : R.cream}
              pad={6}
              style={styles.statCard}
            >
              <Text style={styles.statKey}>{k}</Text>
              <Text style={styles.statVal}>{v}</Text>
            </RisoBorder>
          ))}
        </View>

        {/* How to play */}
        <RisoBorder bg={R.creamDeep} pad={14} style={styles.howTo}>
          <Text style={styles.howToTitle}>HOW TO PLAY</Text>
          <Text style={styles.howToBody}>
            Draw letters. Build words. Score Broth Points. Beat the quota to advance to the next course.
            Shop for Toppings between rounds. Beat all 9 Tastings to win.
          </Text>
        </RisoBorder>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: R.cream },
  content: { padding: 16, paddingBottom: 80 },
  header: { paddingBottom: 4 },
  eyebrow: {
    fontFamily: RF.mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 3.5,
    color: R.red,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  tagline: {
    fontFamily: RF.serifItalic,
    fontSize: 11,
    color: R.ink,
    marginBottom: 16,
  },
  heroWrap: { marginBottom: 14 },
  hero: { overflow: 'hidden' },
  heroBowl: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: R.creamDeep,
    borderRadius: 4,
  },
  bowlEmoji: { fontSize: 52 },
  steamRow: {
    fontFamily: RF.mono,
    fontSize: 14,
    color: R.red,
    letterSpacing: 8,
    opacity: 0.6,
    marginTop: 4,
  },
  ctaStack: { marginBottom: 12 },
  ctaFull: { marginBottom: 0 },
  abandonRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
  abandonLink: { paddingHorizontal: 4 },
  abandonText: { fontFamily: RF.serifItalic, fontSize: 12, color: R.red, opacity: 0.7 },
  abandonSep: { fontFamily: RF.serifItalic, fontSize: 12, color: R.ink, opacity: 0.4 },
  newRunLink: { paddingHorizontal: 4 },
  newRunText: {
    fontFamily: RF.serifItalic,
    fontSize: 12,
    color: R.ink,
    opacity: 0.65,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    shadowColor: R.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  statKey: {
    fontFamily: RF.mono,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 2,
    color: R.ink,
    opacity: 0.6,
    marginBottom: 2,
  },
  statVal: {
    fontWeight: '900',
    fontSize: 15,
    color: R.ink,
  },
  howTo: { marginTop: 4 },
  howToTitle: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
    color: R.red,
    marginBottom: 6,
  },
  howToBody: {
    fontFamily: RF.serifItalic,
    fontSize: 13,
    color: R.ink,
    lineHeight: 20,
  },
});
