import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
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

import { Masthead } from '@/components/Masthead';
import { PANEL, QUIP_PROMPTS, QuipPrompt } from '@/constants/data';
import { C, F, cardShadow } from '@/constants/theme';
import { pickFromBank } from '@/constants/utils';
import { useGame } from '@/context/GameContext';

type Phase = 'play' | 'judging' | 'result';

const MAX_CHARS = 180;

function genFakeUrl(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return `https://noodlebowl.app/help/${result}`;
}

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
  const { state, isLoaded, updateGameStats, setSeen } = useGame();
  const started = useRef(false);

  const [prompt, setPrompt] = useState<QuipPrompt | null>(null);
  const [quip, setQuip] = useState('');
  const [phase, setPhase] = useState<Phase>('play');
  const [judgeResults, setJudgeResults] = useState<JudgeResult[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [showFriend, setShowFriend] = useState(false);
  const [fakeUrl] = useState(genFakeUrl);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;
    const { item, newSeen } = pickFromBank(QUIP_PROMPTS, state.seen.quip);
    setSeen('quip', newSeen);
    setPrompt(item);
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
          setTimeout(() => setPhase('result'), 400);
        }
      }, delay + i * 700);
    });
  };

  const handlePlayAgain = () => {
    const { item, newSeen } = pickFromBank(QUIP_PROMPTS, state.seen.quip);
    setSeen('quip', newSeen);
    setPrompt(item);
    setQuip('');
    setPhase('play');
    setJudgeResults([]);
    setRevealedCount(0);
    setPoints(0);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(fakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({ message: `Can you help me with this question on Noodle Bowl? ${fakeUrl}` });
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

          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back to Games</Text>
          </TouchableOpacity>

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

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setShowFriend(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>Share with a Friend</Text>
              </TouchableOpacity>
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
                <Text style={styles.resultPoints}>+{points} pts</Text>
              </View>

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
            <Text style={styles.footerText}>Noodle Bowl · N° 05 · The Quip</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showFriend} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalInnerBorder} />
            <Text style={styles.modalTitle}>Share with a Friend</Text>
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
    color: C.ink,
    marginBottom: 6,
  },
  resultPoints: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 24,
    color: C.accentWarm,
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
