import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RisoBadge } from '@/components/slurp/RisoBadge';
import { RisoBorder } from '@/components/slurp/RisoBorder';
import { RisoButton } from '@/components/slurp/RisoButton';
import { RisoMeter } from '@/components/slurp/RisoMeter';
import { RisoMisreg } from '@/components/slurp/RisoMisreg';
import { RisoTile } from '@/components/slurp/RisoTile';
import { R, RF } from '@/constants/slurp/riso';
import { WORD_PATTERN_DEFS } from '@/constants/slurp/wordPatterns';
import { useSlurp } from '@/context/SlurpContext';
import { detectWordPattern, scoreSlurp } from '@/lib/slurp/scoring';
import type { LetterTile } from '@/packages/shared/slurp';

const TASTING_NAMES: Record<number, string> = { 1: 'Sip', 2: 'Bowl Tasting', 3: "Chef's Challenge" };
const COURSE_NAMES: Record<number, string> = { 1: 'Appetizer', 2: 'Main', 3: 'Dessert' };
const MODIFIER_LABELS: Record<string, string> = {
  thePickyEater:       'Picky Eater — words with E score 0',
  theHealthInspector:  'Health Inspector — words must be 5+ letters',
  theRushHour:         'Rush Hour — only 2 Slurps',
  theIngredientShortage: 'Ingredient Shortage — extra challenge',
  theFoodCritic:       'Food Critic — first 2 Slurps must score 80+',
  theClosingHour:      'Closing Hour — only 1 Spit-out',
};

type ScoreInfo = {
  word: string;
  pattern: string;
  baseChips: number;
  patternChips: number;
  chips: number;
  seasoning: number;
  score: number;
};

