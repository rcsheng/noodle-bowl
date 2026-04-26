import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
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
import { CopiedToast } from '@/components/CopiedToast';
import { Masthead } from '@/components/Masthead';
import { SOF_BANK, SofItem } from '@/constants/data';
import { C, F, cardShadow } from '@/constants/theme';
import { useGame } from '@/context/GameContext';

type Phase = 'play' | 'reveal';
type ClaimVote = 'science' | 'fiction' | null;

interface RevealData {
  correct: boolean;
  points: number;
  prevStreak: number;
  numCorrect: number;
}

function genFakeUrl(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return `https://noodlebowl.app/help/${result}`;
}

function pickFromSof(
  weirdMode: boolean,
  seen: number[]
): { item: SofItem; newSeen: number[] } {
  const filtered = SOF_BANK
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => item.weirdAndTrue === weirdMode);
  const seenInMode = seen.filter(i => SOF_BANK[i]?.weirdAndTrue === weirdMode);
  const available = seenInMode.length >= filtered.length
    ? filtered
    : filtered.filter(({ i }) => !seenInMode.includes(i));
  const pick = available[Math.floor(Math.random() * available.length)];
  return { item: pick.item, newSeen: seen.includes(pick.i) ? seen : [...seen, pick.i] };
}

export default function SofScreen() {
  const { state, isLoaded, updateGameStats, setSeen, addFriendInteraction } = useGame();
  const started = useRef(false);

  const [question, setQuestion] = useState<SofItem | null>(null);
  const [votes, setVotes] = useState<ClaimVote[]>([null, null, null]);
  const [phase, setPhase] = useState<Phase>('play');
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [weirdMode, setWeirdMode] = useState(false);
  const [showFriend, setShowFriend] = useState(false);
  const [fakeUrl] = useState(genFakeUrl);
  const [showChallenge, setShowChallenge] = useState(false);
  const [helpCopied, setHelpCopied] = useState(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;
    const { item, newSeen } = pickFromSof(false, state.seen.sof);
    setSeen('sof', newSeen);
    setQuestion(item);
    setVotes([null, null, null]);
  }, [isLoaded]);

  const setVote = (idx: number, v: ClaimVote) => {
    setVotes((prev) => {
      const next = [...prev];
      if (v === 'fiction') {
        next.forEach((_, i) => { if (i !== idx && next[i] === 'fiction') next[i] = null; });
      }
      next[idx] = v;
      return next;
    });
  };

  const handleLockIn = () => {
    if (!question) return;
    let numCorrect = 0;
    votes.forEach((v, i) => {
      const claim = question.claims[i];
      if ((v === 'science' && claim.isScience) || (v === 'fiction' && !claim.isScience)) {
        numCorrect++;
      }
    });
    const allCorrect = numCorrect === 3;
    const basePoints = numCorrect * 10;
    const bonus = allCorrect ? 20 : 0;
    const totalPoints = basePoints + bonus;
    const correct = numCorrect >= 2;
    const prevStreak = state.stats.sof.streak;
    setRevealData({ correct, points: totalPoints, prevStreak, numCorrect });
    updateGameStats('sof', correct, totalPoints);
    setPhase('reveal');
  };

  const handlePlayAgain = () => {
    const { item, newSeen } = pickFromSof(weirdMode, state.seen.sof);
    setSeen('sof', newSeen);
    setQuestion(item);
    setVotes([null, null, null]);
    setPhase('play');
    setRevealData(null);
  };

  const handleToggleMode = (nextMode: boolean) => {
    if (nextMode === weirdMode) return;
    setWeirdMode(nextMode);
    if (phase === 'play') {
      const { item, newSeen } = pickFromSof(nextMode, state.seen.sof);
      setSeen('sof', newSeen);
      setQuestion(item);
      setVotes([null, null, null]);
    }
  };

  const handleShare = async () => {
    await Share.share({ message: `Can you help me with this question on Noodle Bowl? ${fakeUrl}` });
  };

  const handleCopyHelp = async () => {
    await Clipboard.setStringAsync(fakeUrl);
    setHelpCopied(true);
    setTimeout(() => setHelpCopied(false), 2000);
  };

  const allVoted = votes.every((v) => v !== null) && votes.filter(v => v === 'fiction').length === 1;

  if (!question) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Masthead />

        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Games</Text>
        </TouchableOpacity>

        <View style={styles.labelRow}>
          <Text style={styles.label}>Science or Fiction</Text>
          <View style={styles.labelLine} />
        </View>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, !weirdMode && styles.modeBtnActive]}
            onPress={() => handleToggleMode(false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, !weirdMode && styles.modeBtnTextActive]}>Standard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, weirdMode && styles.modeBtnActive]}
            onPress={() => handleToggleMode(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, weirdMode && styles.modeBtnTextActive]}>Weird & True</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.topicCard}>
          <View style={styles.cardInnerBorder} />
          <Text style={styles.topicLabel}>Topic</Text>
          <Text style={styles.topicTitle}>{question.topic}</Text>
          <Text style={styles.topicIntro}>{question.intro}</Text>
        </View>

        {phase === 'play' && (
          <Text style={styles.instructionText}>
            Mark each claim as Science (real) or Fiction (fabricated).
          </Text>
        )}

        {question.claims.map((claim, i) => (
          <View key={i} style={[styles.claimCard, phase === 'reveal' && getRevealBorder(votes[i], claim.isScience)]}>
            <View style={styles.cardInnerBorder} />
            <View style={styles.claimNumRow}>
              <Text style={styles.claimNum}>Claim {i + 1}</Text>
            </View>
            <Text style={styles.claimText}>{claim.text}</Text>

            {phase === 'play' ? (
              <View style={styles.voteRow}>
                <TouchableOpacity
                  style={[styles.voteBtn, votes[i] === 'science' && styles.voteBtnSelected]}
                  onPress={() => setVote(i, 'science')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.voteBtnText, votes[i] === 'science' && styles.voteBtnTextSelected]}>
                    Science
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.voteBtn, votes[i] === 'fiction' && styles.voteBtnSelected]}
                  onPress={() => setVote(i, 'fiction')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.voteBtnText, votes[i] === 'fiction' && styles.voteBtnTextSelected]}>
                    Fiction
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
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
            )}
          </View>
        ))}

        {phase === 'play' && (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, !allVoted && styles.primaryBtnDisabled]}
              onPress={handleLockIn}
              disabled={!allVoted}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Lock In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setShowFriend(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>Stuck? Ask a Friend</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === 'reveal' && revealData && (
          <>
            <View style={styles.resultCard}>
              <View style={styles.cardInnerBorder} />
              <Text
                style={[
                  styles.resultVerdict,
                  revealData.numCorrect === 3
                    ? styles.resultPerfect
                    : revealData.numCorrect >= 2
                    ? styles.resultCorrect
                    : styles.resultWrong,
                ]}
              >
                {revealData.numCorrect === 3
                  ? 'Perfect!'
                  : revealData.numCorrect === 2
                  ? 'Almost!'
                  : revealData.numCorrect === 1
                  ? 'One Right'
                  : 'Missed All'}
              </Text>
              <Text style={styles.resultPoints}>+{revealData.points} pts</Text>
              {revealData.numCorrect === 3 && (
                <Text style={styles.resultBonus}>Includes +20 bonus for all 3</Text>
              )}
            </View>

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

            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← Back to Games</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Noodle Bowl · N° 03 · Science or Fiction</Text>
        </View>
      </ScrollView>

      <ChallengeModal
        visible={showChallenge}
        onClose={() => setShowChallenge(false)}
        correct={revealData?.correct ?? false}
        predictLabel="Which claim do you think they'll call Fiction?"
        predictOptions={question ? question.claims.map((claim, i) => ({
          label: `${i + 1}. ${claim.text.split(' ').slice(0, 6).join(' ')}…`,
          value: String(i + 1),
        })) : []}
        onSent={(prediction) => addFriendInteraction({
          type: 'sent_challenge',
          friendName: 'A Friend',
          gameId: 'sof',
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

            <TouchableOpacity style={styles.urlBox} onPress={handleCopyHelp} activeOpacity={0.7}>
              <Text style={styles.urlText}>{fakeUrl}</Text>
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

function getRevealBorder(vote: ClaimVote, isScience: boolean) {
  const correct = (vote === 'science' && isScience) || (vote === 'fiction' && !isScience);
  if (correct) return styles.claimCardCorrect;
  return styles.claimCardWrong;
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
  modeToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: C.ink,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: C.paper,
  },
  modeBtnActive: {
    backgroundColor: C.ink,
  },
  modeBtnText: {
    fontFamily: F.monoBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.ink,
  },
  modeBtnTextActive: {
    color: C.onDark,
  },
  topicCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 24,
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
  topicLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 6,
  },
  topicTitle: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 22,
    color: C.ink,
    marginBottom: 8,
  },
  topicIntro: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  instructionText: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  claimCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 20,
    marginBottom: 14,
    ...cardShadow,
  },
  claimCardCorrect: {
    borderWidth: 2,
    borderColor: C.green,
  },
  claimCardWrong: {
    borderWidth: 2,
    borderColor: C.accent,
  },
  claimNumRow: {
    marginBottom: 10,
  },
  claimNum: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
  },
  claimText: {
    fontFamily: F.fraunces,
    fontSize: 15,
    color: C.ink,
    lineHeight: 22,
    marginBottom: 14,
  },
  voteRow: {
    flexDirection: 'row',
    gap: 10,
  },
  voteBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.paper,
    paddingVertical: 12,
    alignItems: 'center',
  },
  voteBtnSelected: {
    backgroundColor: C.ink,
  },
  voteBtnText: {
    fontFamily: F.monoBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.ink,
  },
  voteBtnTextSelected: {
    color: C.onDark,
  },
  revealSection: {
    borderTopWidth: 1,
    borderTopColor: C.paperDarker,
    paddingTop: 12,
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
  resultPerfect: {
    color: C.green,
  },
  resultCorrect: {
    color: C.accentWarm,
  },
  resultWrong: {
    color: C.accent,
  },
  resultPoints: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 24,
    color: C.ink,
  },
  resultBonus: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.2,
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
