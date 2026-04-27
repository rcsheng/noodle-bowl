import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChallengeModal } from '@/components/ChallengeModal';
import { ChallengeSignUpBanner } from '@/components/ChallengeSignUpBanner';
import { CopiedToast } from '@/components/CopiedToast';
import { Masthead } from '@/components/Masthead';
import { SpreadItem } from '@/constants/data';
import { C, F, cardShadow } from '@/constants/theme';
import { copyToClipboard, pickFromBank, scoreSpread } from '@/constants/utils';
import { useAuth } from '@/context/AuthContext';
import { useContent } from '@/context/ContentContext';
import { useGame } from '@/context/GameContext';
import { AuthGateModal } from '@/components/AuthGateModal';
import { useAuthGate } from '@/lib/authGuard';
import { createChallenge, respondToChallenge } from '@/lib/challengeApi';
import { createHelp, respondToHelp } from '@/lib/helpApi';
import { getCachedPushToken } from '@/lib/pushTokens';
import { ChallengeRespondOutput, HelpRespondOutput } from '@/packages/shared/types';

type Phase = 'guess' | 'reveal';

interface RevealData {
  correct: boolean;
  points: number;
  deviation: number;
  prevStreak: number;
}

export default function SpreadScreen() {
  const { user, isAnonymous } = useAuth();
  const { state, isLoaded, updateGameStats, setSeen, addFriendInteraction } = useGame();
  const { banks } = useContent();
  const { requireAuth, authGateVisible, dismissAuthGate } = useAuthGate();
  const started = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const {
    challengeToken,
    challengeQuestionIndex,
    challengeSenderName,
    challengeSenderPrediction,
    helpToken: helpTokenParam,
    helpQuestionIndex,
    helpAskerName,
  } = useLocalSearchParams<{
    challengeToken?: string;
    challengeQuestionIndex?: string;
    challengeSenderName?: string;
    challengeSenderPrediction?: string;
    helpToken?: string;
    helpQuestionIndex?: string;
    helpAskerName?: string;
  }>();
  const isChallengeMode = !!challengeToken;
  const isHelpMode = !!helpTokenParam;

  const [question, setQuestion] = useState<SpreadItem | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('guess');
  const [input, setInput] = useState('');
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [showFriend, setShowFriend] = useState(false);
  const [helpUrl, setHelpUrl] = useState('');
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpToken, setHelpToken] = useState<string | null>(null);
  const [showChallenge, setShowChallenge] = useState(false);
  const [helpCopied, setHelpCopied] = useState(false);
  const [challengeComparison, setChallengeComparison] = useState<ChallengeRespondOutput | null>(null);
  const [helpRespondResult, setHelpRespondResult] = useState<HelpRespondOutput | null>(null);
  const [signUpBannerDismissed, setSignUpBannerDismissed] = useState(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;
    if (isChallengeMode && challengeQuestionIndex !== undefined) {
      const idx = parseInt(challengeQuestionIndex, 10);
      setQuestion(banks.spread[idx]);
      setQuestionIdx(idx);
    } else if (isHelpMode && helpQuestionIndex !== undefined) {
      const idx = parseInt(helpQuestionIndex, 10);
      setQuestion(banks.spread[idx]);
      setQuestionIdx(idx);
    } else {
      const { idx, item, newSeen } = pickFromBank(banks.spread, state.seen.spread);
      setSeen('spread', newSeen);
      setQuestion(item);
      setQuestionIdx(idx);
    }
  }, [isLoaded]);

  const handleSubmit = async () => {
    if (!question) return;
    const guess = parseFloat(input.replace(/,/g, ''));
    if (isNaN(guess)) return;
    const { correct, points, deviation } = scoreSpread(guess, question.answer);
    const prevStreak = state.stats.spread.streak;
    setRevealData({ correct, points, deviation, prevStreak });
    updateGameStats('spread', correct, points);
    setPhase('reveal');

    if (isChallengeMode && challengeToken && !challengeComparison) {
      try {
        const comparison = await respondToChallenge({ token: challengeToken, friendAnswer: String(guess) });
        setChallengeComparison(comparison);
      } catch {
        // ignore — user still sees their result
      }
    }

    if (isHelpMode && helpTokenParam && !helpRespondResult) {
      try {
        const result = await respondToHelp({ token: helpTokenParam, helperAnswer: String(guess) });
        setHelpRespondResult(result);
      } catch {
        // ignore
      }
    }
  };

  const handlePlayAgain = () => {
    const { idx, item, newSeen } = pickFromBank(banks.spread, state.seen.spread);
    setSeen('spread', newSeen);
    setQuestion(item);
    setQuestionIdx(idx);
    setPhase('guess');
    setInput('');
    setRevealData(null);
    setHelpUrl('');
    setHelpToken(null);
  };

  const handleOpenHelp = async () => {
    if (helpUrl) {
      setShowFriend(true);
      return;
    }
    setShowFriend(true);
    setHelpLoading(true);
    try {
      const result = await createHelp({
        gameId: 'spread',
        questionIndex: questionIdx,
        askerName: null,
        askerPushToken: getCachedPushToken(),
      });
      setHelpUrl(result.url);
      setHelpToken(result.token);
    } catch {
      setHelpUrl('');
    } finally {
      setHelpLoading(false);
    }
  };

  const handleShare = async () => {
    const result = await Share.share({ message: `Can you help me with this question on Noodle Bowl? ${helpUrl}` });
    if (result.action === Share.sharedAction) {
      addFriendInteraction({ type: 'sent_help', friendName: 'A Friend', gameId: 'spread', questionIndex: questionIdx, shieldEarned: false, token: helpToken ?? undefined });
    }
  };

  const handleCopyHelp = async () => {
    const copied = await copyToClipboard(helpUrl);
    if (copied) {
      setHelpCopied(true);
      setTimeout(() => setHelpCopied(false), 2000);
    }
  };

  if (!question) return null;

  const guessNum = phase === 'reveal' ? parseFloat(input.replace(/,/g, '')) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Masthead />

          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back to Games</Text>
          </TouchableOpacity>

          <View style={styles.labelRow}>
            <Text style={styles.label}>The Spread</Text>
            <View style={styles.labelLine} />
          </View>

          <View style={styles.card}>
            <View style={styles.cardInnerBorder} />
            <Text style={styles.questionText}>{question.question}</Text>
          </View>

          {phase === 'guess' ? (
            <>
              <View style={styles.inputCard}>
                <View style={styles.cardInnerBorder} />
                <Text style={styles.inputLabel}>Your Answer</Text>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  keyboardType="numeric"
                  placeholder="Enter a number"
                  placeholderTextColor={C.muted}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
                />
                <Text style={styles.unitLabel}>{question.unit}</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, !input.trim() && styles.primaryBtnDisabled]}
                onPress={handleSubmit}
                disabled={!input.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Submit Guess</Text>
              </TouchableOpacity>

              {!isChallengeMode && !isHelpMode && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => requireAuth(handleOpenHelp)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryBtnText}>Stuck? Ask a Friend</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <View style={styles.comparisonCard}>
                <View style={styles.cardInnerBorder} />
                <View style={styles.comparisonRow}>
                  <View style={styles.comparisonBlock}>
                    <Text style={styles.comparisonLabel}>Your Guess</Text>
                    <Text style={styles.comparisonValue}>
                      {guessNum.toLocaleString()}
                    </Text>
                    <Text style={styles.comparisonUnit}>{question.unit}</Text>
                  </View>
                  <View style={styles.comparisonDivider} />
                  <View style={styles.comparisonBlock}>
                    <Text style={styles.comparisonLabel}>The Answer</Text>
                    <Text style={[styles.comparisonValue, styles.comparisonTruth]}>
                      {question.answer.toLocaleString()}
                    </Text>
                    <Text style={styles.comparisonUnit}>{question.unit}</Text>
                  </View>
                </View>

                {revealData && (
                  <View style={styles.deviationRow}>
                    <Text style={styles.deviationText}>
                      {revealData.deviation < 0.5
                        ? 'Exact!'
                        : `${revealData.deviation.toFixed(1)}% off`}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>{question.explanation}</Text>
              </View>

              {revealData && (
                <View style={styles.resultCard}>
                  <View style={styles.cardInnerBorder} />
                  <Text
                    style={[
                      styles.resultVerdict,
                      revealData.correct ? styles.resultCorrect : styles.resultWrong,
                    ]}
                  >
                    {revealData.deviation <= 5
                      ? 'Nailed It'
                      : revealData.deviation <= 15
                      ? 'Close!'
                      : revealData.deviation <= 30
                      ? 'In Range'
                      : 'Way Off'}
                  </Text>
                  <Text style={styles.resultPoints}>
                    {revealData.points > 0 ? `+${revealData.points} pts` : '0 pts'}
                  </Text>
                </View>
              )}

              {isChallengeMode && challengeComparison ? (
                <>
                  <View style={styles.challengePanel}>
                    <View style={styles.cardInnerBorder} />
                    <Text style={styles.challengePanelLabel}>Challenge Results</Text>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>Your answer</Text>
                      <Text style={styles.challengeVal}>{input}</Text>
                    </View>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>{challengeSenderName ?? 'Sender'}'s answer</Text>
                      <Text style={styles.challengeVal}>{challengeComparison.senderAnswer}</Text>
                    </View>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>Their prediction</Text>
                      <Text style={styles.challengeVal}>
                        {challengeSenderPrediction}{' '}
                        {challengeSenderPrediction === input ? '✓' : '✗'}
                      </Text>
                    </View>
                  </View>
                {isAnonymous && !signUpBannerDismissed && (
                  <ChallengeSignUpBanner
                    senderName={challengeSenderName ?? 'your friend'}
                    onCreateAccount={() => router.push('/auth/sign-up')}
                    onDismiss={() => setSignUpBannerDismissed(true)}
                  />
                )}
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryBtnText}>Back to Games</Text>
                  </TouchableOpacity>
                </>
              ) : isHelpMode && helpRespondResult ? (
                <>
                  <View style={styles.challengePanel}>
                    <View style={styles.cardInnerBorder} />
                    <Text style={styles.challengePanelLabel}>Help Sent</Text>
                    <Text style={styles.infoText}>
                      Your answer has been sent to {helpAskerName || 'your friend'}.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryBtnText}>Back to Games</Text>
                  </TouchableOpacity>
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

                  <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back to Games</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Noodle Bowl · N° 02 · The Spread</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ChallengeModal
        visible={showChallenge}
        onClose={() => setShowChallenge(false)}
        correct={revealData?.correct ?? false}
        predictLabel="What do you think they'll guess?"
        buildChallengeUrl={async (friendName, prediction) => {
          const result = await createChallenge({
            gameId: 'spread',
            questionIndex: questionIdx,
            senderPrediction: prediction,
            senderAnswer: input,
            senderName: user?.displayName ?? 'A Friend',
            senderPushToken: getCachedPushToken(),
          });
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
                {helpLoading ? 'Generating link…' : helpUrl || 'Could not generate link'}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.paper,
  },
  flex: {
    flex: 1,
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  card: {
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
  inputCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 24,
    marginBottom: 16,
    ...cardShadow,
  },
  inputLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 12,
  },
  input: {
    fontFamily: F.frauncesXBold,
    fontSize: 32,
    color: C.ink,
    borderBottomWidth: 2,
    borderBottomColor: C.rule,
    paddingVertical: 8,
    marginBottom: 8,
  },
  unitLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
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
  comparisonCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 24,
    marginBottom: 16,
    ...cardShadow,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonBlock: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonDivider: {
    width: 1,
    height: 60,
    backgroundColor: C.paperDarker,
    marginHorizontal: 8,
  },
  comparisonLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 4,
  },
  comparisonValue: {
    fontFamily: F.frauncesXBold,
    fontSize: 26,
    color: C.ink,
  },
  comparisonTruth: {
    color: C.green,
  },
  comparisonUnit: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.muted,
    marginTop: 2,
  },
  deviationRow: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.paperDarker,
    paddingTop: 12,
    alignItems: 'center',
  },
  deviationText: {
    fontFamily: F.monoBold,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.accentWarm,
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
  resultCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    ...cardShadow,
  },
  resultVerdict: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 36,
    marginBottom: 4,
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
