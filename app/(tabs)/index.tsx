import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';

import { ChallengeReplyCard } from '@/components/ChallengeReplyCard';
import { HelpResultCard } from '@/components/HelpResultCard';
import { Masthead } from '@/components/Masthead';
import { ShieldSavedBanner } from '@/components/ShieldSavedBanner';
import { ShieldSavedModal } from '@/components/ShieldSavedModal';
import { StreakAtRiskBanner } from '@/components/StreakAtRiskBanner';
import { StreakIgnitionModal } from '@/components/StreakIgnitionModal';
import { C, F } from '@/constants/theme';
import { GAME_META, VISIBLE_GAMES, GameId } from '@/constants/data';
import { getTodayISODate } from '@/constants/utils';
import { useContent } from '@/context/ContentContext';
import { computeActiveWeek, computeCurrentWeek, getWeekDateRange, isPlayedThisWeek } from '@/lib/contentWeek';
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
  const { state, dismissHelpCard, removeFriendInteraction, dismissStreakSavedBanner, dismissOnboardingFlag, dismissAtRisk } = useGame();
  const { banks, contentWeek, reload } = useContent();
  const {
    streakShieldUsedThisWeek,
    streakSavedBannerSeen,
    weeklyStreak,
    totalWeeksPlayed,
    lastPlayedWeek,
    streakShieldsAvailable,
    onboarding,
  } = state.stats;
  const today = getTodayISODate();

  // §1a Streak Ignition — once, after first week of play
  const showIgnitionModal = totalWeeksPlayed === 1 && weeklyStreak === 1 && !onboarding.streakIntroSeen;

  // §1d Shield Saved — first time only; subsequent saves use the inline banner
  const showShieldSavedModal =
    !showIgnitionModal &&
    streakShieldUsedThisWeek &&
    !streakSavedBannerSeen &&
    !onboarding.firstShieldSaveSeen;

  // Existing inline banner (subsequent shield saves)
  const showStreakSavedBanner =
    !showShieldSavedModal && streakShieldUsedThisWeek && !streakSavedBannerSeen;

  // §1e At-Risk Banner — Sat/Sun, streak≥2, not played this week, not dismissed
  const currentWeek = computeCurrentWeek();
  const dayOfWeek = new Date().getDay(); // 0=Sun … 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const showAtRiskBanner =
    isWeekend &&
    weeklyStreak >= 2 &&
    lastPlayedWeek !== currentWeek &&
    onboarding.atRiskWeekDismissed !== currentWeek;

  const candidateHelpResults = state.friendInteractions.filter(
    i => i.type === 'received_help' && i.token && !i.homeCardDismissed,
  );
  const candidateChallengeResults = state.friendInteractions.filter(
    i => i.type === 'challenge_accepted' && i.token && !i.homeCardDismissed,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
    await reload();
    setRefreshing(false);
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const [validatedTokens, setValidatedTokens] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    // challenge_accepted interactions are already verified by GameContext's onSnapshot
    // (it only adds them after confirming resolvedAt is set), so no re-validation needed.
    const checks: { interaction: typeof state.friendInteractions[0]; collection: string }[] = [
      ...candidateHelpResults
        .filter(i => !validatedTokens.has(i.token!))
        .map(i => ({ interaction: i, collection: HELP_REQUESTS })),
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
    refreshKey,
  ]);

  const helpResults = candidateHelpResults.filter(i => validatedTokens.has(i.token!));
  const challengeResults = candidateChallengeResults;
  const hasReplies = helpResults.length > 0 || challengeResults.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Masthead />

        {/* §1e At-Risk Banner — Sat/Sun nudge when streak hasn't been played this week */}
        {showAtRiskBanner && (
          <StreakAtRiskBanner
            weeklyStreak={weeklyStreak}
            shieldsAvailable={streakShieldsAvailable}
            onDismiss={() => dismissAtRisk(currentWeek)}
          />
        )}

        {/* §1d Inline banner for subsequent shield saves (§1d first-time is a modal below) */}
        <ShieldSavedBanner visible={showStreakSavedBanner} onDismiss={dismissStreakSavedBanner} />

        {/* §1a Streak Ignition Modal — rendered here, dismissed after first game week */}
        <StreakIgnitionModal
          visible={showIgnitionModal}
          weeklyStreak={weeklyStreak}
          onDismiss={() => dismissOnboardingFlag('streakIntroSeen')}
        />

        {/* §1d Shield Saved Modal — first time only; shown instead of the inline banner */}
        <ShieldSavedModal
          visible={showShieldSavedModal}
          weeklyStreak={weeklyStreak}
          shieldsRemaining={streakShieldsAvailable}
          onDismiss={() => {
            dismissOnboardingFlag('firstShieldSaveSeen');
            dismissStreakSavedBanner();
          }}
        />

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
              const isGameCompleted = state.stats[interaction.gameId].lastPlayed === today;
              const askerEval = interaction.askerAnswer
                ? evaluateHelperAnswer(interaction.gameId, interaction.questionIndex, interaction.askerAnswer, banks)
                : null;
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
                  isGameCompleted={isGameCompleted}
                  askerAnswerLabel={askerEval?.label}
                  onPlay={isGameCompleted ? undefined : () => router.push({
                    pathname: `/games/${interaction.gameId}` as any,
                    params: {
                      hintQuestionIndex: String(interaction.questionIndex),
                      friendHint: interaction.friendAnswer ?? '',
                      hintToken: interaction.token ?? '',
                      hintContentWeek: interaction.contentWeek ?? '',
                    },
                  })}
                />
              );
            })}
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>
            {`Games based on last week's news · ${getWeekDateRange(contentWeek || computeActiveWeek())}`}
          </Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.gameList}>
          {VISIBLE_GAMES.map((id: GameId) => {
            const meta = GAME_META[id];
            const gameStats = state.stats[id];
            const completedThisWeek = isPlayedThisWeek(gameStats.lastPlayed, computeCurrentWeek());
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
                    {completedThisWeek ? (
                      <>
                        <Text style={styles.rowTrailingPlayed}>✓</Text>
                        <Text style={styles.rowCompleted}>COMPLETED</Text>
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
  rowCompleted: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.muted,
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
