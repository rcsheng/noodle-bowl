import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';

import { ChallengeReplyCard } from '@/components/ChallengeReplyCard';
import { HelpResultCard } from '@/components/HelpResultCard';
import { Masthead } from '@/components/Masthead';
import { ShieldSavedBanner } from '@/components/ShieldSavedBanner';
import { C, F, cardShadow } from '@/constants/theme';
import { GAME_META, VISIBLE_GAMES, GameId } from '@/constants/data';
import { getTodayISODate } from '@/constants/utils';
import { useContent } from '@/context/ContentContext';
import { useGame } from '@/context/GameContext';
import { db } from '@/lib/firebase';
import { CHALLENGES, HELP_REQUESTS } from '@/lib/collections';
import { evaluateHelperAnswer } from '@/lib/helpAnswerEvaluator';

function getSectionDate(): string {
  const d = new Date();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${weekday} ${month} ${d.getDate()}`;
}

export default function HubScreen() {
  const { state, dismissHelpCard, removeFriendInteraction, dismissStreakSavedBanner } = useGame();
  const { banks } = useContent();
  const { totalPoints, dailyStreak, streakShieldUsedToday, streakSavedBannerSeen } = state.stats;
  const showStreakSavedBanner = streakShieldUsedToday && !streakSavedBannerSeen;
  const assists = state.friendInteractions.filter(i => i.type === 'gave_help').length;
  const today = getTodayISODate();

  const candidateHelpResults = state.friendInteractions.filter(
    i => i.type === 'received_help' && i.token && !i.homeCardDismissed,
  );
  const candidateChallengeResults = state.friendInteractions.filter(
    i => i.type === 'challenge_accepted' && i.token && !i.homeCardDismissed,
  );

  const [validatedTokens, setValidatedTokens] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    const checks: { interaction: typeof state.friendInteractions[0]; collection: string }[] = [
      ...candidateHelpResults
        .filter(i => !validatedTokens.has(i.token!))
        .map(i => ({ interaction: i, collection: HELP_REQUESTS })),
      ...candidateChallengeResults
        .filter(i => !validatedTokens.has(i.token!))
        .map(i => ({ interaction: i, collection: CHALLENGES })),
    ];
    if (checks.length === 0) return;

    Promise.all(
      checks.map(async ({ interaction, collection }) => {
        try {
          const snap = await getDoc(doc(db, collection, interaction.token!));
          if (snap.exists() && snap.data()?.resolvedAt) return { interaction, live: true };
          return { interaction, live: false };
        } catch {
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

        <ShieldSavedBanner visible={showStreakSavedBanner} onDismiss={dismissStreakSavedBanner} />

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
          <Text style={styles.sectionLabel}>Today's Bowl · {getSectionDate()}</Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.gameList}>
          {VISIBLE_GAMES.map((id: GameId) => {
            const meta = GAME_META[id];
            const gameStats = state.stats[id];
            const playedToday = gameStats.lastPlayed === today;
            const pts = gameStats.lastPoints;
            return (
              <TouchableHighlight
                key={id}
                style={styles.gameRow}
                underlayColor={C.paperDark}
                activeOpacity={1}
                onPress={() => router.push(`/games/${id}`)}
              >
                <View style={styles.gameRowInner}>
                  <Text style={styles.rowNum}>{meta.num}</Text>
                  <View style={styles.rowCenter}>
                    <Text style={styles.rowTitle}>{meta.title}</Text>
                    <Text style={styles.rowTagline}>{meta.tagline}</Text>
                    <Text style={styles.rowMeta}>{meta.meta.join(' · ')}</Text>
                  </View>
                  <View style={styles.rowTrailingWrapper}>
                    {playedToday ? (
                      <>
                        <Text style={styles.rowTrailingPlayed}>
                          {pts !== undefined ? `✓ +${pts}` : '✓'}
                        </Text>
                        <Text style={styles.rowPlayAgain}>PLAY AGAIN</Text>
                      </>
                    ) : (
                      <View style={styles.playBtn}>
                        <Text style={styles.playBtnText}>PLAY</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableHighlight>
            );
          })}
        </View>

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
  gameList: {
    borderTopWidth: 1,
    borderTopColor: C.rule,
    marginBottom: 24,
  },
  gameRow: {
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
  },
  gameRowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 18,
  },
  rowNum: {
    width: 52,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: C.muted,
    paddingTop: 2,
  },
  rowCenter: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 22,
    lineHeight: 26,
    color: C.ink,
  },
  rowTagline: {
    fontFamily: F.fraunces,
    fontSize: 13,
    lineHeight: 18,
    color: C.muted,
    marginTop: 4,
  },
  rowMeta: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    marginTop: 6,
  },
  rowTrailingWrapper: {
    paddingLeft: 12,
    paddingTop: 2,
    alignItems: 'flex-end',
  },
  rowTrailingPlayed: {
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 1,
    color: C.gold,
    marginBottom: 4,
  },
  rowPlayAgain: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.muted,
    textDecorationLine: 'underline',
  },
  playBtn: {
    backgroundColor: C.ink,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  playBtnText: {
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.onDark,
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
