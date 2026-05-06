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
import { ShieldEarnedToast } from '@/components/ShieldEarnedToast';
import { ShieldSignUpBanner } from '@/components/ShieldSignUpBanner';
import { PANEL, QuipPrompt } from '@/constants/data';
import { C, F, cardShadow } from '@/constants/theme';
import { copyToClipboard, pickFromBank } from '@/constants/utils';
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

type Phase = 'play' | 'judging' | 'result';

const MAX_CHARS = 180;

interface JudgeResult {
  name: string;
  role: string;
  initial: string;
  reaction: string;
  liked: boolean;
}

function getReaction(panelist: typeof PANEL[0], quip: string): { reaction: string; liked: boolean } {
  const len = quip.trim().length;
  const hasQuestion = quip.includes('?');
  const exclamations = (quip.match(/!/g) || []).length;

  let tier: 'like' | 'meh' | 'hate';
  if (len < 20 || exclamations >= 3) {
    tier = panelist.role === 'The Chaos Agent' ? 'like' : 'hate';
  } else if (len > 120 || hasQuestion) {
    tier = panelist.role === 'The Cynics' ? 'like' : 'meh';
  } else {
    const roll = Math.random();
    tier = roll < 0.5 ? 'like' : roll < 0.8 ? 'meh' : 'hate';
  }

  const pool =
    tier === 'like'
      ? panelist.likeReactions
      : tier === 'meh'
      ? panelist.mehReactions
      : panelist.hateReactions;

  return {
    reaction: pool[Math.floor(Math.random() * pool.length)],
    liked: tier === 'like',
  };
}

