import { copyToClipboard, formatAttribution, pickFromBank } from '@/constants/utils';
import { BankExhaustedModal } from '@/components/BankExhaustedModal';
import { StreakCelebrationModal } from '@/components/StreakCelebrationModal';
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
import { CopiedToast } from '@/components/CopiedToast';
import { FirstShieldEarnedModal } from '@/components/FirstShieldEarnedModal';
import { ShieldEarnedToast } from '@/components/ShieldEarnedToast';
import { ShieldPrimerModal } from '@/components/ShieldPrimerModal';
import { ShieldSignUpBanner } from '@/components/ShieldSignUpBanner';
import { SpreadItem } from '@/constants/data';
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
import { buildChoicesForItem } from '@/lib/spreadChoices';
import { ChallengeRespondOutput, HelpRespondOutput } from '@/packages/shared/types';

type Phase = 'play' | 'reveal';

interface RevealData {
  correct: boolean;
  selected: number;
}

export default function SpreadScreen() {
  const { user, isAnonymous } = useAuth();
  const { state, isLoaded, updateGameStats, setSeen, addFriendInteraction, earnStreakShield, dismissOnboardingFlag } = useGame();
  const { banks, contentWeek, isLoading: contentLoading } = useContent();
  const { requireAuth, authGateVisible, dismissAuthGate } = useAuthGate();
  const started = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
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

  const [question, setQuestion] = useState<SpreadItem | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('play');
  const [choices, setChoices] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
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

  const loadQuestion = (item: SpreadItem) => {
    setChoices(buildChoicesForItem(item));
    setSelected(null);
    setPhase('play');
    setRevealData(null);
  };

  useEffect(() => {
    if (!isLoaded || contentLoading || started.current) return;
    started.current = true;
    if (isChallengeMode && challengeQuestionIndex !== undefined) {
      const idx = parseInt(challengeQuestionIndex, 10);
      const item = banks.spread[idx];
      if (!item) { router.replace('/'); return; }
      setQuestion(item);
      setQuestionIdx(idx);
      loadQuestion(item);
    } else if (isHelpMode && helpQuestionIndex !== undefined) {
      const idx = parseInt(helpQuestionIndex, 10);
      const item = banks.spread[idx];
      if (!item) { router.replace('/'); return; }
      setQuestion(item);
      setQuestionIdx(idx);
      loadQuestion(item);
    } else {
      const result = pickFromBank(banks.spread, state.seen.spread);
      if (result.exhausted) { setBankExhausted(true); return; }
      setSeen('spread', result.newSeen);
      setQuestion(result.item);
      setQuestionIdx(result.idx);
      loadQuestion(result.item);
    }
  }, [isLoaded, contentLoading]);

  const handleLockIn = () => {
    if (!question || selected === null) return;
    const correct = selected === question.answer;
    setRevealData({ correct, selected });
    updateGameStats('spread', correct);
    Analytics.gameComplete('spread', correct);
    setPhase('reveal');

    if (isChallengeMode && challengeToken && !challengeComparison) {
      respondToChallenge({ token: challengeToken, friendAnswer: String(selected) })
        .then(comparison => {
          setChallengeComparison(comparison);
          addFriendInteraction({
            type: 'received_challenge',
            friendName: challengeSenderName ?? 'A Friend',
            gameId: 'spread',
            questionIndex: questionIdx,
            shieldEarned: true,
          });
          handleShieldEarned();
        })
        .catch(() => {});
    }

    if (isHelpMode && helpTokenParam && !helpRespondResult) {
      respondToHelp({ token: helpTokenParam, helperAnswer: String(selected) })
        .then(result => {
          setHelpRespondResult(result);
          addFriendInteraction({
            type: 'gave_help',
            friendName: helpAskerName || 'A Friend',
            gameId: 'spread',
            questionIndex: questionIdx,
            shieldEarned: true,
          });
          handleShieldEarned();
        })
        .catch(() => {});
    }
  };

  const handlePlayAgain = () => {
    const result = pickFromBank(banks.spread, state.seen.spread);
    if (result.exhausted) { setBankExhausted(true); return; }
    setSeen('spread', result.newSeen);
    setQuestion(result.item);
    setQuestionIdx(result.idx);
    loadQuestion(result.item);
    setHelpUrl('');
    setHelpError(false);
    setHelpToken(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
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
        gameId: 'spread',
        questionIndex: questionIdx,
        contentWeek,
        askerName: null,
        askerPushToken: getCachedPushToken(),
      });
      setHelpUrl(result.url);
      setHelpToken(result.token);
      Analytics.helpSent('spread');
      addFriendInteraction({ type: 'sent_help', friendName: 'A Friend', gameId: 'spread', questionIndex: questionIdx, shieldEarned: false, token: result.token });
    } catch (err) {
      logger.error('[spread] createHelp failed', err);
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

  if (bankExhausted) {
    return (
      <BankExhaustedModal
        visible
        gameName="Spread"
        onDismiss={() => router.replace('/')}
      />
    );
  }

  if (!question) return null;

  const CHOICE_LETTERS = ['A', 'B', 'C', 'D'];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <CompactMasthead />

        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Home</Text>
        </TouchableOpacity>

        <View style={styles.labelRow}>
          <Text style={styles.label}>The Spread</Text>
          <View style={styles.labelLine} />
        </View>

        {/* Question — always visible */}
        <View style={styles.questionCard}>
          <View style={styles.cardInnerBorder} />
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        {/* Play phase — multiple choice */}
        {phase === 'play' && (
          <>
            <Text style={styles.choiceKicker}>TAP TO CHOOSE</Text>
            <View style={styles.choiceList}>
              {choices.map((choice, i) => {
                const isSelected = selected === choice;
                return (
                  <TouchableOpacity
                    key={choice}
                    testID={`spread-choice-${i}`}
                    style={[styles.choiceRow, isSelected && styles.choiceRowSelected]}
                    onPress={() => setSelected(choice)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.choiceBar, isSelected && styles.choiceBarSelected]} />
                    <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>
                      {choice.toLocaleString()}
                    </Text>
                    <Text style={[styles.choiceLetter, isSelected && styles.choiceLetterSelected]}>
                      {CHOICE_LETTERS[i]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, selected === null && styles.primaryBtnDisabled]}
              onPress={handleLockIn}
              disabled={selected === null}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {selected === null
                  ? 'LOCK IN'
                  : `LOCK IN ${CHOICE_LETTERS[choices.indexOf(selected)]}`}
              </Text>
            </TouchableOpacity>

            {!isChallengeMode && !isHelpMode && (
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
            {/* Answer choices — locked state */}
            <View style={styles.choiceList}>
              {choices.map((choice, i) => {
                const isCorrect = choice === question.answer;
                const wasPicked = choice === revealData.selected;
                const style = isCorrect
                  ? styles.choiceRowCorrect
                  : wasPicked
                  ? styles.choiceRowWrong
                  : null;
                return (
                  <View
                    key={choice}
                    style={[styles.choiceRow, style]}
                  >
                    <View style={[
                      styles.choiceBar,
                      isCorrect && styles.choiceBarCorrect,
                      wasPicked && !isCorrect && styles.choiceBarWrong,
                    ]} />
                    <Text style={[
                      styles.choiceText,
                      (isCorrect || wasPicked) && styles.choiceTextSelected,
                    ]}>
                      {choice.toLocaleString()}
                    </Text>
                    <Text style={[
                      styles.choiceIndicator,
                      (isCorrect || wasPicked) && styles.choiceIndicatorOnColor,
                    ]}>
                      {isCorrect ? '✓' : wasPicked ? '✗' : ''}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Result card */}
            <View style={styles.resultCard}>
              <View style={styles.cardInnerBorder} />
              <Text style={[styles.resultVerdict, revealData.correct ? styles.resultCorrect : styles.resultWrong]}>
                {revealData.correct ? 'Correct' : 'Incorrect'}
              </Text>
            </View>

            {/* Explanation */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{question.explanation}</Text>
              {formatAttribution(question.sourceHint, question.eventDate) && (
                <Text style={styles.eventDate} numberOfLines={1}>
                  {formatAttribution(question.sourceHint, question.eventDate)}
                </Text>
              )}
            </View>

            {isChallengeMode ? (
              <>
                {challengeComparison && (
                  <View style={styles.challengePanel}>
                    <View style={styles.cardInnerBorder} />
                    <Text style={styles.challengePanelLabel}>Challenge Results</Text>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>Your pick</Text>
                      <Text style={styles.challengeVal}>{revealData.selected.toLocaleString()}</Text>
                    </View>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>{challengeSenderName ?? 'Sender'}'s pick</Text>
                      <Text style={styles.challengeVal}>{challengeComparison.senderAnswer}</Text>
                    </View>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>Their prediction</Text>
                      <Text style={styles.challengeVal}>
                        {challengeComparison.senderPrediction}{' '}
                        {challengeComparison.senderPrediction === String(revealData.selected) ? '✓' : '✗'}
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
                    <Text style={[styles.infoText, { textAlign: 'center' }]}>
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
          <Text style={styles.footerText}>Noodle Bowl · N° 02 · The Spread</Text>
        </View>
      </ScrollView>

      <ChallengeModal
        visible={showChallenge}
        onClose={() => setShowChallenge(false)}
        correct={revealData?.correct ?? false}
        predictLabel="Which option do you think they'll pick?"
        predictOptions={question ? choices.map(c => ({
          label: `${c.toLocaleString()}`,
          value: String(c),
        })) : []}
        buildChallengeUrl={async (friendName, prediction) => {
          const result = await createChallenge({
            gameId: 'spread',
            questionIndex: questionIdx,
            senderPrediction: prediction,
            senderAnswer: String(revealData?.selected ?? ''),
            senderName: user?.displayName ?? 'A Friend',
            senderPushToken: getCachedPushToken(),
          });
          Analytics.challengeSent('spread');
          return { url: result.url, token: result.token };
        }}
        onSent={(prediction, friendName, token) => addFriendInteraction({
          type: 'sent_challenge',
          friendName,
          gameId: 'spread',
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginRight: 12,
  },
  labelLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.paperDarker,
  },
  questionCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 24,
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
  questionText: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 20,
    color: C.ink,
    lineHeight: 28,
  },
  choiceKicker: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 12,
  },
  choiceList: {
    gap: 10,
    marginBottom: 20,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.paperDarker,
    overflow: 'hidden',
  },
  choiceRowSelected: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  choiceRowCorrect: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  choiceRowWrong: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  choiceBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: C.paperDarker,
  },
  choiceBarSelected: {
    backgroundColor: C.accent,
  },
  choiceBarCorrect: {
    backgroundColor: C.onDark,
  },
  choiceBarWrong: {
    backgroundColor: C.onDark,
  },
  choiceText: {
    flex: 1,
    fontFamily: F.fraunces,
    fontSize: 16,
    color: C.ink,
    lineHeight: 22,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  choiceTextSelected: {
    color: C.onDark,
  },
  choiceLetter: {
    fontFamily: F.mono,
    fontSize: 10,
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
