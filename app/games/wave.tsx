import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Modal,
    PanResponder,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChallengeModal, PredictOption } from '@/components/ChallengeModal';
import { ChallengeSignUpBanner } from '@/components/ChallengeSignUpBanner';
import { CopiedToast } from '@/components/CopiedToast';
import { FirstShieldEarnedModal } from '@/components/FirstShieldEarnedModal';
import { Masthead } from '@/components/Masthead';
import { ShieldEarnedToast } from '@/components/ShieldEarnedToast';
import { ShieldPrimerModal } from '@/components/ShieldPrimerModal';
import { BankExhaustedModal } from '@/components/BankExhaustedModal';
import { StreakCelebrationModal } from '@/components/StreakCelebrationModal';
import { ShieldSignUpBanner } from '@/components/ShieldSignUpBanner';
import { WaveItem } from '@/constants/data';
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

type Phase = 'play' | 'reveal';

interface RevealData {
  correct: boolean;
  userPosition: number;
  truthPosition: number;
}

function positionToZone(pos: number): string {
  if (pos < 33) return 'Under';
  if (pos < 67) return 'Middle';
  return 'Over';
}

function scoreWave(userPos: number, truthPos: number): { correct: boolean; points: number } {
  const distance = Math.abs(userPos - truthPos);
  let points = 0;
  if (distance <= 10) points = 20;
  else if (distance <= 20) points = 10;
  else if (distance <= 30) points = 5;
  const correct = distance <= 30;
  return { correct, points };
}