export default function QuipScreen() {
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

  const [prompt, setPrompt] = useState<QuipPrompt | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [quip, setQuip] = useState('');
  const [phase, setPhase] = useState<Phase>('play');
  const [judgeResults, setJudgeResults] = useState<JudgeResult[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [showFriend, setShowFriend] = useState(false);
  const [helpUrl, setHelpUrl] = useState('');
  const [helpError, setHelpError] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpToken, setHelpToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
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
      const item = banks.quip[idx];
      if (!item) { router.replace('/'); return; }
      setPrompt(item);
      setQuestionIdx(idx);
    } else if (isHelpMode && helpQuestionIndex !== undefined) {
      const idx = parseInt(helpQuestionIndex, 10);
      const item = banks.quip[idx];
      if (!item) { router.replace('/'); return; }
      setPrompt(item);
      setQuestionIdx(idx);
    } else {
      const { idx, item, newSeen } = pickFromBank(banks.quip, state.seen.quip);
      setSeen('quip', newSeen);
      setPrompt(item);
      setQuestionIdx(idx);
    }
  }, [isLoaded]);

  const handleSubmit = () => {
    if (!quip.trim() || !prompt) return;
    setPhase('judging');

    const results: JudgeResult[] = PANEL.map((p) => {
      const { reaction, liked } = getReaction(p, quip);
      return { name: p.name, role: p.role, initial: p.initial, reaction, liked };
    });
    setJudgeResults(results);

    let delay = 300;
    results.forEach((_, i) => {
      setTimeout(() => {
        setRevealedCount(i + 1);
        if (i === results.length - 1) {
          const likes = results.filter((r) => r.liked).length;
          const earned = likes === 3 ? 30 : likes === 2 ? 20 : likes === 1 ? 10 : 0;
          setPoints(earned);
          updateGameStats('quip', likes >= 2, earned);
          Analytics.gameComplete('quip', likes >= 2, earned);
          setTimeout(async () => {
            setPhase('result');
            if (isChallengeMode && challengeToken && !challengeComparison) {
              try {
                const comparison = await respondToChallenge({ token: challengeToken, friendAnswer: quip.trim() });
                setChallengeComparison(comparison);
                addFriendInteraction({
                  type: 'received_challenge',
                  friendName: challengeSenderName ?? 'A Friend',
                  gameId: 'quip',
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
                const result = await respondToHelp({ token: helpTokenParam, helperAnswer: quip.trim() });
                setHelpRespondResult(result);
                addFriendInteraction({
                  type: 'gave_help',
                  friendName: helpAskerName || 'A Friend',
                  gameId: 'quip',
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
          }, 400);
        }
      }, delay + i * 700);
    });
  };

  const handlePlayAgain = () => {
    const { idx, item, newSeen } = pickFromBank(banks.quip, state.seen.quip);
    setSeen('quip', newSeen);
    setPrompt(item);
    setQuestionIdx(idx);
    setQuip('');
    setPhase('play');
    setJudgeResults([]);
    setRevealedCount(0);
    setPoints(0);
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
        gameId: 'quip',
        questionIndex: questionIdx,
        askerName: null,
        askerPushToken: getCachedPushToken(),
      });
      setHelpUrl(result.url);
      setHelpToken(result.token);
      Analytics.helpSent('quip');
      addFriendInteraction({ type: 'sent_help', friendName: 'A Friend', gameId: 'quip', questionIndex: questionIdx, shieldEarned: false, token: result.token });
    } catch (err) {
      logger.error('[quip] createHelp failed', err);
      setHelpError(true);
    } finally {
      setHelpLoading(false);
    }
  };

  const handleCopy = async () => {
    const copied = await copyToClipboard(helpUrl);
    if (copied) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    await Share.share({ message: `Can you help me with this question on Noodle Bowl? ${helpUrl}` });
  };

  if (!prompt) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Masthead />

          {phase === 'play' && (
            <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
              <Text style={styles.backText}>← Back to Home</Text>
            </TouchableOpacity>
          )}

          <View style={styles.labelRow}>
            <Text style={styles.label}>The Quip</Text>
            <View style={styles.labelLine} />
          </View>

          <View style={styles.promptCard}>
            <View style={styles.cardInnerBorder} />
            <Text style={styles.sourceHint}>{prompt.sourceHint}</Text>
            <Text style={styles.setupText}>{prompt.setup}</Text>
          </View>

          {phase === 'play' && (
            <>
              <View style={styles.inputCard}>
                <View style={styles.cardInnerBorder} />
                <TextInput
                  style={styles.input}
                  value={quip}
                  onChangeText={(t) => setQuip(t.slice(0, MAX_CHARS))}
                  multiline
                  placeholder="Your answer goes here..."
                  placeholderTextColor={C.muted}
                  textAlignVertical="top"
                />
                <Text style={styles.charCounter}>
                  {quip.length}/{MAX_CHARS}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, !quip.trim() && styles.primaryBtnDisabled]}
                onPress={handleSubmit}
                disabled={!quip.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Submit to Panel</Text>
              </TouchableOpacity>

              {!isChallengeMode && !isHelpMode && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => requireAuth(handleOpenHelp)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryBtnText}>Ask a Friend for Help</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {(phase === 'judging' || phase === 'result') && (
            <>
              <View style={styles.quipPreviewBox}>
                <Text style={styles.quipPreviewLabel}>Your quip</Text>
                <Text style={styles.quipPreviewText}>{quip}</Text>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>The Panel</Text>
                <View style={styles.sectionLine} />
              </View>

              {judgeResults.slice(0, revealedCount).map((r, i) => (
                <View key={i} style={styles.judgeCard}>
                  <View style={styles.cardInnerBorder} />
                  <View style={styles.judgeHeader}>
                    <View style={[styles.judgeInitial, r.liked ? styles.judgeInitialLike : styles.judgeInitialMeh]}>
                      <Text style={styles.judgeInitialText}>{r.initial}</Text>
                    </View>
                    <View style={styles.judgeNameBlock}>
                      <Text style={styles.judgeName}>{r.name}</Text>
                      <Text style={styles.judgeRole}>{r.role}</Text>
                    </View>
                    <Text style={styles.judgeEmoji}>{r.liked ? '✓' : '—'}</Text>
                  </View>
                  <Text style={styles.judgeReaction}>{r.reaction}</Text>
                </View>
              ))}

              {phase === 'judging' && revealedCount < PANEL.length && (
                <View style={styles.judgingIndicator}>
                  <Text style={styles.judgingText}>Deliberating...</Text>
                </View>
              )}
            </>
          )}

          {phase === 'result' && (
            <>
              <View style={styles.resultCard}>
                <View style={styles.cardInnerBorder} />
                <Text style={styles.resultVerdict}>
                  {judgeResults.filter((r) => r.liked).length === 3
                    ? 'Unanimous!'
                    : judgeResults.filter((r) => r.liked).length === 2
                    ? 'Majority Wins'
                    : judgeResults.filter((r) => r.liked).length === 1
                    ? 'One Fan'
                    : 'Tough Room'}
                </Text>
                <Text style={styles.resultDivider}> · </Text>
                <Text style={styles.resultPoints}>+{points} pts</Text>
              </View>

              {isChallengeMode ? (
                <>
                  {challengeComparison && (
                    <View style={styles.challengePanel}>
                      <View style={styles.cardInnerBorder} />
                      <Text style={styles.challengePanelLabel}>Challenge Results</Text>
                      <View style={styles.challengeRow}>
                        <Text style={styles.challengeKey}>Your quip</Text>
                        <Text style={styles.challengeVal}>{quip.trim()}</Text>
                      </View>
                      <View style={styles.challengeRow}>
                        <Text style={styles.challengeKey}>{challengeSenderName ?? 'Sender'}'s quip</Text>
                        <Text style={styles.challengeVal}>{challengeComparison.senderAnswer}</Text>
                      </View>
                      <View style={styles.challengeRow}>
                        <Text style={styles.challengeKey}>Their prediction</Text>
                        <Text style={styles.challengeVal}>
                          {challengeComparison.senderPrediction} likes{' '}
                          {challengeComparison.senderPrediction === String(judgeResults.filter(r => r.liked).length) ? '✓' : '✗'}
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
                  <View style={styles.challengePanel}>
                    <View style={styles.cardInnerBorder} />
                    <Text style={styles.helpSentHeading}>Help Sent</Text>
                    <Text style={[styles.judgeReaction, { textAlign: 'center' }]}>
                      Your answer has been sent to {helpAskerName || 'your friend'}.
                    </Text>
                  </View>
                  {isAnonymous && !shieldSignUpDismissed && (
                    <ShieldSignUpBanner
                      onCreateAccount={() => router.push({ pathname: '/auth/sign-up', params: { from: 'reveal' } })}
                      onSignIn={() => router.push({ pathname: '/auth/sign-in', params: { from: 'reveal' } })}
                      onDismiss={() => setShieldSignUpDismissed(true)}
                    />
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
            <Text style={styles.footerText}>Noodle Bowl · N° 05 · The Quip</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ChallengeModal
        visible={showChallenge}
        onClose={() => setShowChallenge(false)}
        correct={judgeResults.filter(r => r.liked).length >= 2}
        predictLabel="How many judges do you think will like it?"
        predictOptions={[
          { label: 'None', value: '0' },
          { label: '1 out of 3', value: '1' },
          { label: '2 out of 3', value: '2' },
          { label: 'All 3', value: '3' },
        ]}
        buildChallengeUrl={async (friendName, prediction) => {
          const result = await createChallenge({
            gameId: 'quip',
            questionIndex: questionIdx,
            senderPrediction: prediction,
            senderAnswer: String(judgeResults.filter(r => r.liked).length),
            senderName: user?.displayName ?? 'A Friend',
            senderPushToken: getCachedPushToken(),
          });
          Analytics.challengeSent('quip');
          return { url: result.url, token: result.token };
        }}
        onSent={(prediction, friendName, token) => addFriendInteraction({
          type: 'sent_challenge',
          friendName,
          gameId: 'quip',
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

            <TouchableOpacity style={styles.urlBox} onPress={handleCopy} activeOpacity={0.7}>
              <Text style={styles.urlText}>
                {helpLoading ? 'Generating link…' : helpError ? "Couldn't reach our servers" : helpUrl}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtn} onPress={handleCopy} activeOpacity={0.85}>
              <Text style={styles.modalBtnText}>{copied ? 'Copied!' : 'Copy Link'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Text style={[styles.modalBtnText, styles.modalBtnTextSecondary]}>
                Share via Messages
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={() => setShowFriend(false)}
              activeOpacity={0.85}
            >
              <Text style={[styles.modalBtnText, styles.modalBtnTextSecondary]}>Close</Text>
            </TouchableOpacity>
          </View>
          <CopiedToast visible={copied} />
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
  promptCard: {
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
  sourceHint: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 10,
  },
  setupText: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 20,
    color: C.ink,
    lineHeight: 28,
  },
  inputCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 20,
    marginBottom: 16,
    ...cardShadow,
  },
  input: {
    fontFamily: F.fraunces,
    fontSize: 17,
    color: C.ink,
    lineHeight: 25,
    minHeight: 100,
    marginBottom: 8,
  },
  charCounter: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    textAlign: 'right',
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
  quipPreviewBox: {
    backgroundColor: C.paperDark,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    padding: 14,
    marginBottom: 20,
  },
  quipPreviewLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 6,
  },
  quipPreviewText: {
    fontFamily: F.frauncesItalic,
    fontSize: 16,
    color: C.ink,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginRight: 12,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.paperDarker,
  },
  judgeCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 18,
    marginBottom: 12,
    ...cardShadow,
  },
  judgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  judgeInitial: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  judgeInitialLike: {
    backgroundColor: C.green,
  },
  judgeInitialMeh: {
    backgroundColor: C.muted,
  },
  judgeInitialText: {
    fontFamily: F.frauncesBold,
    fontSize: 16,
    color: C.onDark,
  },
  judgeNameBlock: {
    flex: 1,
  },
  judgeName: {
    fontFamily: F.frauncesBold,
    fontSize: 14,
    color: C.ink,
  },
  judgeRole: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
  },
  judgeEmoji: {
    fontFamily: F.monoBold,
    fontSize: 14,
    color: C.muted,
  },
  judgeReaction: {
    fontFamily: F.frauncesItalic,
    fontSize: 15,
    color: C.ink,
    lineHeight: 22,
  },
  judgingIndicator: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  judgingText: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
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
    marginBottom: 20,
    ...cardShadow,
  },
  resultVerdict: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 22,
    color: C.ink,
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
    color: C.accentWarm,
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
