import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
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

import { Masthead } from '@/components/Masthead';
import { WACKY_BANK, WackyItem } from '@/constants/data';
import { C, F, cardShadow } from '@/constants/theme';
import { calculatePoints, pickFromBank } from '@/constants/utils';
import { useGame } from '@/context/GameContext';

type Phase = 'play' | 'reveal';
type Vote = 'real' | 'satire' | null;

interface RevealData {
  correct: boolean;
  points: number;
  prevStreak: number;
}

function genFakeUrl(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return `https://noodlebowl.app/help/${result}`;
}

export default function WackyScreen() {
  const { state, isLoaded, updateGameStats, setSeen } = useGame();
  const started = useRef(false);

  const [question, setQuestion] = useState<WackyItem | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  const [vote, setVote] = useState<Vote>(null);
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [showFriend, setShowFriend] = useState(false);
  const [fakeUrl] = useState(genFakeUrl);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;
    const { item, newSeen } = pickFromBank(WACKY_BANK, state.seen.wacky);
    setSeen('wacky', newSeen);
    setQuestion(item);
  }, [isLoaded]);

  const handleLockIn = () => {
    if (!vote || !question) return;
    const correct = vote === 'real' ? question.isReal : !question.isReal;
    const prevStreak = state.stats.wacky.streak;
    const points = calculatePoints(correct, prevStreak);
    setRevealData({ correct, points, prevStreak });
    updateGameStats('wacky', correct, points);
    setPhase('reveal');
  };

  const handlePlayAgain = () => {
    const { item, newSeen } = pickFromBank(WACKY_BANK, state.seen.wacky);
    setSeen('wacky', newSeen);
    setQuestion(item);
    setPhase('play');
    setVote(null);
    setRevealData(null);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(fakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({ message: `Can you help me with this one? ${fakeUrl}` });
  };

  if (!question) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Masthead />

        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Games</Text>
        </TouchableOpacity>

        {phase === 'play' ? (
          <>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Real or Satire</Text>
              <View style={styles.labelLine} />
            </View>

            <View style={styles.card}>
              <View style={styles.cardInnerBorder} />
              <View style={styles.breakingBadge}>
                <Text style={styles.breakingText}>Breaking</Text>
              </View>
              <Text style={styles.headline}>{question.headline}</Text>
            </View>

            <View style={styles.voteRow}>
              <TouchableOpacity
                style={[styles.voteBtn, vote === 'real' && styles.voteBtnSelected]}
                onPress={() => setVote('real')}
                activeOpacity={0.8}
              >
                <Text style={[styles.voteBtnText, vote === 'real' && styles.voteBtnTextSelected]}>
                  Real
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteBtn, vote === 'satire' && styles.voteBtnSelected]}
                onPress={() => setVote('satire')}
                activeOpacity={0.8}
              >
                <Text style={[styles.voteBtnText, vote === 'satire' && styles.voteBtnTextSelected]}>
                  Satire
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, !vote && styles.primaryBtnDisabled]}
              onPress={handleLockIn}
              disabled={!vote}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Lock In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setShowFriend(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>Phone a Friend</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Real or Satire</Text>
              <View style={styles.labelLine} />
            </View>

            <View style={styles.card}>
              <View style={styles.cardInnerBorder} />
              <Text style={styles.headline}>{question.headline}</Text>
            </View>

            <View style={styles.voteRow}>
              <View
                style={[
                  styles.voteBtn,
                  vote === 'real' && question.isReal && styles.voteBtnCorrect,
                  vote === 'real' && !question.isReal && styles.voteBtnWrong,
                  vote !== 'real' && question.isReal && styles.voteBtnCorrectNeutral,
                ]}
              >
                <Text
                  style={[
                    styles.voteBtnText,
                    (vote === 'real' || question.isReal) && styles.voteBtnTextSelected,
                  ]}
                >
                  Real
                </Text>
              </View>
              <View
                style={[
                  styles.voteBtn,
                  vote === 'satire' && !question.isReal && styles.voteBtnCorrect,
                  vote === 'satire' && question.isReal && styles.voteBtnWrong,
                  vote !== 'satire' && !question.isReal && styles.voteBtnCorrectNeutral,
                ]}
              >
                <Text
                  style={[
                    styles.voteBtnText,
                    (vote === 'satire' || !question.isReal) && styles.voteBtnTextSelected,
                  ]}
                >
                  Satire
                </Text>
              </View>
            </View>

            <View style={styles.truthBox}>
              <Text style={styles.truthSource}>{question.source}</Text>
              <Text style={styles.truthExplanation}>{question.explanation}</Text>
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
                  {revealData.correct ? 'Correct' : 'Wrong'}
                </Text>
                <Text style={styles.resultPoints}>
                  {revealData.correct ? `+${revealData.points} pts` : '0 pts'}
                </Text>
                {revealData.correct && revealData.prevStreak > 0 && (
                  <Text style={styles.resultStreak}>
                    🔥 {revealData.prevStreak + 1} streak
                  </Text>
                )}
              </View>
            )}

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
          <Text style={styles.footerText}>Noodle Bowl · N° 01 · Wacky News</Text>
        </View>
      </ScrollView>

      <Modal visible={showFriend} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalInnerBorder} />
            <Text style={styles.modalTitle}>Phone a Friend</Text>
            <Text style={styles.modalSubtitle}>Share this link — they can peek at the answer.</Text>

            <View style={styles.urlBox}>
              <Text style={styles.urlText}>{fakeUrl}</Text>
            </View>

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
  breakingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 12,
  },
  breakingText: {
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.onDark,
  },
  headline: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 22,
    color: C.ink,
    lineHeight: 30,
  },
  voteRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  voteBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.paper,
    paddingVertical: 16,
    alignItems: 'center',
  },
  voteBtnSelected: {
    backgroundColor: C.ink,
  },
  voteBtnCorrect: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  voteBtnWrong: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  voteBtnCorrectNeutral: {
    borderColor: C.green,
  },
  voteBtnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.ink,
  },
  voteBtnTextSelected: {
    color: C.onDark,
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
  truthBox: {
    backgroundColor: C.ink,
    padding: 20,
    marginBottom: 16,
  },
  truthSource: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.onDarkDim,
    marginBottom: 8,
  },
  truthExplanation: {
    fontFamily: F.fraunces,
    fontSize: 15,
    color: C.onDark,
    lineHeight: 22,
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
  resultStreak: {
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 1.5,
    color: C.muted,
    marginTop: 6,
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
