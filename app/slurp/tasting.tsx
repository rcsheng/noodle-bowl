import * as Haptics from 'expo-haptics';
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
import { WORD_PATTERN_DEFS, NOODLE_UPGRADE_CAP } from '@/constants/slurp/wordPatterns';
import { TOPPING_DEFS } from '@/constants/slurp/toppings';
import { SPICE_CARD_MAP } from '@/constants/slurp/spiceCards';
import { LETTER_CHIPS } from '@/constants/slurp/letterChips';
import { useSlurp } from '@/context/SlurpContext';
import { slurpTastingWon, slurpTastingLost, slurpRunCompleted } from '@/lib/analytics';
import { detectWordPattern } from '@/lib/slurp/scoring';
import { applyToppingEffectsOnSlurp } from '@/lib/slurp/toppingEffects';
import type { ConsumableId, LetterTile, ToppingId } from '@/packages/shared/slurp';

const TASTING_NAMES: Record<number, string> = { 1: 'Sip', 2: 'Bowl Tasting', 3: "Chef's Challenge" };
const COURSE_NAMES: Record<number, string> = { 1: 'Appetizer', 2: 'Main', 3: 'Dessert' };
const MODIFIER_LABELS: Record<string, string> = {
  thePickyEater:          'Picky Eater — words with E score 0',
  theHealthInspector:     'Health Inspector — words must be 5+ letters',
  theRushHour:            'Rush Hour — only 2 Slurps',
  theIngredientShortage:  'Ingredient Shortage — extra challenge',
  theFoodCritic:          'Food Critic — first 2 Slurps must score 80+',
  theClosingHour:         'Closing Hour — only 1 Spit-out',
};

const CHIP_VALUES = [1, 2, 3, 4, 5, 8, 10];

type ScoreInfo = {
  word: string;
  pattern: string;
  baseChips: number;
  patternChips: number;
  toppingChipsAdded: number;
  chips: number;
  seasoning: number;
  toppingSeasoningAdded: number;
  fiveSpiceApplied: boolean;
  score: number;
};