export default function TastingScreen() {
  const { runState: state, dispatch, recordRunEnd } = useSlurp();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scoreInfo, setScoreInfo] = useState<ScoreInfo | null>(null);
  const didNavigateRef = useRef(false);

  // Navigate when phase transitions past the play loop
  useEffect(() => {
    if (!state || scoreInfo) return;

    if ((state.phase === 'market' || state.phase === 'over') && !didNavigateRef.current) {
      didNavigateRef.current = true;
      if (state.phase === 'market') {
        router.push('/slurp/market');
      } else {
        recordRunEnd(state.finalScore, state.finalScore != null);
        router.push('/slurp/run-summary');
      }
    } else if (state.phase === 'reveal' || state.phase === 'play') {
      didNavigateRef.current = false;
    }
  }, [state?.phase, scoreInfo, recordRunEnd]);

  // Redirect to broth-select if there's no active run
  useEffect(() => {
    if (state === null) {
      router.replace('/slurp/broth-select');
    }
  }, [state]);

  const previewScore = useMemo(() => {
    if (!state || selectedIds.length < 2) return null;
    const tiles = selectedIds
      .map(id => state.bowl.find(t => t.id === id))
      .filter((t): t is LetterTile => !!t);
    if (tiles.length < 2) return null;
    const word = tiles.map(t => t.letter).join('');
    const pattern = detectWordPattern(word);
    const result = scoreSlurp(tiles, pattern, state.noodleLevels);
    return { word, pattern, ...result };
  }, [selectedIds, state]);

  function toggleTile(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }

  function handleSlurp() {
    if (!state || selectedIds.length < 2) return;
    if (state.slurpsRemaining <= 0) return;

    const tiles = selectedIds
      .map(id => state.bowl.find(t => t.id === id))
      .filter((t): t is LetterTile => !!t);

    if (tiles.length < 2) return;

    const word = tiles.map(t => t.letter).join('');
    const pattern = detectWordPattern(word);
    const patternDef = WORD_PATTERN_DEFS[pattern];
    const baseChips = tiles.reduce((s, t) => s + t.chipValue, 0);
    const { chips, seasoning, score } = scoreSlurp(tiles, pattern, state.noodleLevels);

    dispatch({ type: 'SLURP', tileIds: selectedIds });
    setScoreInfo({
      word,
      pattern: patternDef.name,
      baseChips,
      patternChips: patternDef.baseChips,
      chips,
      seasoning,
      score,
    });
    setSelectedIds([]);
  }

  function handleSpitOut() {
    if (!state || selectedIds.length < 1) return;
    if (state.spitoutsRemaining <= 0) return;
    dispatch({ type: 'SPIT_OUT', tileIds: selectedIds });
    setSelectedIds([]);
  }

  function handleDismissScore() {
    if (!state) return;
    if (state.phase === 'result') {
      dispatch({ type: 'OPEN_MARKET' });
    }
    setScoreInfo(null);
  }

  if (!state) return null;

  if (state.phase === 'reveal') {
    return <RevealScreen state={state} onBegin={() => dispatch({ type: 'BEGIN_TASTING' })} />;
  }

  const selectedTiles = selectedIds
    .map(id => state.bowl.find(t => t.id === id))
    .filter((t): t is LetterTile => !!t);

  const currentWord = selectedTiles.map(t => t.letter).join('');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.courseLabel}>
            {COURSE_NAMES[state.course].toUpperCase()} · {TASTING_NAMES[state.tasting].toUpperCase()}
          </Text>
          <RisoMisreg size={16} dx={1.5} dy={1}>
            {`quota ${state.brothQuota.toLocaleString()}`}
          </RisoMisreg>
        </View>
        <View style={styles.statBadges}>
          <RisoBadge label="SLURPS" value={state.slurpsRemaining} bg={R.red} />
          <RisoBadge label="SPITS" value={state.spitoutsRemaining} />
        </View>
      </View>

      {/* Broth meter */}
      <RisoMeter current={state.brothScored} quota={state.brothQuota} />

      {/* Toppings row */}
      {state.toppings.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toppingsRow}
        >
          {state.toppings.map(t => (
            <View key={t} style={styles.toppingChip}>
              <Text style={styles.toppingLabel}>{t.toUpperCase().slice(0, 6)}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Word tray */}
      <View style={styles.wordTray}>
        <Text style={styles.trayEyebrow}>
          {currentWord.length > 0
            ? `${WORD_PATTERN_DEFS[detectWordPattern(currentWord)]?.name.toUpperCase() ?? 'WORD'} · ${currentWord.length} LETTERS`
            : 'TAP TILES TO BUILD A WORD'}
        </Text>
        <View style={styles.trayWord}>
          {currentWord.length > 0 ? (
            <>
              <RisoMisreg size={26}>{currentWord}</RisoMisreg>
              {previewScore && (
                <Text style={styles.previewScore}>
                  {previewScore.chips} × {previewScore.seasoning.toFixed(1)}
                  {' = '}
                  <Text style={styles.previewTotal}>{Math.round(previewScore.score)}</Text>
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.trayPlaceholder}>···</Text>
          )}
        </View>
      </View>

      {/* Letter bowl */}
      <View style={styles.bowl}>
        <View style={styles.tiles}>
          {state.bowl.map(tile => (
            <RisoTile
              key={tile.id}
              letter={tile.letter}
              value={tile.chipValue}
              selected={selectedIds.includes(tile.id)}
              onPress={() => toggleTile(tile.id)}
              size={38}
            />
          ))}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <RisoButton
          variant="ink"
          flex={2}
          onPress={handleSlurp}
          disabled={selectedIds.length < 2 || state.slurpsRemaining <= 0}
        >
          SLURP!
        </RisoButton>
        <RisoButton
          variant="cream"
          flex={1}
          onPress={handleSpitOut}
          disabled={selectedIds.length < 1 || state.spitoutsRemaining <= 0}
        >
          spit
        </RisoButton>
        <RisoButton variant="mustard" flex={1} disabled>
          spice
        </RisoButton>
      </View>

      {/* Score readout modal */}
      <Modal visible={scoreInfo !== null} transparent animationType="fade">
        <TouchableOpacity
          style={styles.readoutOverlay}
          activeOpacity={1}
          onPress={handleDismissScore}
        >
          <View style={styles.readoutCard}>
            {scoreInfo && (
              <ScoreReadout info={scoreInfo} phase={state.phase} onDismiss={handleDismissScore} />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── Reveal phase screen ──────────────────────────────────────────────────────

function RevealScreen({ state, onBegin }: { state: NonNullable<ReturnType<typeof useSlurp>['runState']>; onBegin: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.revealContent}>
        <Text style={styles.courseLabel}>
          {COURSE_NAMES[state.course].toUpperCase()} · COURSE {state.course} OF 3
        </Text>
        <View style={styles.revealTitle}>
          <RisoMisreg size={30}>{TASTING_NAMES[state.tasting]}</RisoMisreg>
        </View>

        <RisoBorder bg={R.creamDeep} pad={14} double style={styles.revealCard}>
          <Text style={styles.revealLabel}>BROTH QUOTA</Text>
          <RisoMisreg size={36} color={R.red}>{state.brothQuota.toLocaleString()}</RisoMisreg>
          <View style={styles.revealDivider} />
          <Text style={styles.revealStat}>{state.slurpsRemaining} Slurps  ·  {state.spitoutsRemaining} Spit-outs</Text>
          {state.modifier && (
            <View style={styles.modifierBanner}>
              <Text style={styles.modifierLabel}>⚠ {MODIFIER_LABELS[state.modifier] ?? state.modifier}</Text>
            </View>
          )}
        </RisoBorder>

        <RisoButton variant="ink" onPress={onBegin} style={styles.beginBtn}>
          BEGIN TASTING
        </RisoButton>
        <Text style={styles.revealHint}>{`${state.brothQuota.toLocaleString()} broth points needed`}</Text>
      </View>
    </SafeAreaView>
  );
}

// ── Score readout ────────────────────────────────────────────────────────────

function ScoreReadout({ info, phase, onDismiss }: { info: ScoreInfo; phase: string; onDismiss: () => void }) {
  const isQuotaMet = phase === 'result';

  return (
    <>
      <Text style={styles.readoutEyebrow}>{info.pattern.toUpperCase()} PATTERN · {info.word.length} LETTERS</Text>
      <RisoMisreg size={32}>{info.word}</RisoMisreg>

      <View style={styles.receiptRows}>
        <ReceiptRow label="letter chips" value={`+${info.baseChips}`} />
        <ReceiptRow label={`${info.pattern.toLowerCase()} bonus`} value={`+${info.patternChips}`} dashed />
        <View style={styles.receiptTotal}>
          <Text style={styles.receiptTotalLabel}>{info.chips} × {info.seasoning.toFixed(1)} =</Text>
          <RisoMisreg size={32} color={R.red} shift={R.mustard}>{Math.round(info.score).toString()}</RisoMisreg>
        </View>
      </View>

      <TouchableOpacity onPress={onDismiss} style={styles.readoutCta}>
        {isQuotaMet ? (
          <Text style={styles.readoutCtaTextBold}>QUOTA MET! → OPEN MARKET</Text>
        ) : (
          <Text style={styles.readoutCtaText}>tap to keep slurping →</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

function ReceiptRow({ label, value, dashed }: { label: string; value: string; dashed?: boolean }) {
  return (
    <View style={[styles.receiptRow, dashed && styles.receiptRowDashed]}>
      <Text style={styles.receiptRowLabel}>{label}</Text>
      <Text style={styles.receiptRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: R.cream },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: R.ink,
  },
  courseLabel: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: R.red,
    marginBottom: 2,
  },
  statBadges: { flexDirection: 'row', gap: 6 },

  // Toppings
  toppingsRow: { paddingHorizontal: 14, paddingVertical: 6, gap: 4 },
  toppingChip: {
    backgroundColor: R.mustard,
    borderWidth: 1.5,
    borderColor: R.ink,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  toppingLabel: {
    fontFamily: RF.mono,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1,
    color: R.ink,
  },

  // Word tray
  wordTray: {
    margin: 10,
    marginHorizontal: 14,
    padding: 10,
    backgroundColor: R.creamDeep,
    borderWidth: 2,
    borderColor: R.ink,
    borderRadius: 6,
    minHeight: 62,
  },
  trayEyebrow: {
    fontFamily: RF.mono,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: R.red,
    marginBottom: 4,
  },
  trayWord: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trayPlaceholder: {
    fontFamily: RF.serifItalic,
    fontSize: 18,
    color: R.ink,
    opacity: 0.25,
  },
  previewScore: {
    fontFamily: RF.mono,
    fontSize: 10,
    fontWeight: '700',
    color: R.ink,
  },
  previewTotal: {
    color: R.red,
    fontSize: 13,
    fontWeight: '900',
  },

  // Bowl
  bowl: { flex: 1, paddingHorizontal: 10, justifyContent: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // Reveal phase
  revealContent: { flex: 1, padding: 16, justifyContent: 'center' },
  revealTitle: { marginBottom: 20 },
  revealCard: { marginBottom: 24 },
  revealLabel: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
    color: R.ink,
    opacity: 0.6,
    marginBottom: 4,
  },
  revealDivider: { height: 1, backgroundColor: R.ink, opacity: 0.2, marginVertical: 12 },
  revealStat: {
    fontFamily: RF.mono,
    fontSize: 11,
    fontWeight: '700',
    color: R.ink,
    letterSpacing: 0.5,
  },
  modifierBanner: {
    marginTop: 10,
    backgroundColor: R.red,
    borderRadius: 4,
    padding: 8,
  },
  modifierLabel: {
    fontFamily: RF.mono,
    fontSize: 9,
    fontWeight: '700',
    color: R.cream,
    letterSpacing: 0.5,
  },
  beginBtn: { marginBottom: 10 },
  revealHint: {
    fontFamily: RF.serifItalic,
    fontSize: 11,
    color: R.ink,
    opacity: 0.5,
    textAlign: 'center',
  },

  // Score readout modal
  readoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43,32,20,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  readoutCard: {
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
  readoutEyebrow: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: R.red,
    marginBottom: 4,
  },
  receiptRows: {
    marginTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: R.ink,
    paddingTop: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  receiptRowDashed: {
    borderBottomWidth: 1,
    borderBottomColor: R.ink,
    borderStyle: 'dashed',
  },
  receiptRowLabel: {
    fontFamily: RF.serifItalic,
    fontSize: 12,
    color: R.ink,
  },
  receiptRowValue: {
    fontWeight: '900',
    fontSize: 12,
    color: R.red,
  },
  receiptTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: R.ink,
    paddingTop: 8,
    marginTop: 6,
  },
  receiptTotalLabel: {
    fontFamily: RF.mono,
    fontSize: 10,
    fontWeight: '700',
    color: R.ink,
  },
  readoutCta: { alignItems: 'center', marginTop: 14 },
  readoutCtaText: {
    fontFamily: RF.serifItalic,
    fontSize: 12,
    color: R.ink,
    opacity: 0.7,
  },
  readoutCtaTextBold: {
    fontFamily: RF.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: R.red,
    textTransform: 'uppercase',
  },
});
