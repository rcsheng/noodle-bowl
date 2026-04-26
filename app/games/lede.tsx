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

import { ChallengeModal } from '@/components/ChallengeModal';
import { CopiedToast } from '@/components/CopiedToast';
import { Masthead } from '@/components/Masthead';
import { LEDE_BANK, LedeItem, LedePanelist } from '@/constants/data';
import { C, F, cardShadow } from '@/constants/theme';
import { ChallengePayload, calculatePoints, genChallengeUrl, pickFromBank, shuffleIndices } from '@/constants/utils';
import { useGame } from '@/context/GameContext';

type Phase = 'play' | 'reveal';

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

export default function LedeScreen() {
  const { state, isLoaded, updateGameStats, setSeen, addFriendInteraction } = useGame();
  const started = useRef(false);

  const [question, setQuestion] = useState<LedeItem | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [showFriend, setShowFriend] = useState(false);
  const [fakeUrl] = useState(genFakeUrl);
  const [showChallenge, setShowChallenge] = useState(false);
  const [helpCopied, setHelpCopied] = useState(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;
    const { idx, item, newSeen } = pickFromBank(LEDE_BANK, state.seen.lede);
    setSeen('lede', newSeen);
    setQuestion(item);
    setQuestionIdx(idx);
    setOrder(shuffleIndices(item.panelists.length));
  }, [isLoaded]);

  const handleLockIn = () => {
    if (selected === null || !question) return;
    const panelist = question.panelists[selected];
    const correct = panelist.isCorrect;
    const prevStreak = state.stats.lede.streak;
    const points = calculatePoints(correct, prevStreak);
    setRevealData({ correct, points, prevStreak });
    updateGameStats('lede', correct, points);
    setPhase('reveal');
  };

  const scrollRef = useRef<ScrollView>(null);

  const handlePlayAgain = () => {
    const { idx, item, newSeen } = pickFromBank(LEDE_BANK, state.seen.lede);
    setSeen('lede', newSeen);
    setQuestion(item);
    setQuestionIdx(idx);
    setOrder(shuffleIndices(item.panelists.length));
    setSelected(null);
    setPhase('play');
    setRevealData(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleShare = async () => {
    const result = await Share.share({ message: `Can you help me with this question on Noodle Bowl? ${fakeUrl}` });
    if (result.action === Share.sharedAction) {
      addFriendInteraction({ type: 'gave_help', friendName: 'A Friend', gameId: 'lede', questionIndex: questionIdx, shieldEarned: false });
    }
  };

  const handleCopyHelp = async () => {
    await Clipboard.setStringAsync(fakeUrl);
    setHelpCopied(true);
    setTimeout(() => setHelpCopied(false), 2000);
  };

  if (!question) return null;

  const orderedPanelists: { panelist: LedePanelist; originalIdx: number }[] = order.map(
    (i) => ({ panelist: question.panelists[i], originalIdx: i })
  );

  const getPanelistStyle = (originalIdx: number) => {
    if (phase === 'play') {
      return selected === originalIdx ? styles.panelistCardSelected : styles.panelistCard;
    }
    const p = question.panelists[originalIdx];
    if (p.isCorrect) return styles.panelistCardCorrect;
    if (selected === originalIdx && !p.isCorrect) return styles.panelistCardWrong;
    return styles.panelistCard;
  };

  const getHeaderStyle = (originalIdx: number) => {
    if (phase === 'play') {
      return selected === originalIdx ? styles.panelistHeaderSelected : styles.panelistHeader;
    }
    const p = question.panelists[originalIdx];
    if (p.isCorrect) return styles.panelistHeaderCorrect;
    if (selected === originalIdx && !p.isCorrect) return styles.panelistHeaderWrong;
    return styles.panelistHeader;
  };

  const isUnselectedHeader = (originalIdx: number): boolean => {
    if (phase === 'play') return selected !== originalIdx;
    const p = question.panelists[originalIdx];
    return !p.isCorrect && selected !== originalIdx;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Masthead />

        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Games</Text>
        </TouchableOpacity>

        <View style={styles.labelRow}>
          <Text style={styles.label}>The Lede</Text>
          <View style={styles.labelLine} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardInnerBorder} />
          <Text style={styles.sectionSmall}>Complete the headline</Text>
          <Text style={styles.partialHeadline}>
            <Text style={styles.partialHeadlineItalic}>{question.partialHeadline}</Text>
            <Text style={styles.partialHeadlinePlaceholder}> ___</Text>
          </Text>
          <View style={styles.sourceHintRow}>
            <Text style={styles.sourceHint}>Source hint: {question.sourceHint}</Text>
          </View>
        </View>

        {phase === 'play' && (
          <Text style={styles.instructionText}>Select the reporter whose ending is real.</Text>
        )}

        {phase === 'reveal' && (
          <View style={styles.revealHeadlineBox}>
            <Text style={styles.revealHeadlineLabel}>The Real Headline</Text>
            <Text style={styles.revealHeadline}>
              {question.partialHeadline}{' '}
              {question.panelists.find((p) => p.isCorrect)?.completion}
            </Text>
          </View>
        )}

        {orderedPanelists.map(({ panelist, originalIdx }) => (
          <TouchableOpacity
            key={originalIdx}
            style={getPanelistStyle(originalIdx)}
            onPress={() => phase === 'play' && setSelected(originalIdx)}
            activeOpacity={phase === 'play' ? 0.85 : 1}
            disabled={phase === 'reveal'}
          >
            <View style={getHeaderStyle(originalIdx)}>
              <Text style={[
                styles.panelistName,
                isUnselectedHeader(originalIdx) && styles.panelistNameDark,
              ]}>
                {panelist.name}
              </Text>
              <Text style={[
                styles.panelistRole,
                isUnselectedHeader(originalIdx) && styles.panelistRoleDark,
              ]}>
                {panelist.role}
              </Text>
            </View>
            <View style={styles.panelistBody}>
              <Text style={styles.panelistCompletion}>
                {panelist.completion}
              </Text>
              <View style={styles.pitchBox}>
                <Text style={styles.pitchText}>"{panelist.pitch}"</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {phase === 'play' && (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, selected === null && styles.primaryBtnDisabled]}
              onPress={handleLockIn}
              disabled={selected === null}
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

        {phase === 'reveal' && (
          <>
            <View style={styles.truthBox}>
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

            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← Back to Games</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Noodle Bowl · N° 01 · The Lede</Text>
        </View>
      </ScrollView>

      <ChallengeModal
        visible={showChallenge}
        onClose={() => setShowChallenge(false)}
        correct={revealData?.correct ?? false}
        predictLabel="Which ending do you think they'll pick?"
        predictOptions={question ? orderedPanelists.map(({ panelist }) => ({
          label: panelist.completion.split(' ').slice(0, 7).join(' ') + '…',
          value: panelist.name,
        })) : []}
        buildChallengeUrl={(friendName, prediction) => genChallengeUrl({
          gameId: 'lede',
          questionIndex: questionIdx,
          senderPrediction: prediction,
          senderAnswer: selected !== null ? question!.panelists[selected].name : '',
          senderName: friendName,
          issuedAt: new Date().toISOString(),
        })}
        onSent={(prediction, friendName) => addFriendInteraction({
          type: 'sent_challenge',
          friendName,
          gameId: 'lede',
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
            <Text style={styles.modalSubtitle}>They'll answer the same puzzle — you'll see what they pick.</Text>

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
  sectionSmall: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 10,
  },
  partialHeadline: {
    fontFamily: F.frauncesBold,
    fontSize: 20,
    color: C.ink,
    lineHeight: 28,
  },
  partialHeadlineItalic: {
    fontFamily: F.frauncesBoldItalic,
  },
  partialHeadlinePlaceholder: {
    fontFamily: F.frauncesBoldItalic,
    color: C.muted,
  },
  sourceHintRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.paperDarker,
    paddingTop: 10,
  },
  sourceHint: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    fontStyle: 'italic',
  },
  instructionText: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  revealHeadlineBox: {
    backgroundColor: C.ink,
    padding: 20,
    marginBottom: 16,
  },
  revealHeadlineLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.onDarkDim,
    marginBottom: 8,
  },
  revealHeadline: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 18,
    color: C.onDark,
    lineHeight: 26,
  },
  panelistCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    marginBottom: 14,
    ...cardShadow,
    overflow: 'hidden',
  },
  panelistCardSelected: {
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.paper,
    marginBottom: 14,
    ...cardShadow,
    overflow: 'hidden',
  },
  panelistCardCorrect: {
    borderWidth: 2,
    borderColor: C.green,
    backgroundColor: C.paper,
    marginBottom: 14,
    ...cardShadow,
    overflow: 'hidden',
  },
  panelistCardWrong: {
    borderWidth: 2,
    borderColor: C.accent,
    backgroundColor: C.paper,
    marginBottom: 14,
    ...cardShadow,
    overflow: 'hidden',
  },
  panelistHeader: {
    backgroundColor: C.paperDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelistHeaderSelected: {
    backgroundColor: C.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelistHeaderCorrect: {
    backgroundColor: C.green,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelistHeaderWrong: {
    backgroundColor: C.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelistName: {
    fontFamily: F.frauncesBold,
    fontSize: 14,
    color: C.onDark,
  },
  panelistNameDark: {
    color: C.ink,
  },
  panelistRole: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.onDarkDim,
  },
  panelistRoleDark: {
    color: C.muted,
  },
  panelistBody: {
    padding: 16,
  },
  panelistCompletion: {
    fontFamily: F.frauncesItalic,
    fontSize: 16,
    color: C.ink,
    lineHeight: 22,
    marginBottom: 10,
  },
  pitchBox: {
    borderLeftWidth: 2,
    borderLeftColor: C.paperDarker,
    paddingLeft: 12,
  },
  pitchText: {
    fontFamily: F.fraunces,
    fontSize: 13,
    color: C.muted,
    lineHeight: 19,
    fontStyle: 'italic',
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