export default function TastingScreen() {
  const { runState: state, dispatch, recordRunEnd } = useSlurp();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scoreInfo, setScoreInfo] = useState<ScoreInfo | null>(null);
  const [expandedTopping, setExpandedTopping] = useState<ToppingId | null>(null);
  const [showSpicePicker, setShowSpicePicker] = useState(false);
  const [letterPickerTarget, setLetterPickerTarget] = useState<string | null>(null);
  const [valuePickerTarget, setValuePickerTarget] = useState<boolean>(false);
  const didNavigateRef = useRef(false);
  const prevPhaseRef = useRef<string | null>(null);

  // Analytics: track phase transitions
  useEffect(() => {
    if (!state) return;
    const prev = prevPhaseRef.current;
    const curr = state.phase;
    prevPhaseRef.current = curr;
    if (prev === 'play' && curr === 'result') {
      slurpTastingWon(state.course, state.tasting, state.brothScored, state.slurpCountThisTasting);
    } else if (prev === 'play' && curr === 'over') {
      slurpTastingLost(state.course, state.tasting, state.brothScored, state.brothQuota);
    }
  }, [state?.phase]);

  // Navigate when phase transitions past the play loop
  useEffect(() => {
    if (!state || scoreInfo) return;

    if ((state.phase === 'market' || state.phase === 'over') && !didNavigateRef.current) {
      didNavigateRef.current = true;
      if (state.phase === 'market') {
        router.push('/slurp/market');
      } else {
        if (state.finalScore != null) {
          slurpRunCompleted(state.finalScore, state.toppings.length, state.pantryOwned.length);
        }
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

  // Sync letter/value picker visibility with pendingConsumableInput
  useEffect(() => {
    if (!state?.pendingConsumableInput) {
      setLetterPickerTarget(null);
      setValuePickerTarget(false);
    } else if (state.pendingConsumableInput.step === 'letter') {
      setLetterPickerTarget(state.pendingConsumableInput.consumableId);
      setValuePickerTarget(false);
    } else if (state.pendingConsumableInput.step === 'value') {
      setValuePickerTarget(true);
      setLetterPickerTarget(null);
    }
  }, [state?.pendingConsumableInput]);

  const previewScore = useMemo(() => {
    if (!state || selectedIds.length < 2) return null;
    const tiles = selectedIds
      .map(id => state.bowl.find(t => t.id === id))
      .filter((t): t is LetterTile => !!t);
    if (tiles.length < 2) return null;
    const word = tiles.map(t => t.letter).join('');
    const pattern = detectWordPattern(word);
    const bonitoBonus = state.bonitoFlakesActive ? 1 : 0;
    const level = Math.min((state.noodleLevels[pattern] ?? 0) + bonitoBonus, NOODLE_UPGRADE_CAP);
    const def = WORD_PATTERN_DEFS[pattern];
    const patternChips = def.baseChips + level * 10;
    const patternSeasoning = def.baseSeasoning + level * 0.5;
    const baseLetterChips = tiles.reduce((s, t) => s + t.chipValue, 0);
    const result = applyToppingEffectsOnSlurp({
      toppings: state.toppings, word, tiles, pattern,
      baseLetterChips, patternChips, patternSeasoning,
      pendingChipBonus: state.pendingChipBonus,
      slurpCountThisTasting: state.slurpCountThisTasting,
      consecutiveNoSpitoutSlurps: state.consecutiveNoSpitoutSlurps,
      lastWordLetters: state.lastWordLetters,
      slurpsRemaining: state.slurpsRemaining,
      togarashiLetter: state.togarashiLetter,
      coursesCompleted: state.coursesCompleted,
      bowl: state.bowl, pot: state.pot, discard: state.discard,
    });
    let score = result.score;
    if (state.fiveSpiceActive) score = Math.round(score * 5);
    return { word, pattern, chips: result.chips, seasoning: result.seasoning, score };
  }, [selectedIds, state]);

  function toggleTile(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    const baseLetterChips = tiles.reduce((s, t) => s + t.chipValue, 0);

    const bonitoBonus = state.bonitoFlakesActive ? 1 : 0;
    const level = Math.min((state.noodleLevels[pattern] ?? 0) + bonitoBonus, NOODLE_UPGRADE_CAP);
    const patternChips = patternDef.baseChips + level * 10;
    const patternSeasoning = patternDef.baseSeasoning + level * 0.5;

    const toppingResult = applyToppingEffectsOnSlurp({
      toppings: state.toppings, word, tiles, pattern,
      baseLetterChips, patternChips, patternSeasoning,
      pendingChipBonus: state.pendingChipBonus,
      slurpCountThisTasting: state.slurpCountThisTasting,
      consecutiveNoSpitoutSlurps: state.consecutiveNoSpitoutSlurps,
      lastWordLetters: state.lastWordLetters,
      slurpsRemaining: state.slurpsRemaining,
      togarashiLetter: state.togarashiLetter,
      coursesCompleted: state.coursesCompleted,
      bowl: state.bowl, pot: state.pot, discard: state.discard,
    });

    const baseNoTopping = baseLetterChips + patternChips + state.pendingChipBonus;
    const toppingChipsAdded = toppingResult.chips - baseNoTopping;
    const toppingSeasoningAdded = toppingResult.seasoning - (1 + patternSeasoning);

    let score = toppingResult.score;
    if (state.modifier === 'thePickyEater' && word.toUpperCase().includes('E')) score = 0;
    if (state.fiveSpiceActive) score = Math.round(score * 5);

    dispatch({ type: 'SLURP', tileIds: selectedIds });
    setScoreInfo({
      word,
      pattern: patternDef.name,
      baseChips: baseLetterChips,
      patternChips,
      toppingChipsAdded,
      chips: toppingResult.chips,
      seasoning: toppingResult.seasoning,
      toppingSeasoningAdded,
      fiveSpiceApplied: state.fiveSpiceActive,
      score,
    });
    setSelectedIds([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      if (state.brothScored >= state.brothQuota) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else if (state.phase === 'over') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setScoreInfo(null);
  }

  function handleUseConsumable(consumableId: ConsumableId) {
    setShowSpicePicker(false);
    dispatch({ type: 'USE_CONSUMABLE', consumableId });
  }

  function handleLetterPick(letter: string) {
    dispatch({ type: 'CHOOSE_CONSUMABLE_TARGET', target: letter });
  }

  function handleValuePick(value: string) {
    dispatch({ type: 'CHOOSE_CONSUMABLE_TARGET', target: value });
  }

  function handleTilePick(tileId: string) {
    if (!state?.pendingConsumableInput) return;
    dispatch({ type: 'CHOOSE_CONSUMABLE_TARGET', target: tileId });
  }

  if (!state) return null;

  if (state.phase === 'reveal') {
    return (
      <RevealScreen
        state={state}
        onBegin={() => dispatch({ type: 'BEGIN_TASTING' })}
        onYuzuSkip={() => dispatch({ type: 'YUZU_SKIP' })}
      />
    );
  }

  const selectedTiles = selectedIds
    .map(id => state.bowl.find(t => t.id === id))
    .filter((t): t is LetterTile => !!t);

  const currentWord = selectedTiles.map(t => t.letter).join('');
  const hasSesameOilPending = state.pendingConsumableInput?.consumableId === 'sesameOil';
  const hasConsumables = state.consumables.length > 0;
  const maxConsumables = state.pantryOwned.includes('larder') ? 4 : 2;

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
            <TouchableOpacity key={t} onPress={() => setExpandedTopping(t)} style={styles.toppingChip}>
              <Text style={styles.toppingLabel}>{TOPPING_DEFS[t]?.name.toUpperCase().slice(0, 8) ?? t.toUpperCase().slice(0, 6)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Consumables row */}
      {state.consumables.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.consumablesRow}
        >
          {state.consumables.map((c, i) => {
            const def = SPICE_CARD_MAP[c];
            return (
              <View key={`${c}_${i}`} style={[styles.consumableChip, def?.isSecret && styles.consumableChipSecret]}>
                <Text style={styles.consumableLabel}>{def?.name ?? c}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Active spice flags */}
      {(state.fiveSpiceActive || state.bonitoFlakesActive || state.wildcardTileIds.length > 0) && (
        <View style={styles.activeFlagsRow}>
          {state.fiveSpiceActive && <Text style={styles.activeFlag}>× Five Spice ×5</Text>}
          {state.bonitoFlakesActive && <Text style={styles.activeFlag}>× Bonito +1 lvl</Text>}
          {state.wildcardTileIds.length > 0 && <Text style={styles.activeFlag}>× Wildcards ×{state.wildcardTileIds.length}</Text>}
        </View>
      )}

      {/* Word tray */}
      <View style={styles.wordTray}>
        <Text style={styles.trayEyebrow}>
          {currentWord.length > 0
            ? (() => {
                const pat = detectWordPattern(currentWord);
                const lvl = state.noodleLevels[pat] ?? 0;
                const name = WORD_PATTERN_DEFS[pat]?.name.toUpperCase() ?? 'WORD';
                return `${name}${lvl > 0 ? ` LV.${lvl}` : ''} · ${currentWord.length} LETTERS`;
              })()
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
          {state.bowl.map(tile => {
            const isWildcard = state.wildcardTileIds.includes(tile.id);
            const isSesameTarget = hasSesameOilPending;
            return (
              <RisoTile
                key={tile.id}
                letter={isWildcard ? '*' : tile.letter}
                value={tile.chipValue}
                selected={selectedIds.includes(tile.id) || (isSesameTarget && selectedIds.includes(tile.id))}
                onPress={() => {
                  if (hasSesameOilPending) {
                    handleTilePick(tile.id);
                  } else {
                    toggleTile(tile.id);
                  }
                }}
                size={38}
                boosted={isWildcard}
              />
            );
          })}
        </View>
      </View>

      {/* Sesame Oil tile-pick instruction */}
      {hasSesameOilPending && (
        <View style={styles.sesameInstruction}>
          <Text style={styles.sesameInstructionText}>
            {state.pendingConsumableInput?.context === ''
              ? 'TAP A TILE TO MARK AS WILDCARD (1 of 2)'
              : 'TAP A SECOND TILE TO MARK AS WILDCARD (2 of 2)'}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <RisoButton
          variant="ink"
          flex={2}
          onPress={handleSlurp}
          disabled={selectedIds.length < 2 || state.slurpsRemaining <= 0 || hasSesameOilPending}
        >
          SLURP!
        </RisoButton>
        <RisoButton
          variant="cream"
          flex={1}
          onPress={handleSpitOut}
          disabled={selectedIds.length < 1 || state.spitoutsRemaining <= 0 || hasSesameOilPending}
        >
          spit
        </RisoButton>
        <RisoButton
          variant="mustard"
          flex={1}
          disabled={!hasConsumables || hasSesameOilPending}
          onPress={() => setShowSpicePicker(true)}
        >
          {`spice${hasConsumables ? ` (${state.consumables.length})` : ''}`}
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

      {/* Topping detail modal */}
      <Modal visible={expandedTopping !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.readoutOverlay} activeOpacity={1} onPress={() => setExpandedTopping(null)}>
          <View style={styles.readoutCard}>
            {expandedTopping && (
              <ToppingDetail toppingId={expandedTopping} onClose={() => setExpandedTopping(null)} />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Spice card picker modal */}
      <Modal visible={showSpicePicker} transparent animationType="slide">
        <TouchableOpacity style={styles.readoutOverlay} activeOpacity={1} onPress={() => setShowSpicePicker(false)}>
          <View style={[styles.readoutCard, styles.spiceCard]}>
            <Text style={styles.readoutEyebrow}>USE A SPICE CARD</Text>
            <Text style={styles.spiceSubtitle}>({state.consumables.length} / {maxConsumables} slots)</Text>
            {state.consumables.map((c, i) => {
              const def = SPICE_CARD_MAP[c];
              return (
                <TouchableOpacity
                  key={`${c}_${i}`}
                  style={[styles.spiceOption, def?.isSecret && styles.spiceOptionSecret]}
                  onPress={() => handleUseConsumable(c)}
                >
                  <Text style={styles.spiceOptionName}>{def?.name ?? c}</Text>
                  <Text style={styles.spiceOptionDesc}>{def?.desc ?? ''}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => setShowSpicePicker(false)} style={styles.cancelTouch}>
              <Text style={styles.cancelText}>cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Letter picker modal (sichuanPepper / ginger / garlicConfit / blackGarlic step 2) */}
      <Modal visible={letterPickerTarget !== null} transparent animationType="slide">
        <View style={styles.readoutOverlay}>
          <View style={[styles.readoutCard, styles.letterPickerCard]}>
            <Text style={styles.readoutEyebrow}>CHOOSE A LETTER</Text>
            {letterPickerTarget === 'ginger' && (
              <Text style={styles.spiceSubtitle}>All copies of this letter will be removed from The Pot</Text>
            )}
            {letterPickerTarget === 'sichuanPepper' && (
              <Text style={styles.spiceSubtitle}>3 copies of this letter will be added to The Pot</Text>
            )}
            {letterPickerTarget === 'garlicConfit' && (
              <Text style={styles.spiceSubtitle}>All copies of this letter in The Pot gain +2 chip value</Text>
            )}
            {letterPickerTarget === 'blackGarlic' && (
              <Text style={styles.spiceSubtitle}>All pot tiles of the chosen value will become this letter</Text>
            )}
            <View style={styles.letterGrid}>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                <TouchableOpacity
                  key={letter}
                  style={styles.letterBtn}
                  onPress={() => handleLetterPick(letter)}
                >
                  <Text style={styles.letterBtnText}>{letter}</Text>
                  <Text style={styles.letterBtnValue}>{LETTER_CHIPS[letter] ?? 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Value picker modal (blackGarlic step 1) */}
      <Modal visible={valuePickerTarget} transparent animationType="slide">
        <View style={styles.readoutOverlay}>
          <View style={[styles.readoutCard, styles.letterPickerCard]}>
            <Text style={styles.readoutEyebrow}>CHOOSE A CHIP VALUE</Text>
            <Text style={styles.spiceSubtitle}>All pot tiles of this value will be converted to a new letter</Text>
            <View style={styles.letterGrid}>
              {CHIP_VALUES.map(v => (
                <TouchableOpacity
                  key={v}
                  style={styles.letterBtn}
                  onPress={() => handleValuePick(String(v))}
                >
                  <Text style={styles.letterBtnText}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Reveal phase screen ──────────────────────────────────────────────────────

function RevealScreen({
  state,
  onBegin,
  onYuzuSkip,
}: {
  state: NonNullable<ReturnType<typeof useSlurp>['runState']>;
  onBegin: () => void;
  onYuzuSkip: () => void;
}) {
  const recipeBookLetters = state.pantryOwned.includes('recipeBook')
    ? state.pot.slice(0, 4)
    : null;

  if (state.yuzuSkipTasting) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.revealContent}>
          <Text style={styles.courseLabel}>
            {COURSE_NAMES[state.course].toUpperCase()} · COURSE {state.course} OF 3
          </Text>
          <View style={styles.revealTitle}>
            <RisoMisreg size={30}>{TASTING_NAMES[state.tasting]}</RisoMisreg>
          </View>
          <RisoBorder bg={R.mustard} pad={14} double style={styles.revealCard}>
            <Text style={styles.revealLabel}>✦ YUZU ACTIVE</Text>
            <RisoMisreg size={22}>Tasting Skipped</RisoMisreg>
            <View style={styles.revealDivider} />
            <Text style={styles.revealStat}>No Coins awarded for this Tasting.</Text>
          </RisoBorder>
          <RisoButton variant="ink" onPress={onYuzuSkip} style={styles.beginBtn}>
            SKIP TO MARKET →
          </RisoButton>
        </View>
      </SafeAreaView>
    );
  }

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
          {recipeBookLetters && recipeBookLetters.length > 0 && (
            <View style={styles.recipeBookRow}>
              <Text style={styles.recipeBookLabel}>📖 NEXT IN POT:</Text>
              <View style={styles.recipeBookTiles}>
                {recipeBookLetters.map((tile, i) => (
                  <View key={`${tile.id}_${i}`} style={styles.recipeBookTile}>
                    <Text style={styles.recipeBookLetter}>{tile.letter}</Text>
                    <Text style={styles.recipeBookValue}>{tile.chipValue}</Text>
                  </View>
                ))}
              </View>
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
        <ReceiptRow label={`${info.pattern.toLowerCase()} pattern`} value={`+${info.patternChips}`} />
        {info.toppingChipsAdded > 0 && (
          <ReceiptRow label="topping chips" value={`+${info.toppingChipsAdded}`} />
        )}
        {Math.abs(info.toppingSeasoningAdded) >= 0.01 && (
          <ReceiptRow label="topping seasoning" value={`${info.toppingSeasoningAdded > 0 ? '+' : ''}${info.toppingSeasoningAdded.toFixed(1)}×`} />
        )}
        {info.fiveSpiceApplied && (
          <ReceiptRow label="five spice" value="×5 SCORE" highlight />
        )}
        <View style={styles.receiptTotal}>
          <Text style={styles.receiptTotalLabel}>
            {info.fiveSpiceApplied
              ? `${info.chips} × ${info.seasoning.toFixed(1)} × 5 =`
              : `${info.chips} × ${info.seasoning.toFixed(1)} =`}
          </Text>
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

function ReceiptRow({ label, value, dashed, highlight }: { label: string; value: string; dashed?: boolean; highlight?: boolean }) {
  return (
    <View style={[styles.receiptRow, dashed && styles.receiptRowDashed]}>
      <Text style={styles.receiptRowLabel}>{label}</Text>
      <Text style={[styles.receiptRowValue, highlight && styles.receiptRowHighlight]}>{value}</Text>
    </View>
  );
}

// ── Topping detail ───────────────────────────────────────────────────────────

function ToppingDetail({ toppingId, onClose }: { toppingId: ToppingId; onClose: () => void }) {
  const def = TOPPING_DEFS[toppingId];
  if (!def) return null;
  return (
    <>
      <Text style={styles.readoutEyebrow}>TOPPING</Text>
      <RisoMisreg size={22}>{def.name}</RisoMisreg>
      <View style={styles.receiptRows}>
        <View style={styles.toppingDetailRow}>
          <Text style={styles.toppingDetailLabel}>TRIGGER</Text>
          <Text style={styles.toppingDetailValue}>{def.triggerDesc}</Text>
        </View>
        <View style={styles.toppingDetailRow}>
          <Text style={styles.toppingDetailLabel}>EFFECT</Text>
          <Text style={styles.toppingDetailValue}>{def.effectDesc}</Text>
        </View>
        <View style={styles.toppingDetailRow}>
          <Text style={styles.toppingDetailLabel}>SELL</Text>
          <Text style={styles.toppingDetailValue}>¢{def.sellValue}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onClose} style={styles.readoutCta}>
        <Text style={styles.readoutCtaText}>close ×</Text>
      </TouchableOpacity>
    </>
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

  // Consumables
  consumablesRow: { paddingHorizontal: 14, paddingBottom: 4, gap: 4 },
  consumableChip: {
    backgroundColor: R.cream,
    borderWidth: 1.5,
    borderColor: R.red,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  consumableChipSecret: { backgroundColor: R.creamDeep, borderStyle: 'dashed' },
  consumableLabel: {
    fontFamily: RF.mono,
    fontSize: 7,
    fontWeight: '700',
    color: R.red,
    letterSpacing: 0.5,
  },

  // Active flags
  activeFlagsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 4,
    gap: 8,
    flexWrap: 'wrap',
  },
  activeFlag: {
    fontFamily: RF.mono,
    fontSize: 7,
    fontWeight: '700',
    color: R.ink,
    backgroundColor: R.scallion,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
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

  // Sesame oil instruction
  sesameInstruction: {
    marginHorizontal: 14,
    marginBottom: 4,
    backgroundColor: R.mustard,
    borderRadius: 4,
    padding: 6,
    alignItems: 'center',
  },
  sesameInstructionText: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    color: R.ink,
    letterSpacing: 1,
  },

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
  recipeBookRow: { marginTop: 10 },
  recipeBookLabel: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    color: R.ink,
    opacity: 0.6,
    marginBottom: 6,
  },
  recipeBookTiles: { flexDirection: 'row', gap: 6 },
  recipeBookTile: {
    alignItems: 'center',
    backgroundColor: R.cream,
    borderWidth: 2,
    borderColor: R.ink,
    borderRadius: 4,
    width: 36,
    height: 40,
    justifyContent: 'center',
  },
  recipeBookLetter: { fontWeight: '900', fontSize: 16, color: R.ink },
  recipeBookValue: {
    fontFamily: RF.mono,
    fontSize: 7,
    fontWeight: '700',
    color: R.red,
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
  receiptRowHighlight: { color: R.mustard },
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

  // Topping detail
  toppingDetailRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: R.ink,
    borderStyle: 'dashed',
  },
  toppingDetailLabel: {
    fontFamily: RF.mono,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: R.red,
    marginBottom: 2,
  },
  toppingDetailValue: {
    fontFamily: RF.serifItalic,
    fontSize: 12,
    color: R.ink,
  },

  // Spice picker
  spiceCard: { maxHeight: '80%' },
  spiceSubtitle: {
    fontFamily: RF.serifItalic,
    fontSize: 11,
    color: R.ink,
    opacity: 0.65,
    marginBottom: 10,
  },
  spiceOption: {
    backgroundColor: R.creamDeep,
    borderWidth: 1.5,
    borderColor: R.ink,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  spiceOptionSecret: { borderColor: R.red, backgroundColor: R.cream },
  spiceOptionName: { fontWeight: '900', fontSize: 13, color: R.ink, marginBottom: 2 },
  spiceOptionDesc: {
    fontFamily: RF.serifItalic,
    fontSize: 10,
    color: R.ink,
    opacity: 0.65,
  },
  cancelTouch: { alignItems: 'center', marginTop: 8 },
  cancelText: {
    fontFamily: RF.serifItalic,
    fontSize: 12,
    color: R.ink,
    opacity: 0.55,
  },

  // Letter picker
  letterPickerCard: { maxHeight: '80%' },
  letterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  letterBtn: {
    width: 36,
    height: 40,
    backgroundColor: R.creamDeep,
    borderWidth: 1.5,
    borderColor: R.ink,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBtnText: { fontWeight: '900', fontSize: 14, color: R.ink },
  letterBtnValue: {
    fontFamily: RF.mono,
    fontSize: 7,
    color: R.red,
    fontWeight: '700',
  },
});
