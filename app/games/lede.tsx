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
import { CopiedToast } from '@/components/CopiedToast';
import { CompactMasthead } from '@/components/masthead/CompactMasthead';
import { ShieldEarnedToast } from '@/components/ShieldEarnedToast';
import { ShieldSignUpBanner } from '@/components/ShieldSignUpBanner';
import { LedeItem, LedePanelist } from '@/constants/data';
import { C, F, cardShadow } from '@/constants/theme';
import { calculatePoints, copyToClipboard, formatAttribution, pickFromBank, shuffleIndices } from '@/constants/utils';
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

const LETTERS = ['A', 'B', 'C'] as const;
type Letter = typeof LETTERS[number];

function truncateCompletion(text: string): string {
  const words = text.split(' ');
  return words.length > 7 ? words.slice(0, 7).join(' ') + '…' : text;
}

type Phase = 'play' | 'reveal';

interface RevealData {
  correct: boolean;
  points: number;
  prevStreak: number;
}

export default function LedeScreen() {
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

  const [question, setQuestion] = useState<LedeItem | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
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
  const [shieldSignUpDismissed, setShieldSignUpDismissed] = useState(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;
    if (isChallengeMode && challengeQuestionIndex !== undefined) {
      const idx = parseInt(challengeQuestionIndex, 10);
      const item = banks.lede[idx];
      if (!item) { router.replace('/'); return; }
      setQuestion(item);
      setQuestionIdx(idx);
      setOrder(shuffleIndices(item.panelists.length));
    } else if (isHelpMode && helpQuestionIndex !== undefined) {
      const idx = parseInt(helpQuestionIndex, 10);
      const item = banks.lede[idx];
      if (!item) { router.replace('/'); return; }
      setQuestion(item);
      setQuestionIdx(idx);
      setOrder(shuffleIndices(item.panelists.length));
    } else {
      const { idx, item, newSeen } = pickFromBank(banks.lede, state.seen.lede);
      setSeen('lede', newSeen);
      setQuestion(item);
      setQuestionIdx(idx);
      setOrder(shuffleIndices(item.panelists.length));
    }
  }, [isLoaded]);

  const handleLockIn = async () => {
    if (selected === null || !question) return;
    const panelist = question.panelists[selected];
    const correct = panelist.isCorrect;
    const prevStreak = state.stats.lede.streak;
    const points = calculatePoints(correct, prevStreak);
    setRevealData({ correct, points, prevStreak });
    updateGameStats('lede', correct, points);
    Analytics.gameComplete('lede', correct, points);
    setPhase('reveal');

    if (isChallengeMode && challengeToken && !challengeComparison) {
      try {
        const friendAnswer = String(selected);
        const comparison = await respondToChallenge({ token: challengeToken, friendAnswer });
        setChallengeComparison(comparison);
        addFriendInteraction({
          type: 'received_challenge',
          friendName: challengeSenderName ?? 'A Friend',
          gameId: 'lede',
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
        const result = await respondToHelp({ token: helpTokenParam, helperAnswer: String(selected) });
        setHelpRespondResult(result);
        addFriendInteraction({
          type: 'gave_help',
          friendName: helpAskerName || 'A Friend',
          gameId: 'lede',
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

  const scrollRef = useRef<ScrollView>(null);

  const handlePlayAgain = () => {
    const { idx, item, newSeen } = pickFromBank(banks.lede, state.seen.lede);
    setSeen('lede', newSeen);
    setQuestion(item);
    setQuestionIdx(idx);
    setOrder(shuffleIndices(item.panelists.length));
    setSelected(null);
    setPhase('play');
    setRevealData(null);
    setHelpUrl('');
    setHelpError(false);
    setHelpToken(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
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
        gameId: 'lede',
        questionIndex: questionIdx,
        askerName: null,
        askerPushToken: getCachedPushToken(),
      });
      setHelpUrl(result.url);
      setHelpToken(result.token);
      Analytics.helpSent('lede');
      addFriendInteraction({ type: 'sent_help', friendName: 'A Friend', gameId: 'lede', questionIndex: questionIdx, shieldEarned: false, token: result.token });
    } catch (err) {
      logger.error('[lede] createHelp failed', err);
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

  if (!question) return null;

  const orderedPanelists: { panelist: LedePanelist; originalIdx: number }[] = order.map(
    (i) => ({ panelist: question.panelists[i], originalIdx: i }),
  );

  // Determine which display letter (A/B/C) corresponds to the selected panelist (used for button label)
  const selectedLetterIdx = selected !== null
    ? orderedPanelists.findIndex(p => p.originalIdx === selected)
    : -1;
  const selectedLetter: Letter | null = selectedLetterIdx >= 0 ? LETTERS[selectedLetterIdx] : null;

  const correctPanelist = question.panelists.find(p => p.isCorrect);

  // Split headline on the blank marker
  const blankIdx = question.partialHeadline.indexOf('___');
  const headlineBefore = blankIdx >= 0 ? question.partialHeadline.slice(0, blankIdx) : question.partialHeadline;
  const headlineAfter = blankIdx >= 0 ? question.partialHeadline.slice(blankIdx + 3) : '';

  const getChoiceRevealState = (originalIdx: number): 'correct' | 'wrong' | 'neutral' => {
    const p = question.panelists[originalIdx];
    if (p.isCorrect) return 'correct';
    if (originalIdx === selected) return 'wrong';
    return 'neutral';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CompactMasthead />

        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Home</Text>
        </TouchableOpacity>

        {/* Headline block */}
        <Text style={styles.kicker}>Finish the Headline</Text>

        <Text style={styles.headlineText}>
          {headlineBefore}
          <Text
            testID="lede-headline-pill"
            style={styles.blankPill}
          >
            {' ... '}
          </Text>
          {headlineAfter}
        </Text>

        {phase === 'play' && (
          <Text style={styles.choiceHeading}>Tap to choose</Text>
        )}

        <View testID="lede-choice-list" style={styles.choiceList}>
          {orderedPanelists.map(({ panelist, originalIdx }, displayIdx) => {
            const letter = LETTERS[displayIdx];
            const isSelected = selected === originalIdx;

            if (phase === 'reveal') {
              const revealState = getChoiceRevealState(originalIdx);
              const indicator = revealState === 'correct' ? '✓' : revealState === 'wrong' ? '✗' : '';
              const isColored = revealState !== 'neutral';
              return (
                <View key={originalIdx} style={[
                  styles.choiceRow,
                  revealState === 'correct' && styles.choiceRowCorrect,
                  revealState === 'wrong' && styles.choiceRowWrong,
                ]}>
                  <View style={[styles.choiceBar, isColored && styles.choiceBarOnColor]} />
                  <View style={styles.choiceBody}>
                    <Text style={[styles.choiceText, isColored && styles.choiceTextSelected]}>
                      {panelist.completion}
                    </Text>
                  </View>
                  <Text style={[styles.choiceIndicator, isColored && styles.choiceIndicatorOnColor]}>
                    {indicator}
                  </Text>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={originalIdx}
                style={[styles.choiceRow, isSelected && styles.choiceRowSelected]}
                onPress={() => setSelected(originalIdx)}
                activeOpacity={0.85}
              >
                <View style={[styles.choiceBar, isSelected && styles.choiceBarSelected]} />
                <View style={styles.choiceBody}>
                  <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>
                    {panelist.completion}
                  </Text>
                </View>
                <Text style={[styles.choiceLetter, isSelected && styles.choiceLetterSelected]}>
                  {letter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reveal: compact result indicator */}
        {phase === 'reveal' && revealData && (
          <View testID="lede-result-card" style={styles.resultCard}>
            <View style={styles.cardInnerBorder} />
            <Text style={[styles.resultVerdict, revealData.correct ? styles.resultCorrect : styles.resultWrong]}>
              {revealData.correct ? 'Correct' : 'Incorrect'}
            </Text>
            <Text style={styles.resultDivider}> · </Text>
            <Text style={styles.resultPoints}>
              {revealData.correct ? `+${revealData.points} pts` : '0 pts'}
            </Text>
          </View>
        )}

        {/* Reveal: explanation + attribution */}
        {phase === 'reveal' && (
          <View testID="lede-reveal-box" style={styles.infoBox}>
            <Text style={styles.infoText}>{question.explanation}</Text>
            {formatAttribution(question.sourceHint, question.eventDate) && (
              <Text style={styles.eventDate} numberOfLines={1}>
                {formatAttribution(question.sourceHint, question.eventDate)}
              </Text>
            )}
          </View>
        )}

        {/* Play phase CTAs */}
        {phase === 'play' && (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, selected === null && styles.primaryBtnDisabled]}
              onPress={handleLockIn}
              disabled={selected === null}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {selectedLetter ? `Lock In ${selectedLetter}` : 'Lock In'}
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

        {/* Reveal phase: post-game actions */}
        {phase === 'reveal' && (
          <>

            {isChallengeMode ? (
              <>
                {challengeComparison && (
                  <View style={styles.comparisonPanel}>
                    <View style={styles.cardInnerBorder} />
                    <Text style={styles.comparisonPanelLabel}>Challenge Results</Text>
                    <View style={styles.comparisonRow}>
                      <Text style={styles.comparisonKey}>Your answer</Text>
                      <Text style={styles.comparisonVal}>
                        {selected !== null ? truncateCompletion(question.panelists[selected].completion) : '—'}
                      </Text>
                    </View>
                    <View style={styles.comparisonRow}>
                      <Text style={styles.comparisonKey}>{challengeSenderName ?? 'Sender'}'s answer</Text>
                      <Text style={styles.comparisonVal}>
                        {truncateCompletion(question.panelists[parseInt(challengeComparison.senderAnswer, 10)]?.completion ?? challengeComparison.senderAnswer)}
                      </Text>
                    </View>
                    <View style={styles.comparisonRow}>
                      <Text style={styles.comparisonKey}>Their prediction</Text>
                      <Text style={styles.comparisonVal}>
                        {truncateCompletion(question.panelists[parseInt(challengeComparison.senderPrediction, 10)]?.completion ?? challengeComparison.senderPrediction)}{' '}
                        {challengeComparison.senderPrediction === String(selected) ? '✓' : '✗'}
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
                  <View style={styles.comparisonPanel}>
                    <View style={styles.cardInnerBorder} />
                    <Text style={styles.helpSentHeading}>Help Sent</Text>
                    <Text style={[styles.infoText, { textAlign: 'center' }]}>
                      Your answer has been sent to {helpAskerName || 'your friend'}.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {!isChallengeMode && !isHelpMode && (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => requireAuth(() => setShowChallenge(true))}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryBtnText}>Challenge a Friend to This One</Text>
                  </TouchableOpacity>
                )}
                {!isHelpMode && (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={handlePlayAgain}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.secondaryBtnText}>Play Again</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}

        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Home</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Noodle Bowl · N° 01 · The Lede</Text>
        </View>
      </ScrollView>

      <ChallengeModal
        visible={showChallenge}
        onClose={() => setShowChallenge(false)}
        correct={revealData?.correct ?? false}
        predictLabel="Which ending do you think they'll pick?"
        predictOptions={question ? orderedPanelists.map(({ panelist, originalIdx }) => ({
          label: truncateCompletion(panelist.completion),
          value: String(originalIdx),
        })) : []}
        buildChallengeUrl={async (friendName, prediction) => {
          const result = await createChallenge({
            gameId: 'lede',
            questionIndex: questionIdx,
            senderPrediction: prediction,
            senderAnswer: selected !== null ? String(selected) : '',
            senderName: user?.displayName ?? 'A Friend',
            senderPushToken: getCachedPushToken(),
          });
          Analytics.challengeSent('lede');
          return { url: result.url, token: result.token };
        }}
        onSent={(prediction, friendName, token) => addFriendInteraction({
          type: 'sent_challenge',
          friendName,
          gameId: 'lede',
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
            <Text style={styles.modalSubtitle}>They'll answer the same puzzle — you'll see what they pick.</Text>

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
  kicker: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 12,
  },
  headlineText: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 22,
    color: C.ink,
    lineHeight: 30,
    marginBottom: 20,
  },
  blankPill: {
    color: C.ink,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  choiceHeading: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 12,
  },
  choiceList: {
    gap: 10,
    marginBottom: 24,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.paper,
    shadowColor: C.paperDarker,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  choiceRowSelected: {
    backgroundColor: C.ink,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  choiceRowCorrect: {
    backgroundColor: C.green,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  choiceRowWrong: {
    backgroundColor: C.accent,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  choiceBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: C.paperDarker,
  },
  choiceBarSelected: {
    backgroundColor: C.accent,
  },
  choiceBarOnColor: {
    backgroundColor: C.onDark,
  },
  choiceBody: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  choiceText: {
    fontFamily: F.frauncesItalic,
    fontSize: 16,
    color: C.ink,
    lineHeight: 22,
  },
  choiceTextSelected: {
    color: C.onDark,
  },
  choiceLetter: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    paddingRight: 14,
  },
  choiceLetterSelected: {
    color: C.onDarkDim,
  },
  choiceIndicator: {
    fontFamily: F.monoBold,
    fontSize: 18,
    paddingRight: 14,
    minWidth: 32,
    textAlign: 'right',
  },
  choiceIndicatorOnColor: {
    color: C.onDark,
  },
  infoBox: {
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    backgroundColor: C.paperDark,
    padding: 14,
    marginBottom: 16,
  },
  infoText: {
    fontFamily: F.frauncesItalic,
    fontSize: 14,
    color: C.ink,
    lineHeight: 20,
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
    marginBottom: 12,
    paddingVertical: 4,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
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
    fontSize: 22,
  },
  resultCorrect: {
    color: C.green,
  },
  resultWrong: {
    color: C.accent,
  },
  resultDivider: {
    fontFamily: F.fraunces,
    fontSize: 16,
    color: C.muted,
    marginHorizontal: 2,
  },
  resultPoints: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 18,
    color: C.ink,
  },
  comparisonPanel: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 20,
    marginBottom: 16,
    ...cardShadow,
  },
  comparisonPanelLabel: {
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
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: C.paperDarker,
  },
  comparisonKey: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    flex: 1,
  },
  comparisonVal: {
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
