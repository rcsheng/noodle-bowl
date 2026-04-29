import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';

import { ChallengeReplyCard } from '@/components/ChallengeReplyCard';
import { HelpResultCard } from '@/components/HelpResultCard';
import { Masthead } from '@/components/Masthead';
import { C, F, cardShadow } from '@/constants/theme';
import { GAME_META, VISIBLE_GAMES, GameId } from '@/constants/data';
import { getTodayISODate } from '@/constants/utils';
import { useContent } from '@/context/ContentContext';
import { useGame } from '@/context/GameContext';
import { db } from '@/lib/firebase';
import { evaluateHelperAnswer } from '@/lib/helpAnswerEvaluator';

export default function HubScreen() {
  const { state, dismissHelpCard, removeFriendInteraction } = useGame();
  const { banks } = useContent();
  const { totalPoints, dailyStreak } = state.stats;
  const assists = state.friendInteractions.filter(i => i.type === 'gave_help').length;
  const today = getTodayISODate();

  const candidateHelpResults = state.friendInteractions.filter(
    i => i.type === 'received_help' && i.token && !i.homeCardDismissed,
  );
  const candidateChallengeResults = state.friendInteractions.filter(
    i => i.type === 'challenge_accepted' && i.token && !i.homeCardDismissed,
  );

  // Verify each candidate against Firestore — only render cards that have a
  // live, resolved doc. Orphans are GC'd from local state. Help cards check
  // helpRequests/{token}; challenge cards check challenges/{token}.
  const [validatedTokens, setValidatedTokens] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    const checks: { interaction: typeof state.friendInteractions[0]; collection: string }[] = [
      ...candidateHelpResults
        .filter(i => !validatedTokens.has(i.token!))
        .map(i => ({ interaction: i, collection: 'helpRequests' })),
      ...candidateChallengeResults
        .filter(i => !validatedTokens.has(i.token!))
        .map(i => ({ interaction: i, collection: 'challenges' })),
    ];
    if (checks.length === 0) return;

    Promise.all(
      checks.map(async ({ interaction, collection }) => {
        try {
          const snap = await getDoc(doc(db, collection, interaction.token!));
          if (snap.exists() && snap.data()?.resolvedAt) return { interaction, live: true };
          return { interaction, live: false };
        } catch {
          // Network error: don't GC, just skip this round.
          return { interaction, live: null };
        }
      }),
    ).then(results => {
      if (cancelled) return;
      const live = results.filter(r => r.live === true).map(r => r.interaction.token!);
      const orphans = results.filter(r => r.live === false).map(r => r.interaction.id);
      if (live.length > 0) {
        setValidatedTokens(prev => {
          const next = new Set(prev);
          live.forEach(t => next.add(t));
          return next;
        });
      }
      orphans.forEach(id => removeFriendInteraction(id));
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    candidateHelpResults.map(i => i.token).join('|'),
    candidateChallengeResults.map(i => i.token).join('|'),
  ]);

  const helpResults = candidateHelpResults.filter(i => validatedTokens.has(i.token!));
  const challengeResults = candidateChallengeResults.filter(i => validatedTokens.has(i.token!));
  const hasReplies = helpResults.length > 0 || challengeResults.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Masthead />

        <View style={styles.statsCard}>
          <View style={styles.cardInnerBorder} />
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{totalPoints}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{dailyStreak > 0 ? `🔥 ${dailyStreak}` : 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{assists}</Text>
              <Text style={styles.statLabel}>Assists</Text>
            </View>
          </View>
        </View>

        {hasReplies && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Friend Replies</Text>
              <View style={styles.sectionLine} />
            </View>
            {challengeResults.map(interaction => {
              const evaluation = evaluateHelperAnswer(
                interaction.gameId,
                interaction.questionIndex,
                interaction.friendAnswer ?? '',
                banks,
              );
              const predictionCorrect =
                !!interaction.senderPrediction &&
                interaction.senderPrediction === interaction.friendAnswer;
              return (
                <ChallengeReplyCard
                  key={interaction.id}
                  friendName={interaction.friendName}
                  gameTitle={GAME_META[interaction.gameId].title}
                  questionText={evaluation.questionText}
                  friendAnswerLabel={evaluation.label}
                  correctLabel={evaluation.correctLabel}
                  friendCorrect={evaluation.correct}
                  predictionLabel={interaction.senderPrediction ?? '—'}
                  predictionCorrect={predictionCorrect}
                  onDismiss={() => dismissHelpCard(interaction.token!)}
                />
              );
            })}
            {helpResults.map(interaction => {
              const evaluation = evaluateHelperAnswer(
                interaction.gameId,
                interaction.questionIndex,
                interaction.friendAnswer ?? '',
                banks,
              );
              return (
                <HelpResultCard
                  key={interaction.id}
                  friendName={interaction.friendName}
                  gameTitle={GAME_META[interaction.gameId].title}
                  questionText={evaluation.questionText}
                  answerLabel={evaluation.label}
                  correctLabel={evaluation.correctLabel}
                  correct={evaluation.correct}
                  onDismiss={() => dismissHelpCard(interaction.token!)}
                />
              );
            })}
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Today's Games</Text>
          <View style={styles.sectionLine} />
        </View>

        {VISIBLE_GAMES.map((id: GameId, index: number) => {
          const meta = GAME_META[id];
          const isAnchor = index === 0;
          const gameStats = state.stats[id];
          const playedToday = gameStats.lastPlayed === today;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.gameCard, isAnchor && styles.gameCardAnchor, playedToday && styles.gameCardPlayed]}
              onPress={() => router.push(`/games/${id}`)}
              activeOpacity={0.85}
            >
              <View style={[styles.gameCardHeader, isAnchor && styles.gameCardHeaderAnchor]}>
                <View style={styles.gameCardHeaderLeft}>
                  <Text style={[styles.gameNum, isAnchor && styles.gameNumAnchor]}>{meta.num}</Text>
                  <Text style={styles.gameSection}>{meta.section}</Text>
                </View>
                {playedToday ? (
                  <View style={styles.playedBadge}>
                    <Text style={styles.playedBadgeText}>Played ✓</Text>
                  </View>
                ) : (
                  <View style={styles.playBadge}>
                    <Text style={styles.playBadgeText}>Play →</Text>
                  </View>
                )}
              </View>

              <View style={[styles.gameCardBody, isAnchor && styles.gameCardBodyAnchor]}>
                <View style={styles.cardInnerBorder} />
                <Text style={styles.gameTitle}>{meta.title}</Text>
                <Text style={styles.gameTagline}>{meta.tagline}</Text>

                <View style={styles.metaRow}>
                  {meta.meta.map((dot, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <Text style={styles.metaDot}> · </Text>}
                      <Text style={styles.metaText}>{dot}</Text>
                    </React.Fragment>
                  ))}
                  {playedToday && gameStats.lastPoints !== undefined && (
                    <>
                      <Text style={styles.metaDot}> · </Text>
                      <View style={styles.scorePill}>
                        <Text style={styles.scorePillText}>+{gameStats.lastPoints} pts</Text>
                      </View>
                      <Text style={styles.metaDot}> · </Text>
                      <Text style={styles.metaText}>Play Again</Text>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Noodle Bowl</Text>
        </View>
      </ScrollView>
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
  statsCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paperDark,
    padding: 20,
    marginBottom: 24,
    ...cardShadow,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: F.frauncesXBold,
    fontSize: 28,
    color: C.ink,
    lineHeight: 34,
  },
  statLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.paperDarker,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  gameCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    marginBottom: 20,
    ...cardShadow,
    overflow: 'hidden',
  },
  gameCardAnchor: {
    borderColor: C.gold,
  },
  gameCardHeader: {
    backgroundColor: C.ink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameCardHeaderAnchor: {
    backgroundColor: C.ink,
  },
  gameCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  gameNum: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.onDarkDim,
    textTransform: 'uppercase',
  },
  gameNumAnchor: {
    color: C.gold,
  },
  gameSection: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.onDark,
    textTransform: 'uppercase',
  },
  playBadge: {
    borderWidth: 1,
    borderColor: C.onDarkDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  playBadgeText: {
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.onDark,
    textTransform: 'uppercase',
  },
  gameCardBody: {
    padding: 24,
  },
  gameCardBodyAnchor: {
    paddingVertical: 28,
  },
  gameTitle: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 28,
    color: C.ink,
    lineHeight: 32,
    marginBottom: 8,
  },
  gameTagline: {
    fontFamily: F.fraunces,
    fontSize: 15,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
  },
  metaDot: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
  },
  gameCardPlayed: {
    opacity: 0.85,
  },
  playedBadge: {
    borderWidth: 1,
    borderColor: C.green,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  playedBadgeText: {
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.green,
    textTransform: 'uppercase',
  },
  scorePill: {
    backgroundColor: C.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  scorePillText: {
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: C.onDark,
    textTransform: 'uppercase',
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
});
