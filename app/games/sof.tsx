import { copyToClipboard, shuffleIndices } from '@/constants/utils';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChallengeModal } from '@/components/ChallengeModal';
import { ChallengeSignUpBanner } from '@/components/ChallengeSignUpBanner';
import { CompactMasthead } from '@/components/masthead/CompactMasthead';
import { CopiedToast } from '@/components/CopiedToast';
import { ShieldEarnedToast } from '@/components/ShieldEarnedToast';
import { ShieldSignUpBanner } from '@/components/ShieldSignUpBanner';
import { SofItem } from '@/constants/data';
import { C, F, cardShadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useContent } from '@/context/ContentContext';
import { useGame } from '@/context/GameContext';
import { AuthGateModal } from '@/components/AuthGateModal';
import { useAuthGate } from '@/lib/authGuard';
import * as Analytics from '@/lib/analytics';
import { createChallenge, respondToChallenge } from '@/lib/challengeApi';
import { createHelp, respondToHelp } from '@/lib/helpApi';
import { getCachedPushToken } from '@/lib/pushTokens';
import { logger } from '@/lib/logger';
import { ChallengeRespondOutput, HelpRespondOutput } from '@/packages/shared/types';

type Phase = 'play' | 'reveal';

interface RevealData {
  correct: boolean;
  points: number;
  fakeClaim: number;
  prevStreak: number;
}

function pickFromSof(
  sofBank: SofItem[],
  weirdMode: boolean,
  seen: number[]
): { idx: number; item: SofItem; newSeen: number[] } {
  const filtered = sofBank
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => item.weirdAndTrue === weirdMode);
  const seenInMode = seen.filter(i => sofBank[i]?.weirdAndTrue === weirdMode);
  const available = seenInMode.length >= filtered.length
    ? filtered
    : filtered.filter(({ i }) => !seenInMode.includes(i));
  const pick = available[Math.floor(Math.random() * available.length)];
  return { idx: pick.i, item: pick.item, newSeen: seen.includes(pick.i) ? seen : [...seen, pick.i] };
}

