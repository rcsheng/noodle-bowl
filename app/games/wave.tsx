import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
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
import { CopiedToast } from '@/components/CopiedToast';
import { Masthead } from '@/components/Masthead';
import { WAVE_BANK, WaveItem } from '@/constants/data';
import { C, F, cardShadow } from '@/constants/theme';
import { ChallengePayload, genChallengeUrl, pickFromBank } from '@/constants/utils';
import { useGame } from '@/context/GameContext';

type Phase = 'play' | 'reveal';

interface RevealData {
  correct: boolean;
  points: number;
  prevStreak: number;
  userPosition: number;
  truthPosition: number;
}

function genFakeUrl(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return `https://noodlebowl.app/help/${result}`;
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
  const { state, isLoaded, updateGameStats, setSeen, addFriendInteraction } = useGame();
  const started = useRef(false);

  const [question, setQuestion] = useState<WaveItem | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('play');
  const [userPosition, setUserPosition] = useState(50);
  const [trackWidth, setTrackWidth] = useState(0);
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [showFriend, setShowFriend] = useState(false);
  const [fakeUrl] = useState(genFakeUrl);
  const [copied, setCopied] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);

  const userPosRef = useRef(50);
  const trackWidthRef = useRef(0);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;
    const { idx, item, newSeen } = pickFromBank(WAVE_BANK, state.seen.wave);
    setSeen('wave', newSeen);
    setQuestion(item);
    setQuestionIdx(idx);
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

  const handleLockIn = () => {
    if (!question) return;
    const pos = userPosRef.current;
    const { correct, points } = scoreWave(pos, question.truthPosition);
    const prevStreak = state.stats.wave.streak;
    setRevealData({ correct, points, prevStreak, userPosition: pos, truthPosition: question.truthPosition });
    updateGameStats('wave', correct, points);
    setPhase('reveal');
  };

  const handlePlayAgain = () => {
    const { idx, item, newSeen } = pickFromBank(WAVE_BANK, state.seen.wave);
    setSeen('wave', newSeen);
    setQuestion(item);
    setQuestionIdx(idx);
    setPhase('play');
    setUserPosition(50);
    userPosRef.current = 50;
    setRevealData(null);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(fakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const result = await Share.share({ message: `Can you help me with this question on Noodle Bowl? ${fakeUrl}` });
    if (result.action === Share.sharedAction) {
      addFriendInteraction({ type: 'gave_help', friendName: 'A Friend', gameId: 'wave', questionIndex: questionIdx, shieldEarned: false });
    }
  };

  if (!question) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Masthead />

        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Games</Text>
        </TouchableOpacity>

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

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setShowFriend(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>Ask a Friend for Help</Text>
            </TouchableOpacity>
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
                <Text style={styles.resultPoints}>
                  {revealData.points > 0 ? `+${revealData.points} pts` : '0 pts'}
                </Text>
                <Text style={styles.resultDistance}>
                  {Math.round(Math.abs(revealData.userPosition - revealData.truthPosition))} pts away
                  from the public average
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setShowChallenge(true)}
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

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Back to Games</Text>
            </TouchableOpacity>
          </>
        )}

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
        buildChallengeUrl={(friendName, prediction) => genChallengeUrl({
          gameId: 'wave',
          questionIndex: questionIdx,
          senderPrediction: prediction,
          senderAnswer: positionToZone(revealData?.userPosition ?? userPosition),
          senderName: friendName,
          issuedAt: new Date().toISOString(),
        })}
        onSent={(prediction, friendName) => addFriendInteraction({
          type: 'sent_challenge',
          friendName,
          gameId: 'wave',
          questionIndex: questionIdx,
          shieldEarned: false,
          senderPrediction: prediction,
        })}
      />

      <Modal visible={showFriend} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalInnerBorder} />
            <Text style={styles.modalTitle}>Ask a Friend for Help</Text>
            <Text style={styles.modalSubtitle}>Share this link — they can peek at the answer.</Text>

            <TouchableOpacity style={styles.urlBox} onPress={handleCopy} activeOpacity={0.7}>
              <Text style={styles.urlText}>{fakeUrl}</Text>
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
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    ...cardShadow,
  },
  resultVerdict: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 34,
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
    marginBottom: 8,
  },
  resultDistance: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    textAlign: 'center',
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
