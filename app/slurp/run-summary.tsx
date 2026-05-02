import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RisoBorder } from '@/components/slurp/RisoBorder';
import { RisoButton } from '@/components/slurp/RisoButton';
import { RisoMisreg } from '@/components/slurp/RisoMisreg';
import { R, RF } from '@/constants/slurp/riso';
import { BROTH_BASE_LABELS } from '@/constants/slurp/market';
import { useSlurp } from '@/context/SlurpContext';

export default function RunSummaryScreen() {
  const { runState: state } = useSlurp();

  const won = state?.finalScore != null;
  const score = state?.finalScore ?? state?.totalBrothScored ?? 0;
  const tastingsCleared = state ? (state.coursesCompleted * 3) + (state.tasting - 1) : 0;

  function handleNewRun() {
    router.replace('/slurp/broth-select');
  }

  function handleHome() {
    router.replace('/(tabs)/slurp');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{won ? '★ RUN COMPLETE ★' : '✕ RUN ENDED'}</Text>
          <View style={styles.titleRow}>
            <RisoMisreg size={28}>{won ? 'well ' : 'nice try, '}</RisoMisreg>
            <RisoMisreg size={28} color={won ? R.red : R.ink} shift={R.mustard} italic>
              {won ? 'slurped!' : 'chef!'}
            </RisoMisreg>
          </View>
        </View>

        {/* Score panel */}
        <RisoBorder bg={R.creamDeep} pad={14} double style={styles.scorePanel}>
          <Text style={styles.scorePanelEyebrow}>{won ? 'FINAL SCORE' : 'TOTAL BROTH'}</Text>
          <View style={styles.scoreCentered}>
            <RisoMisreg size={44} color={R.red} shift={R.mustard}>
              {score.toLocaleString()}
            </RisoMisreg>
          </View>
          <View style={styles.divider} />
          <View style={styles.statsGrid}>
            <StatCell label="BROTH BASE" value={state ? (BROTH_BASE_LABELS[state.brothBase] ?? state.brothBase) : '—'} />
            <StatCell label="TASTINGS" value={`${tastingsCleared} / 9`} />
            <StatCell label="COINS" value={state ? state.coins.toString() : '0'} />
            <StatCell label="TOPPINGS" value={state ? `${state.toppings.length} / 5` : '0'} />
          </View>
        </RisoBorder>

        {/* Actions */}
        <View style={styles.actions}>
          <RisoButton variant="red" onPress={handleNewRun} style={styles.btn}>
            NEW RUN
          </RisoButton>
          <RisoButton variant="cream" onPress={handleHome} style={styles.btn}>
            GO HOME
          </RisoButton>
        </View>
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
  content: { flex: 1, padding: 16, justifyContent: 'center' },
  header: { marginBottom: 20 },
  eyebrow: {
    fontFamily: RF.mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 3,
    color: R.red,
    marginBottom: 4,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' },
  scorePanel: { marginBottom: 24 },
  scorePanelEyebrow: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: R.ink,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 8,
  },
  scoreCentered: { alignItems: 'center', marginBottom: 4 },
  divider: {
    height: 1,
    backgroundColor: R.ink,
    opacity: 0.2,
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  statValue: { fontWeight: '900', fontSize: 13, color: R.ink, marginTop: 2 },
  actions: { gap: 8 },
  btn: {},
});