export default function SofScreen() {
  const { user, isAnonymous } = useAuth();
  const { state, isLoaded, updateGameStats, setSeen, addFriendInteraction, earnStreakShield } = useGame();
  const { banks } = useContent();
  const { requireAuth, authGateVisible, dismissAuthGate } = useAuthGate();
  const started = useRef(false);
  const {
    challengeToken,
    challengeQuestionIndex,
    challengeSenderName,
    helpToken: helpTokenParam,
    helpQuestionIndex,
    helpAskerName,
  } = useLocalSearchParams<{
    challengeToken?: string;
    challengeQuestionIndex?: string;
    challengeSenderName?: string;
    helpToken?: string;
    helpQuestionIndex?: string;
    helpAskerName?: string;
  }>();
  const isChallengeMode = !!challengeToken;
  const isHelpMode = !!helpTokenParam;

  type Slot = { item: SofItem; idx: number; claimOrder: number[] };
  const [standardSlot, setStandardSlot] = useState<Slot | null>(null);
  const [weirdSlot, setWeirdSlot] = useState<Slot | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [weirdMode, setWeirdMode] = useState(false);
  const [showFriend, setShowFriend] = useState(false);
  const [helpUrl, setHelpUrl] = useState('');
  const [helpError, setHelpError] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpToken, setHelpToken] = useState<string | null>(null);
  const [showChallenge, setShowChallenge] = useState(false);
  const [helpCopied, setHelpCopied] = useState(false);
  const [challengeComparison, setChallengeComparison] = useState<ChallengeRespondOutput | null>(null);
  const [helpRespondResult, setHelpRespondResult] = useState<HelpRespondOutput | null>(null);
  const [signUpBannerDismissed, setSignUpBannerDismissed] = useState(false);
  const [shieldToastVisible, setShieldToastVisible] = useState(false);
  const [shieldSignUpDismissed, setShieldSignUpDismissed] = useState(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;
    if (isChallengeMode && challengeQuestionIndex !== undefined) {
      const idx = parseInt(challengeQuestionIndex, 10);
      const item = banks.sof[idx];
      if (!item) { router.replace('/'); return; }
      const slot = { item, idx, claimOrder: shuffleIndices(item.claims.length) };
      if (item.weirdAndTrue) setWeirdSlot(slot); else setStandardSlot(slot);
      setWeirdMode(item.weirdAndTrue);
    } else if (isHelpMode && helpQuestionIndex !== undefined) {
      const idx = parseInt(helpQuestionIndex, 10);
      const item = banks.sof[idx];
      if (!item) { router.replace('/'); return; }
      const slot = { item, idx, claimOrder: shuffleIndices(item.claims.length) };
      if (item.weirdAndTrue) setWeirdSlot(slot); else setStandardSlot(slot);
      setWeirdMode(item.weirdAndTrue);
    } else {
      const { idx: stdIdx, item: stdItem, newSeen: seenAfterStd } = pickFromSof(banks.sof, false, state.seen.sof);
      const { idx: wrdIdx, item: wrdItem, newSeen: seenAfterBoth } = pickFromSof(banks.sof, true, seenAfterStd);
      setSeen('sof', seenAfterBoth);
      setStandardSlot({ item: stdItem, idx: stdIdx, claimOrder: shuffleIndices(stdItem.claims.length) });
      setWeirdSlot({ item: wrdItem, idx: wrdIdx, claimOrder: shuffleIndices(wrdItem.claims.length) });
    }
  }, [isLoaded]);

  const handleLockIn = async () => {
    if (!question || selectedClaim === null) return;
    const fakeClaim = question.claims.findIndex(c => !c.isScience);
    const correct = selectedClaim === fakeClaim;
    const points = correct ? 10 : 0;
    const prevStreak = state.stats.sof.streak;
    setRevealData({ correct, points, fakeClaim, prevStreak });
    updateGameStats('sof', correct, points);
    Analytics.gameComplete('sof', correct, Math.max(0, points));
    setPhase('reveal');

    if (isChallengeMode && challengeToken && !challengeComparison) {
      try {
        const comparison = await respondToChallenge({ token: challengeToken, friendAnswer: String(selectedClaim + 1) });
        setChallengeComparison(comparison);
        addFriendInteraction({
          type: 'received_challenge',
          friendName: challengeSenderName ?? 'A Friend',
          gameId: 'sof',
          questionIndex: questionIdx,
          shieldEarned: true,
        });
        earnStreakShield();
        setShieldToastVisible(true);
        setTimeout(() => setShieldToastVisible(false), 2200);
      } catch {
        // ignore — user still sees their result
      }
    }

    if (isHelpMode && helpTokenParam && !helpRespondResult) {
      try {
        const result = await respondToHelp({ token: helpTokenParam, helperAnswer: String(selectedClaim + 1) });
        setHelpRespondResult(result);
        addFriendInteraction({
          type: 'gave_help',
          friendName: helpAskerName || 'A Friend',
          gameId: 'sof',
          questionIndex: questionIdx,
          shieldEarned: true,
        });
        earnStreakShield();
        setShieldToastVisible(true);
        setTimeout(() => setShieldToastVisible(false), 2200);
      } catch {
        // ignore
      }
    }
  };

  const handlePlayAgain = () => {
    const { idx, item, newSeen } = pickFromSof(banks.sof, weirdMode, state.seen.sof);
    setSeen('sof', newSeen);
    const newSlot = { item, idx, claimOrder: shuffleIndices(item.claims.length) };
    if (weirdMode) setWeirdSlot(newSlot); else setStandardSlot(newSlot);
    setSelectedClaim(null);
    setPhase('play');
    setRevealData(null);
    setHelpUrl('');
    setHelpError(false);
    setHelpToken(null);
  };

  const handleToggleMode = (nextMode: boolean) => {
    if (nextMode === weirdMode) return;
    setWeirdMode(nextMode);
    setSelectedClaim(null);
    setPhase('play');
    setRevealData(null);
    setHelpUrl('');
    setHelpError(false);
    setHelpToken(null);
  };

  const handleOpenHelp = async () => {
    if (helpUrl) {
      setShowFriend(true);
      return;
    }
    setShowFriend(true);
    setHelpError(false);
    setHelpLoading(true);
    try {
      const result = await createHelp({
        gameId: 'sof',
        questionIndex: questionIdx,
        askerName: null,
        askerPushToken: getCachedPushToken(),
      });
      setHelpUrl(result.url);
      setHelpToken(result.token);
      Analytics.helpSent('sof');
      addFriendInteraction({ type: 'sent_help', friendName: 'A Friend', gameId: 'sof', questionIndex: questionIdx, shieldEarned: false, token: result.token });
    } catch (err) {
      logger.error('[sof] createHelp failed', err);
      setHelpError(true);
    } finally {
      setHelpLoading(false);
    }
  };

  const handleShare = async () => {
    await Share.share({ message: `Can you help me with this question on Noodle Bowl? ${helpUrl}` });
  };

  const handleCopyHelp = async () => {
    const copied = await copyToClipboard(helpUrl);
    if (copied) {
      setHelpCopied(true);
      setTimeout(() => setHelpCopied(false), 2000);
    }
  };

  const currentSlot = weirdMode ? weirdSlot : standardSlot;
  const question = currentSlot?.item ?? null;
  const questionIdx = currentSlot?.idx ?? 0;
  const claimOrder = currentSlot?.claimOrder ?? [0, 1, 2];

  if (!question) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CompactMasthead />

        {phase === 'play' && (
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
            <Text style={styles.backText}>← Back to Home</Text>
          </TouchableOpacity>
        )}

        {/* Mode toggle — segmented control */}
        {!isChallengeMode && !isHelpMode && phase === 'play' && (
          <>
          <Text style={styles.modeLabel}>Select mode</Text>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              testID="sof-mode-standard"
              style={[styles.modeBtn, !weirdMode && styles.modeBtnActive]}
              onPress={() => handleToggleMode(false)}
              activeOpacity={0.85}
            >
              <Text style={[styles.modeBtnText, !weirdMode && styles.modeBtnTextActive]}>Standard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="sof-mode-weird"
              style={[styles.modeBtn, weirdMode && styles.modeBtnActive]}
              onPress={() => handleToggleMode(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.modeBtnText, weirdMode && styles.modeBtnTextActive]}>Weird & True</Text>
            </TouchableOpacity>
          </View>
          </>
        )}

        {/* Topic header */}
        <Text style={styles.categoryHeadline}>{question.topic}</Text>

        {/* Instructions */}
        {phase === 'play' && (
          <View style={styles.instructions}>
            <Text style={styles.instructionSub}>Tap the Fake</Text>
            <Text style={styles.instructionMain}>Two are real · one is a lie</Text>
          </View>
        )}

        {/* Claim cards */}
        <View style={styles.claimList}>
          {claimOrder.map((originalIdx, displayIdx) => {
            const claim = question.claims[originalIdx];
            const selected = selectedClaim === originalIdx;

            if (phase === 'reveal' && revealData) {
              const isFake = originalIdx === revealData.fakeClaim;
              const isWrongPick = originalIdx === selectedClaim && !isFake;
              return (
                <View
                  key={originalIdx}
                  style={[
                    styles.claimCard,
                    isFake && styles.claimCardFake,
                    isWrongPick && styles.claimCardWrongPick,
                  ]}
                >
                  <View style={styles.claimHeader}>
                    <Text style={styles.claimNum}>CLAIM {displayIdx + 1}</Text>
                    {isFake && <Text style={styles.fakeLabel}>← THE FAKE</Text>}
                  </View>
                  <Text style={styles.claimText}>{claim.text}</Text>
                  <View style={styles.revealSection}>
                    <View style={[styles.verdictTag, claim.isScience ? styles.verdictScience : styles.verdictFiction]}>
                      <Text style={styles.verdictTagText}>{claim.isScience ? 'Science' : 'Fiction'}</Text>
                    </View>
                    <Text style={styles.explanationText}>{claim.explanation}</Text>
                    {claim.source && (
                      <TouchableOpacity
                        onPress={() => claim.source && Linking.openURL(claim.source.url)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.sourceLink}>Source: {claim.source.name} ↗</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={originalIdx}
                style={[styles.claimCard, selected && styles.claimCardSelected]}
                onPress={() => setSelectedClaim(originalIdx)}
                activeOpacity={0.85}
              >
                <View style={styles.claimHeader}>
                  <Text style={[styles.claimNum, selected && styles.claimNumSelected]}>
                    CLAIM {displayIdx + 1}
                  </Text>
                  {selected && <Text style={styles.myPickLabel}>← MY PICK</Text>}
                </View>
                <Text style={[styles.claimText, selected && styles.claimTextSelected]}>
                  {claim.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Play phase CTA */}
        {phase === 'play' && (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, selectedClaim === null && styles.primaryBtnDisabled]}
              onPress={handleLockIn}
              disabled={selectedClaim === null}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {selectedClaim !== null ? `LOCK IN CLAIM ${claimOrder.indexOf(selectedClaim) + 1}` : 'LOCK IN'}
              </Text>
            </TouchableOpacity>

            {!isChallengeMode && !isHelpMode && (
              <TouchableOpacity
                style={styles.helpLink}
                onPress={() => requireAuth(handleOpenHelp)}
                activeOpacity={0.7}
              >
                <Text style={styles.helpLinkText}>Stuck? Ask a friend</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Reveal */}
        {phase === 'reveal' && revealData && (
          <>
            <View style={styles.resultCard}>
              <View style={styles.cardInnerBorder} />
              <Text style={[styles.resultVerdict, revealData.correct ? styles.resultCorrect : styles.resultWrong]}>
                {revealData.correct ? 'You spotted the fake!' : 'That was the real one.'}
              </Text>
              <Text style={styles.resultPoints}>
                {revealData.points > 0 ? `+${revealData.points} pts` : '0 pts'}
              </Text>
            </View>

            {isChallengeMode ? (
              <>
                {challengeComparison && (
                  <View style={styles.challengePanel}>
                    <View style={styles.cardInnerBorder} />
                    <Text style={styles.challengePanelLabel}>Challenge Results</Text>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>Your fiction pick</Text>
                      <Text style={styles.challengeVal}>
                        {selectedClaim !== null ? `Claim ${selectedClaim + 1}` : '—'}
                      </Text>
                    </View>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>{challengeSenderName ?? 'Sender'}'s fiction pick</Text>
                      <Text style={styles.challengeVal}>Claim {challengeComparison.senderAnswer}</Text>
                    </View>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>Their prediction</Text>
                      <Text style={styles.challengeVal}>
                        Claim {challengeComparison.senderPrediction}{' '}
                        {challengeComparison.senderPrediction === String(selectedClaim !== null ? selectedClaim + 1 : 0) ? '✓' : '✗'}
                      </Text>
                    </View>
                  </View>
                )}
                {isAnonymous && !signUpBannerDismissed && (
                  <ChallengeSignUpBanner
                    senderName={challengeSenderName ?? 'your friend'}
                    onCreateAccount={() => router.push({ pathname: '/auth/sign-up', params: { from: 'reveal' } })}
                    onSignIn={() => router.push({ pathname: '/auth/sign-in', params: { from: 'reveal' } })}
                    onDismiss={() => setSignUpBannerDismissed(true)}
                  />
                )}
              </>
            ) : isHelpMode ? (
              <>
                {isAnonymous && !shieldSignUpDismissed ? (
                  <ShieldSignUpBanner
                    helpSentFor={helpAskerName || 'your friend'}
                    onCreateAccount={() => router.push({ pathname: '/auth/sign-up', params: { from: 'reveal' } })}
                    onSignIn={() => router.push({ pathname: '/auth/sign-in', params: { from: 'reveal' } })}
                    onDismiss={() => setShieldSignUpDismissed(true)}
                  />
                ) : (
                  <View style={styles.challengePanel}>
                    <View style={styles.cardInnerBorder} />
                    <Text style={styles.helpSentHeading}>Help Sent</Text>
                    <Text style={[styles.explanationText, { textAlign: 'center' }]}>
                      Your answer has been sent to {helpAskerName || 'your friend'}.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => requireAuth(() => setShowChallenge(true))}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>Challenge a Friend to This One</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handlePlayAgain}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryBtnText}>Play Again</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Home</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Noodle Bowl · N° 03 · Science or Fiction</Text>
        </View>
      </ScrollView>

      <ChallengeModal
        visible={showChallenge}
        onClose={() => setShowChallenge(false)}
        correct={revealData?.correct ?? false}
        predictLabel="Which claim do you think they'll call Fiction?"
        predictOptions={question.claims.map((claim, i) => ({
          label: `${i + 1}. ${claim.text.split(' ').slice(0, 6).join(' ')}…`,
          value: String(i + 1),
        }))}
        buildChallengeUrl={async (friendName, prediction) => {
          const result = await createChallenge({
            gameId: 'sof',
            questionIndex: questionIdx,
            senderPrediction: prediction,
            senderAnswer: String(selectedClaim !== null ? selectedClaim + 1 : 0),
            senderName: user?.displayName ?? 'A Friend',
            senderPushToken: getCachedPushToken(),
          });
          Analytics.challengeSent('sof');
          return { url: result.url, token: result.token };
        }}
        onSent={(prediction, friendName, token) => addFriendInteraction({
          type: 'sent_challenge',
          friendName,
          gameId: 'sof',
          questionIndex: questionIdx,
          shieldEarned: false,
          senderPrediction: prediction,
          token,
        })}
      />

      <AuthGateModal visible={authGateVisible} onDismiss={dismissAuthGate} />

      <Modal visible={showFriend} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalInnerBorder} />
            <Text style={styles.modalTitle}>Ask a Friend for Help</Text>
            <Text style={styles.modalSubtitle}>Share this link — they can peek at the answer.</Text>

            <TouchableOpacity style={styles.urlBox} onPress={handleCopyHelp} activeOpacity={0.7}>
              <Text style={styles.urlText}>
                {helpLoading ? 'Generating link…' : helpError ? "Couldn't reach our servers" : helpUrl}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtn} onPress={handleShare} activeOpacity={0.85}>
              <Text style={styles.modalBtnText}>Share with a Friend</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={() => setShowFriend(false)}
              activeOpacity={0.85}
            >
              <Text style={[styles.modalBtnText, styles.modalBtnTextSecondary]}>Close</Text>
            </TouchableOpacity>
          </View>
          <CopiedToast visible={helpCopied} />
        </View>
      </Modal>

      <ShieldEarnedToast visible={shieldToastVisible} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.paper,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.ink,
    backgroundColor: C.paper,
  },
  modeBtnActive: {
    backgroundColor: C.ink,
  },
  modeBtnText: {
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.ink,
  },
  modeBtnTextActive: {
    color: C.onDark,
  },
  modeLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 6,
  },
  categoryHeadline: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 22,
    color: C.ink,
    lineHeight: 30,
    marginBottom: 20,
  },
  instructions: {
    marginBottom: 16,
  },
  instructionSub: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 19,
    color: C.ink,
    lineHeight: 26,
    marginBottom: 4,
  },
  instructionMain: {
    fontFamily: F.frauncesItalic,
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
  },
  claimList: {
    gap: 12,
    marginBottom: 20,
  },
  claimCard: {
    borderWidth: 1.5,
    borderColor: C.ink,
    backgroundColor: C.paper,
    padding: 14,
  },
  claimCardSelected: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  claimCardFake: {
    borderColor: C.green,
    borderWidth: 2,
  },
  claimCardWrongPick: {
    borderColor: C.accent,
    borderWidth: 2,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  claimNum: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
  },
  claimNumSelected: {
    color: C.onDarkDim,
  },
  myPickLabel: {
    fontFamily: F.frauncesItalic,
    fontSize: 12,
    color: C.onDarkDim,
  },
  fakeLabel: {
    fontFamily: F.frauncesItalic,
    fontSize: 12,
    color: C.green,
  },
  claimText: {
    fontFamily: F.fraunces,
    fontSize: 15,
    color: C.ink,
    lineHeight: 22,
  },
  claimTextSelected: {
    color: C.onDark,
  },
  revealSection: {
    borderTopWidth: 1,
    borderTopColor: C.paperDarker,
    paddingTop: 12,
    marginTop: 10,
  },
  verdictTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  verdictScience: {
    backgroundColor: C.green,
  },
  verdictFiction: {
    backgroundColor: C.accent,
  },
  verdictTagText: {
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.onDark,
  },
  explanationText: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.ink,
    lineHeight: 20,
    marginBottom: 8,
  },
  sourceLink: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: C.accent,
    textDecorationLine: 'underline',
  },
  primaryBtn: {
    backgroundColor: C.ink,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.onDark,
  },
  secondaryBtn: {
    backgroundColor: C.paper,
    borderWidth: 2,
    borderColor: C.ink,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryBtnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.ink,
  },
  helpLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  helpLinkText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    textDecorationLine: 'underline',
  },
  resultCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    ...cardShadow,
  },
  cardInnerBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(42,36,29,0.15)',
    pointerEvents: 'none',
  },
  resultVerdict: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 30,
    marginBottom: 4,
    textAlign: 'center',
  },
  resultCorrect: {
    color: C.green,
  },
  resultWrong: {
    color: C.accent,
  },
  resultPoints: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 24,
    color: C.ink,
  },
  challengePanel: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 20,
    marginBottom: 16,
    ...cardShadow,
  },
  challengePanelLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 14,
  },
  helpSentHeading: {
    fontFamily: F.frauncesBold,
    fontSize: 22,
    color: C.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  challengeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: C.paperDarker,
  },
  challengeKey: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    flex: 1,
  },
  challengeVal: {
    fontFamily: F.frauncesBold,
    fontSize: 13,
    color: C.ink,
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,32,48,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.rule,
    padding: 28,
    ...cardShadow,
  },
  modalInnerBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(42,36,29,0.15)',
    pointerEvents: 'none',
  },
  modalTitle: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 24,
    color: C.ink,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    marginBottom: 20,
    lineHeight: 20,
  },
  urlBox: {
    backgroundColor: C.ink,
    padding: 14,
    marginBottom: 16,
  },
  urlText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onDark,
    letterSpacing: 0.5,
  },
  modalBtn: {
    backgroundColor: C.ink,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalBtnSecondary: {
    backgroundColor: C.paper,
    borderWidth: 2,
    borderColor: C.ink,
  },
  modalBtnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.onDark,
  },
  modalBtnTextSecondary: {
    color: C.ink,
  },
});
