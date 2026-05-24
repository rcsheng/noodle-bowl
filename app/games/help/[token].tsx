import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Masthead } from '@/components/Masthead';
import { GAME_META, GameId } from '@/constants/data';
import { C, F, cardShadow } from '@/constants/theme';
import { fetchHelp } from '@/lib/helpApi';
import { computeActiveWeek } from '@/lib/contentWeek';
import type { HelpGetResponse } from '@/packages/shared/types';

const SHORT_TOKEN_RE = /^[A-Z0-9]{8}$/;

export default function HelpScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [payload, setPayload] = useState<HelpGetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('No help token found.'); return; }

    if (!SHORT_TOKEN_RE.test(token as string)) {
      setError('This help link is invalid.');
      return;
    }

    fetchHelp(token as string).then((result) => {
      if ('error' in result) {
        setError(
          result.error === 'expired'
            ? 'This help link has expired. Help links are valid for 24 hours.'
            : 'This help link is invalid or has expired.',
        );
        return;
      }
      const validGames: GameId[] = ['lede', 'spread', 'sof', 'wave', 'quip'];
      if (!validGames.includes(result.gameId as GameId)) {
        setError('This help request is for a game that is not available.');
        return;
      }
      // Stale-week check: if contentWeek is set and doesn't match the active week,
      // the question is no longer in this week's content bank — block the helper flow.
      // Guard against undefined (deployed helpGet may omit the field) and '' (legacy backward compat).
      if (result.contentWeek && result.contentWeek !== computeActiveWeek()) {
        setError(
          'This question is from a previous week and is no longer available.\n\n' +
          'The person who sent this link may not have played yet — ask them to share a new link!',
        );
        return;
      }
      setPayload(result);
    }).catch(() => {
      setError('Could not load help request. Please check your connection and try again.');
    });
  }, [token]);

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Masthead />
          <View style={styles.card}>
            <View style={styles.cardInnerBorder} />
            <Text style={styles.errorTitle}>Help Request Unavailable</Text>
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
  const askerLabel = payload.askerName ?? 'A Friend';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Masthead />

        <View style={styles.helpBanner}>
          <Text style={styles.helpFrom}>{askerLabel} needs your help</Text>
          <Text style={styles.helpGame}>{meta?.title ?? payload.gameId}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardInnerBorder} />
          <Text style={styles.cardLabel}>They're stuck on question #{payload.questionIndex + 1}.</Text>
          <Text style={styles.cardBody}>
            Play the game — your answer will be sent back to {askerLabel} so they can see what you picked.
          </Text>
          <Text style={styles.cardNote}>
            You'll see the question fresh, no answers shown.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace({
            pathname: `/games/${payload.gameId as GameId}`,
            params: {
              helpToken: token as string,
              helpQuestionIndex: String(payload.questionIndex),
              helpAskerName: payload.askerName ?? '',
            },
          })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Help with {meta?.title ?? 'the Game'} →</Text>
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
  helpBanner: {
    backgroundColor: C.ink,
    padding: 20,
    marginBottom: 20,
  },
  helpFrom: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.onDarkDim,
    marginBottom: 6,
  },
  helpGame: {
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
