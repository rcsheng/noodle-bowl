import { copyToClipboard, formatAttribution, pickFromBank, shuffleIndices } from '@/constants/utils';
import { BankExhaustedModal } from '@/components/BankExhaustedModal';
import { StreakCelebrationModal } from '@/components/StreakCelebrationModal';
import { isFriendHintMatch } from '@/lib/friendHint';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
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
import { Masthead } from '@/components/Masthead';
import { CopiedToast } from '@/components/CopiedToast';
import { FirstShieldEarnedModal } from '@/components/FirstShieldEarnedModal';
import { ShieldEarnedToast } from '@/components/ShieldEarnedToast';
import { ShieldPrimerModal } from '@/components/ShieldPrimerModal';
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
  scienceClaim: number;
}


export default function SofScreen() {
  const { user, isAnonymous } = useAuth();
  const { state, isLoaded, updateGameStats, setSeen, addFriendInteraction, earnStreakShield, setAskerAnswer, dismissOnboardingFlag } = useGame();
  const { banks, contentWeek, isLoading: contentLoading } = useContent();
  const { requireAuth, authGateVisible, dismissAuthGate } = useAuthGate();
  const started = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const resultY = useRef(0);
  const {
    challengeToken,
    challengeQuestionIndex,
    challengeSenderName,
    helpToken: helpTokenParam,
    helpQuestionIndex,
    helpAskerName,
    hintQuestionIndex,
    friendHint,
    hintToken,
    hintContentWeek,
  } = useLocalSearchParams<{
    challengeToken?: string;
    challengeQuestionIndex?: string;
    challengeSenderName?: string;
    helpToken?: string;
    helpQuestionIndex?: string;
    helpAskerName?: string;
    hintQuestionIndex?: string;
    friendHint?: string;
    hintToken?: string;
    hintContentWeek?: string;
  }>();
  const isChallengeMode = !!challengeToken;
  const isHelpMode = !!helpTokenParam;
  const isHintMode = !!hintQuestionIndex && !helpTokenParam && !challengeToken;

  type Slot = { item: SofItem; idx: number; claimOrder: number[] };
  const [slot, setSlot] = useState<Slot | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  const [revealData, setRevealData] = useState<RevealData | null>(null);
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
  const [firstShieldModalVisible, setFirstShieldModalVisible] = useState(false);
  const [shieldPrimerVisible, setShieldPrimerVisible] = useState(false);
  const [shieldSignUpDismissed, setShieldSignUpDismissed] = useState(false);
  const [bankExhausted, setBankExhausted] = useState(false);
  const [hintUnavailable, setHintUnavailable] = useState(false);

  useEffect(() => {
    if (!isLoaded || contentLoading || started.current) return;
    started.current = true;
    if (isChallengeMode && challengeQuestionIndex !== undefined) {
      const idx = parseInt(challengeQuestionIndex, 10);
      const item = banks.sof[idx];
      if (!item) {
        logger.warn('[sof] challenge item not found — redirecting to home', {
          idx,
          sofBankLength: banks.sof.length,
          isLoaded,
          contentLoading,
        });
        router.replace('/'); return;
      }
      setSlot({ item, idx, claimOrder: shuffleIndices(item.claims.length) });
    } else if (isHelpMode && helpQuestionIndex !== undefined) {
      const idx = parseInt(helpQuestionIndex, 10);
      const item = banks.sof[idx];
      if (!item) {
        logger.warn('[sof] help item not found — redirecting to home', {
          idx,
          sofBankLength: banks.sof.length,
          isLoaded,
          contentLoading,
        });
        router.replace('/'); return;
      }
      setSlot({ item, idx, claimOrder: shuffleIndices(item.claims.length) });
    } else if (isHintMode && hintQuestionIndex !== undefined) {
      const idx = parseInt(hintQuestionIndex, 10);
      const item = banks.sof[idx];
      // Show unavailable state if the question no longer exists in the current
      // week's bank, or if the hint was created for a different content week.
      if (!item || (hintContentWeek && hintContentWeek !== contentWeek)) {
        setHintUnavailable(true);
        return;
      }
      setSlot({ item, idx, claimOrder: shuffleIndices(item.claims.length) });
    } else {
      const result = pickFromBank(banks.sof, state.seen.sof);
      if (result.exhausted) { setBankExhausted(true); return; }
      setSeen('sof', result.newSeen);
      setSlot({ item: result.item, idx: result.idx, claimOrder: shuffleIndices(result.item.claims.length) });
    }
  }, [isLoaded, contentLoading]);

  const handleLockIn = async () => {
    if (!question || selectedClaim === null) return;
    const scienceClaim = question.claims.findIndex(c => c.isScience);
    const correct = selectedClaim === scienceClaim;
    setRevealData({ correct, scienceClaim });
    updateGameStats('sof', correct);
    Analytics.gameComplete('sof', correct);
    setPhase('reveal');
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: resultY.current - 16, animated: true });
    }, 100);

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
        handleShieldEarned();
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
        handleShieldEarned();
      } catch {
        // ignore
      }
    }

    if (isHintMode && hintToken) {
      setAskerAnswer(hintToken, String(selectedClaim + 1));
    }
  };

  const handlePlayAgain = () => {
    const result = pickFromBank(banks.sof, state.seen.sof);
    if (result.exhausted) { setBankExhausted(true); return; }
    setSeen('sof', result.newSeen);
    setSlot({ item: result.item, idx: result.idx, claimOrder: shuffleIndices(result.item.claims.length) });
    setSelectedClaim(null);
    setPhase('play');
    setRevealData(null);
    setHelpUrl('');
    setHelpError(false);
    setHelpToken(null);
  };

  /** Earns a shield and shows the right feedback (first-time modal vs. repeat toast). */
  const handleShieldEarned = () => {
    const isFirst =
      state.stats.streakShieldsAvailable === 0 &&
      !state.stats.onboarding.firstShieldEarnedSeen;
    earnStreakShield();
    if (isFirst) {
      setFirstShieldModalVisible(true);
    } else {
      setShieldToastVisible(true);
      setTimeout(() => setShieldToastVisible(false), 2200);
    }
  };

  /** Opens "Ask a Friend" modal — shows primer first if not yet seen. */
  const handleAskFriend = () => {
    if (!state.stats.onboarding.shieldPrimerSeen) {
      setShieldPrimerVisible(true);
    } else {
      requireAuth(handleOpenHelp);
    }
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
        contentWeek,
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

  const question = slot?.item ?? null;
  const questionIdx = slot?.idx ?? 0;
  const claimOrder = slot?.claimOrder ?? [0, 1];

  if (bankExhausted) {
    return (
      <BankExhaustedModal
        visible
        gameName="Science or Fiction"
        onDismiss={() => router.replace('/')}
      />
    );
  }

  if (hintUnavailable) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Masthead />
          <View style={styles.unavailableBody}>
            <Text style={styles.unavailableText}>
              This question is no longer available.
            </Text>
            <TouchableOpacity
              style={styles.unavailableBtn}
              onPress={() => router.replace('/')}
              activeOpacity={0.85}
            >
              <Text style={styles.unavailableBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!question) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CompactMasthead />

        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Home</Text>
        </TouchableOpacity>

        {/* Category label — only shown for Weird & True questions */}
        {question.weirdAndTrue && (
          <Text testID="sof-category-label" style={styles.categoryLabel}>Weird &amp; True</Text>
        )}

        {/* Topic header */}
        <Text style={styles.categoryHeadline}>{question.topic}</Text>

        {/* Instructions */}
        {phase === 'play' && (
          <View style={styles.instructions}>
            <Text style={styles.instructionSub}>Tap the Science</Text>
            <Text style={styles.instructionMain}>One is real · one is fiction</Text>
          </View>
        )}

        {/* Claim cards */}
        <View style={styles.claimList}>
          {claimOrder.map((originalIdx, displayIdx) => {
            const claim = question.claims[originalIdx];
            const selected = selectedClaim === originalIdx;

            if (phase === 'reveal' && revealData) {
              const isScienceClaim = originalIdx === revealData.scienceClaim;
              const isWrongPick = originalIdx === selectedClaim && !isScienceClaim;
              const isColored = isScienceClaim || isWrongPick;
              return (
                <View key={originalIdx} style={styles.claimCard}>
                  <View style={[
                    styles.claimHeader,
                    isScienceClaim && styles.claimHeaderFake,
                    isWrongPick && styles.claimHeaderWrong,
                  ]}>
                    <Text style={[styles.claimNum, isColored && styles.claimNumOnColor]}>
                      CLAIM {displayIdx + 1}
                    </Text>
                    <Text style={[styles.claimIndicator, isColored && styles.claimIndicatorOnColor]}>
                      {isScienceClaim ? '✓' : isWrongPick ? '✗' : ''}
                    </Text>
                  </View>
                  <Text style={styles.claimText}>{claim.text}</Text>
                  <View style={styles.revealSection}>
                    <Text style={styles.explanationText}>{claim.explanation}</Text>
                    {formatAttribution(claim.source?.name, isScienceClaim ? question.eventDate : undefined) && (
                      <Text style={styles.eventDate} numberOfLines={1}>
                        {formatAttribution(claim.source?.name, isScienceClaim ? question.eventDate : undefined)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            }

            const isHinted = isFriendHintMatch('sof', originalIdx, friendHint);
            return (
              <TouchableOpacity
                key={originalIdx}
                style={[styles.claimCard, selected && styles.claimCardSelected, isHinted && !selected && styles.claimCardHinted]}
                onPress={() => setSelectedClaim(originalIdx)}
                activeOpacity={0.85}
              >
                <View style={styles.claimHeader}>
                  <Text style={[styles.claimNum, selected && styles.claimNumSelected]}>
                    CLAIM {displayIdx + 1}
                  </Text>
                  {selected && <Text style={styles.myPickLabel}>← MY PICK</Text>}
                  {isHinted && !selected && (
                    <Text testID={`claim-friend-hint-${originalIdx}`} style={styles.friendHintLabel}>
                      friend's pick
                    </Text>
                  )}
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

            {!isChallengeMode && !isHelpMode && !isHintMode && (
              <TouchableOpacity
                style={styles.helpLink}
                onPress={handleAskFriend}
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
            <View
              style={styles.resultCard}
              onLayout={(e) => { resultY.current = e.nativeEvent.layout.y; }}
            >
              <View style={styles.cardInnerBorder} />
              <Text style={[styles.resultVerdict, revealData.correct ? styles.resultCorrect : styles.resultWrong]}>
                {revealData.correct ? 'Correct' : 'Incorrect'}
              </Text>
            </View>

            {isChallengeMode ? (
              <>
                {challengeComparison && (
                  <View style={styles.challengePanel}>
                    <View style={styles.cardInnerBorder} />
                    <Text style={styles.challengePanelLabel}>Challenge Results</Text>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>Your science pick</Text>
                      <Text style={styles.challengeVal}>
                        {selectedClaim !== null ? `Claim ${selectedClaim + 1}` : '—'}
                      </Text>
                    </View>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>{challengeSenderName ?? 'Sender'}'s science pick</Text>
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
        predictLabel="Which claim do you think they'll call Science?"
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

      <ShieldEarnedToast visible={shieldToastVisible} suppressed={firstShieldModalVisible} />
      <StreakCelebrationModal />

      {/* §1b Shield Primer — shown before first ask-a-friend tap */}
      <ShieldPrimerModal
        visible={shieldPrimerVisible}
        onContinue={() => {
          setShieldPrimerVisible(false);
          dismissOnboardingFlag('shieldPrimerSeen');
          requireAuth(handleOpenHelp);
        }}
        onDismiss={() => setShieldPrimerVisible(false)}
      />

      {/* §1c First Shield Earned Modal */}
      <FirstShieldEarnedModal
        visible={firstShieldModalVisible}
        onDismiss={() => {
          setFirstShieldModalVisible(false);
          dismissOnboardingFlag('firstShieldEarnedSeen');
        }}
      />
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
  unavailableBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  unavailableText: {
    fontFamily: F.fraunces,
    fontSize: 18,
    color: C.ink,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 28,
  },
  unavailableBtn: {
    backgroundColor: C.ink,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  unavailableBtnText: {
    fontFamily: F.monoBold,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.onDark,
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  backText: {
    fontFamily: F.mono,
    fontSize: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
  },
  categoryLabel: {
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.accent,
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
    overflow: 'hidden',
  },
  claimCardSelected: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  claimCardHinted: {
    backgroundColor: C.paperDark,
    borderColor: C.accent,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  claimHeaderFake: {
    backgroundColor: C.green,
  },
  claimHeaderWrong: {
    backgroundColor: C.accent,
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
  claimNumOnColor: {
    color: C.onDark,
  },
  claimIndicator: {
    fontFamily: F.monoBold,
    fontSize: 18,
    minWidth: 32,
    textAlign: 'right',
    color: C.muted,
  },
  claimIndicatorOnColor: {
    color: C.onDark,
  },
  myPickLabel: {
    fontFamily: F.frauncesItalic,
    fontSize: 12,
    color: C.onDarkDim,
  },
  friendHintLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.accent,
  },
  claimText: {
    fontFamily: F.fraunces,
    fontSize: 15,
    color: C.ink,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  claimTextSelected: {
    color: C.onDark,
  },
  revealSection: {
    borderTopWidth: 1,
    borderTopColor: C.paperDarker,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  explanationText: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.ink,
    lineHeight: 20,
    marginBottom: 8,
  },
  eventDate: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    marginTop: 8,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
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
    fontSize: 20,
    textAlign: 'center',
  },
  resultCorrect: {
    color: C.green,
  },
  resultWrong: {
    color: C.accent,
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
