import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Masthead } from '@/components/Masthead';
import { GAME_META, GameId } from '@/constants/data';
import { C, F, cardShadow } from '@/constants/theme';
import { ChallengePayload, decodeChallengeToken, getTodayISODate } from '@/constants/utils';
import { useGame } from '@/context/GameContext';

export default function ChallengeScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { addFriendInteraction } = useGame();
  const [payload, setPayload] = useState<ChallengePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    if (!token) { setError('No challenge token found.'); return; }
    const decoded = decodeChallengeToken(token as string);
    if (!decoded) { setError('This challenge link is invalid or has expired.'); return; }

    const issuedAt = new Date(decoded.issuedAt);
    const expiryMs = 24 * 60 * 60 * 1000;
    if (Date.now() - issuedAt.getTime() > expiryMs) {
      setError('This challenge link has expired. Challenges are valid for 24 hours.');
      return;
    }

    const validGames: GameId[] = ['lede', 'spread', 'sof', 'wave', 'quip'];
    if (!validGames.includes(decoded.gameId as GameId)) {
      setError('This challenge is for a game that is not available.');
      return;
    }

    setPayload(decoded);
  }, [token]);

  useEffect(() => {
    if (!payload || recorded) return;
    addFriendInteraction({
      type: 'received_challenge',
      friendName: payload.senderName,
      gameId: payload.gameId as GameId,
      questionIndex: payload.questionIndex,
      shieldEarned: false,
    });
    setRecorded(true);
  }, [payload, recorded]);

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Masthead />
          <View style={styles.card}>
            <View style={styles.cardInnerBorder} />
            <Text style={styles.errorTitle}>Challenge Unavailable</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/')} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Back to Games</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!payload) return null;

  const meta = GAME_META[payload.gameId as GameId];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Masthead />

        <View style={styles.challengeBanner}>
          <Text style={styles.challengeFrom}>Challenge from {payload.senderName}</Text>
          <Text style={styles.challengeGame}>{meta?.title ?? payload.gameId}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardInnerBorder} />
          <Text style={styles.cardLabel}>They challenged you to answer question #{payload.questionIndex + 1}.</Text>
          <Text style={styles.cardBody}>
            Play the game to see how you do — then come back to compare your answer with {payload.senderName}.
          </Text>
          <Text style={styles.cardNote}>
            Their prediction is hidden until you answer.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace(`/games/${payload.gameId as GameId}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Play {meta?.title ?? 'the Game'} →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/')} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Not Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 80 },
  challengeBanner: {
    backgroundColor: C.ink,
    padding: 20,
    marginBottom: 20,
  },
  challengeFrom: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.onDarkDim,
    marginBottom: 6,
  },
  challengeGame: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 28,
    color: C.onDark,
    lineHeight: 32,
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
    top: 4, left: 4, right: 4, bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(42,36,29,0.15)',
    pointerEvents: 'none',
  },
  cardLabel: {
    fontFamily: F.frauncesBold,
    fontSize: 16,
    color: C.ink,
    marginBottom: 10,
  },
  cardBody: {
    fontFamily: F.fraunces,
    fontSize: 15,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 12,
  },
  cardNote: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.muted,
    fontStyle: 'italic',
  },
  errorTitle: {
    fontFamily: F.frauncesBold,
    fontSize: 20,
    color: C.ink,
    marginBottom: 12,
  },
  errorBody: {
    fontFamily: F.fraunces,
    fontSize: 15,
    color: C.muted,
    lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: C.ink,
    paddingVertical: 16,
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
});