export default function WaveScreen() {
  const { user, isAnonymous } = useAuth();
  const { state, isLoaded, updateGameStats, setSeen, addFriendInteraction, earnStreakShield, dismissOnboardingFlag } = useGame();
  const { banks, contentWeek } = useContent();
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

  const [question, setQuestion] = useState<WaveItem | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('play');
  const [userPosition, setUserPosition] = useState(50);
  const [trackWidth, setTrackWidth] = useState(0);
  const [revealData, setRevealData] = useState<RevealData | null>(null);
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
  const [firstShieldModalVisible, setFirstShieldModalVisible] = useState(false);
  const [shieldPrimerVisible, setShieldPrimerVisible] = useState(false);
  const [shieldSignUpDismissed, setShieldSignUpDismissed] = useState(false);
  const [bankExhausted, setBankExhausted] = useState(false);

  const userPosRef = useRef(50);
  const trackWidthRef = useRef(0);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;
    if (isChallengeMode && challengeQuestionIndex !== undefined) {
      const idx = parseInt(challengeQuestionIndex, 10);
      const item = banks.wave[idx];
      if (!item) { router.replace('/'); return; }
      setQuestion(item);
      setQuestionIdx(idx);
    } else if (isHelpMode && helpQuestionIndex !== undefined) {
      const idx = parseInt(helpQuestionIndex, 10);
      const item = banks.wave[idx];
      if (!item) { router.replace('/'); return; }
      setQuestion(item);
      setQuestionIdx(idx);
    } else {
      const result = pickFromBank(banks.wave, state.seen.wave);
      if (result.exhausted) { setBankExhausted(true); return; }
      setSeen('wave', result.newSeen);
      setQuestion(result.item);
      setQuestionIdx(result.idx);
    }
  }, [isLoaded]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX } = evt.nativeEvent;
        const w = trackWidthRef.current;
        if (w <= 0) return;
        const pct = Math.min(100, Math.max(0, (locationX / w) * 100));
        userPosRef.current = pct;
        setUserPosition(pct);
      },
      onPanResponderMove: (evt) => {
        const { locationX } = evt.nativeEvent;
        const w = trackWidthRef.current;
        if (w <= 0) return;
        const pct = Math.min(100, Math.max(0, (locationX / w) * 100));
        userPosRef.current = pct;
        setUserPosition(pct);
      },
    })
  ).current;

  const handleLockIn = async () => {
    if (!question) return;
    const pos = userPosRef.current;
    const { correct } = scoreWave(pos, question.truthPosition);
    setRevealData({ correct, userPosition: pos, truthPosition: question.truthPosition });
    updateGameStats('wave', correct);
    Analytics.gameComplete('wave', correct);
    setPhase('reveal');

    if (isChallengeMode && challengeToken && !challengeComparison) {
      try {
        const comparison = await respondToChallenge({ token: challengeToken, friendAnswer: String(Math.round(pos)) });
        setChallengeComparison(comparison);
        addFriendInteraction({
          type: 'received_challenge',
          friendName: challengeSenderName ?? 'A Friend',
          gameId: 'wave',
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
        const result = await respondToHelp({ token: helpTokenParam, helperAnswer: String(Math.round(pos)) });
        setHelpRespondResult(result);
        addFriendInteraction({
          type: 'gave_help',
          friendName: helpAskerName || 'A Friend',
          gameId: 'wave',
          questionIndex: questionIdx,
          shieldEarned: true,
        });
        handleShieldEarned();
      } catch {
        // ignore
      }
    }
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

  const handlePlayAgain = () => {
    const result = pickFromBank(banks.wave, state.seen.wave);
    if (result.exhausted) { setBankExhausted(true); return; }
    setSeen('wave', result.newSeen);
    setQuestion(result.item);
    setQuestionIdx(result.idx);
    setPhase('play');
    setUserPosition(50);
    userPosRef.current = 50;
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
        gameId: 'wave',
        questionIndex: questionIdx,
        contentWeek,
        askerName: null,
        askerPushToken: getCachedPushToken(),
      });
      setHelpUrl(result.url);
      setHelpToken(result.token);
      Analytics.helpSent('wave');
      addFriendInteraction({ type: 'sent_help', friendName: 'A Friend', gameId: 'wave', questionIndex: questionIdx, shieldEarned: false, token: result.token });
    } catch (err) {
      logger.error('[wave] createHelp failed', err);
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

  if (bankExhausted) {
    return (
      <BankExhaustedModal
        visible
        gameName="Wave"
        onDismiss={() => router.replace('/')}
      />
    );
  }

  if (!question) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Masthead />

        {phase === 'play' && (
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
            <Text style={styles.backText}>← Back to Home</Text>
          </TouchableOpacity>
        )}

        <View style={styles.labelRow}>
          <Text style={styles.label}>The Pulse</Text>
          <View style={styles.labelLine} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardInnerBorder} />
          <Text style={styles.storyText}>{question.story}</Text>
        </View>

        <View style={styles.trackContainer}>
          <View style={styles.endLabels}>
            <Text style={styles.endLabel}>{question.leftLabel}</Text>
            <Text style={styles.endLabel}>{question.rightLabel}</Text>
          </View>

          <View
            style={styles.trackOuter}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              setTrackWidth(w);
              trackWidthRef.current = w;
            }}
            {...(phase === 'play' ? panResponder.panHandlers : {})}
          >
            <View style={styles.trackInner} />

            {phase === 'play' && trackWidth > 0 && (
              <View
                style={[
                  styles.marker,
                  styles.markerUser,
                  { left: (userPosition / 100) * trackWidth - 12 },
                ]}
              />
            )}

            {phase === 'reveal' && revealData && trackWidth > 0 && (
              <>
                <View
                  style={[
                    styles.marker,
                    styles.markerUser,
                    { left: (revealData.userPosition / 100) * trackWidth - 12 },
                  ]}
                />
                <View
                  style={[
                    styles.marker,
                    styles.markerTruth,
                    { left: (revealData.truthPosition / 100) * trackWidth - 12 },
                  ]}
                />
              </>
            )}
          </View>

          {phase === 'play' && (
            <Text style={styles.dragHint}>Drag to place your marker</Text>
          )}

          {phase === 'reveal' && (
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotUser]} />
                <Text style={styles.legendText}>Your read</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotTruth]} />
                <Text style={styles.legendText}>Public reaction</Text>
              </View>
            </View>
          )}
        </View>

        {phase === 'play' && (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleLockIn} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Lock In</Text>
            </TouchableOpacity>

            {!isChallengeMode && !isHelpMode && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleAskFriend}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>Ask a Friend for Help</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {phase === 'reveal' && (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{question.explanation}</Text>
            </View>

            {revealData && (
              <View style={styles.resultCard}>
                <View style={styles.cardInnerBorder} />
                <View style={styles.resultRow}>
                  <Text
                    style={[
                      styles.resultVerdict,
                      revealData.correct ? styles.resultCorrect : styles.resultWrong,
                    ]}
                  >
                    {Math.abs(revealData.userPosition - revealData.truthPosition) <= 10
                      ? 'Spot On'
                      : revealData.correct
                      ? 'Close Read'
                      : 'Off the Mark'}
                  </Text>
                </View>
                <Text style={styles.resultDistance}>
                  {Math.round(Math.abs(revealData.userPosition - revealData.truthPosition))} pts away
                  from the public average
                </Text>
              </View>
            )}

            {isChallengeMode ? (
              <>
                {challengeComparison && (
                  <View style={styles.challengePanel}>
                    <View style={styles.cardInnerBorder} />
                    <Text style={styles.challengePanelLabel}>Challenge Results</Text>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>Your answer</Text>
                      <Text style={styles.challengeVal}>{Math.round(revealData?.userPosition ?? userPosition)}%</Text>
                    </View>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>{challengeSenderName ?? 'Sender'}'s answer</Text>
                      <Text style={styles.challengeVal}>{challengeComparison.senderAnswer}%</Text>
                    </View>
                    <View style={styles.challengeRow}>
                      <Text style={styles.challengeKey}>Their prediction</Text>
                      <Text style={styles.challengeVal}>
                        {challengeComparison.senderPrediction}{' '}
                        {challengeComparison.senderPrediction === positionToZone(revealData?.userPosition ?? userPosition) ? '✓' : '✗'}
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
          <Text style={styles.footerText}>Noodle Bowl · N° 06 · The Pulse</Text>
        </View>
      </ScrollView>

      <ChallengeModal
        visible={showChallenge}
        onClose={() => setShowChallenge(false)}
        correct={revealData?.correct ?? false}
        predictLabel="Where do you think they'll land?"
        predictOptions={[
          { label: 'Under (bottom third)', value: 'Under' },
          { label: 'Middle (centre third)', value: 'Middle' },
          { label: 'Over (top third)', value: 'Over' },
        ]}
        buildChallengeUrl={async (friendName, prediction) => {
          const result = await createChallenge({
            gameId: 'wave',
            questionIndex: questionIdx,
            senderPrediction: prediction,
            senderAnswer: positionToZone(revealData?.userPosition ?? userPosition),
            senderName: user?.displayName ?? 'A Friend',
            senderPushToken: getCachedPushToken(),
          });
          Analytics.challengeSent('wave');
          return { url: result.url, token: result.token };
        }}
        onSent={(prediction, friendName, token) => addFriendInteraction({
          type: 'sent_challenge',
          friendName,
          gameId: 'wave',
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
  storyText: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 18,
    color: C.ink,
    lineHeight: 26,
  },
  trackContainer: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 20,
    marginBottom: 20,
    ...cardShadow,
  },
  endLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  endLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.muted,
    flexShrink: 1,
    maxWidth: '45%',
  },
  trackOuter: {
    height: 48,
    backgroundColor: C.paperDark,
    borderWidth: 1,
    borderColor: C.paperDarker,
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  trackInner: {
    height: 4,
    backgroundColor: C.paperDarker,
    marginHorizontal: 12,
  },
  marker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    top: 12,
  },
  markerUser: {
    backgroundColor: C.accent,
    borderWidth: 2,
    borderColor: C.paper,
  },
  markerTruth: {
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.paper,
  },
  dragHint: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDotUser: {
    backgroundColor: C.accent,
  },
  legendDotTruth: {
    backgroundColor: C.green,
  },
  legendText: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.2,
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    ...cardShadow,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  resultDistance: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    textAlign: 'center',
  },
  challengePanel: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 20,
    marginBottom: 16,
    ...cardShadow,
  },
  helpSentHeading: {
    fontFamily: F.frauncesBold,
    fontSize: 22,
    color: C.ink,
    textAlign: 'center',
    marginBottom: 10,
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
