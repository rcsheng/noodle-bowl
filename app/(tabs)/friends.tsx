import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot } from 'firebase/firestore';

import { Masthead } from '@/components/Masthead';
import { AuthGateTab } from '@/components/AuthGateTab';
import { C, F, cardShadow } from '@/constants/theme';
import { GAME_META } from '@/constants/data';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { formatRelativeDate } from '@/constants/utils';
import { db } from '@/lib/firebase';
import { GameId } from '@/constants/data';

export default function FriendsScreen() {
  const { isAnonymous } = useAuth();
  const { state, addFriendInteraction } = useGame();
  const { streakShieldsAvailable } = state.stats;
  const { friendInteractions } = state;
  const unsubscribeRefs = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    if (isAnonymous) return;

    const resolvedChallengeTokens = new Set(
      friendInteractions.filter(i => i.type === 'challenge_accepted' && i.token).map(i => i.token!)
    );
    const resolvedHelpTokens = new Set(
      friendInteractions.filter(i => i.type === 'received_help' && i.token).map(i => i.token!)
    );

    friendInteractions
      .filter(i => i.type === 'sent_challenge' && i.token)
      .forEach(sent => {
        const token = sent.token!;
        if (resolvedChallengeTokens.has(token) || unsubscribeRefs.current.has(token)) return;

        const unsub = onSnapshot(doc(db, 'challenges', token), (snap) => {
          const data = snap.data();
          if (!data?.resolvedAt) return;
          addFriendInteraction({
            type: 'challenge_accepted',
            friendName: sent.friendName,
            gameId: data.gameId as GameId,
            questionIndex: data.questionIndex as number,
            shieldEarned: false,
            token,
            senderPrediction: sent.senderPrediction,
            friendAnswer: data.friendAnswer as string,
          });
          unsubscribeRefs.current.get(token)?.();
          unsubscribeRefs.current.delete(token);
        });

        unsubscribeRefs.current.set(token, unsub);
      });

    friendInteractions
      .filter(i => i.type === 'sent_help' && i.token)
      .forEach(sent => {
        const token = sent.token!;
        if (resolvedHelpTokens.has(token) || unsubscribeRefs.current.has(token)) return;

        const unsub = onSnapshot(doc(db, 'helpRequests', token), (snap) => {
          const data = snap.data();
          if (!data?.resolvedAt) return;
          addFriendInteraction({
            type: 'received_help',
            friendName: 'A Friend',
            gameId: data.gameId as GameId,
            questionIndex: data.questionIndex as number,
            shieldEarned: false,
            token,
            friendAnswer: data.helperAnswer as string,
          });
          unsubscribeRefs.current.get(token)?.();
          unsubscribeRefs.current.delete(token);
        });

        unsubscribeRefs.current.set(token, unsub);
      });

    return () => {
      unsubscribeRefs.current.forEach(unsub => unsub());
      unsubscribeRefs.current.clear();
    };
  }, [friendInteractions, addFriendInteraction, isAnonymous]);

  if (isAnonymous) {
    return (
      <AuthGateTab
        title="Sign in to see friend activity"
        body="Challenge friends, ask for help, and earn streak shields together."
      />
    );
  }

  const acceptedMap = new Map<string, typeof friendInteractions[0]>();
  friendInteractions.forEach(i => {
    if (i.type === 'challenge_accepted') {
      acceptedMap.set(`${i.gameId}|${i.questionIndex}|${i.friendName}`, i);
    }
  });

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  oneWeekAgo.setHours(0, 0, 0, 0);

  const thisWeek = friendInteractions.filter(i => {
    const d = new Date(i.date + 'T00:00:00');
    return d >= oneWeekAgo;
  });
  const helpedMe = thisWeek.filter(i => i.type === 'received_help').length;
  const iHelped = thisWeek.filter(i => i.type === 'gave_help').length;
  const weekShieldsEarned = thisWeek.filter(i => i.shieldEarned).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Masthead />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Streak Shields</Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.shieldCard}>
          <View style={styles.cardInnerBorder} />
          <View style={styles.shieldSlots}>
            {Array.from({ length: 3 }).map((_, i) => (
              <View
                key={i}
                style={[styles.shieldSlot, i < streakShieldsAvailable && styles.shieldSlotFilled]}
              >
                <Text style={styles.shieldSlotText}>
                  {i < streakShieldsAvailable ? '🛡' : '—'}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.shieldCount}>
            {streakShieldsAvailable === 0
              ? 'No shields available'
              : `${streakShieldsAvailable} shield${streakShieldsAvailable > 1 ? 's' : ''} available`}
          </Text>
          <Text style={styles.shieldExplainer}>
            Shields protect your streak if you miss a day.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Friend Activity</Text>
          <View style={styles.sectionLine} />
        </View>

        {friendInteractions.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.cardInnerBorder} />
            <Text style={styles.emptyTitle}>No friend activity yet.</Text>
            <Text style={styles.emptyBody}>
              Tap{' '}
              <Text style={styles.emptyBold}>Ask a Friend for Help</Text>
              {' '}the next time you're stuck — they'll see just the question, no answers.{'\n\n'}
              You both earn a streak shield when they respond.
            </Text>
          </View>
        ) : (
          <>
            {(helpedMe > 0 || iHelped > 0) && (
              <View style={styles.weekCard}>
                <View style={styles.cardInnerBorder} />
                <Text style={styles.weekLabel}>This Week</Text>
                <View style={styles.weekRow}>
                  <Text style={styles.weekStat}>
                    {helpedMe} friend{helpedMe !== 1 ? 's' : ''} helped you
                  </Text>
                  <Text style={styles.weekDot}> · </Text>
                  <Text style={styles.weekStat}>
                    You helped {iHelped} friend{iHelped !== 1 ? 's' : ''}
                  </Text>
                </View>
                {weekShieldsEarned > 0 && (
                  <Text style={styles.weekShields}>
                    🛡 {weekShieldsEarned} shield{weekShieldsEarned !== 1 ? 's' : ''} earned this week
                  </Text>
                )}
              </View>
            )}

            {friendInteractions.map(interaction => {
              const meta = GAME_META[interaction.gameId];
              let icon = '📤';
              let line: React.ReactNode;
              let resolvedEntry: typeof friendInteractions[0] | undefined;

              if (interaction.type === 'received_help') {
                icon = '📩';
                line = <><Text style={styles.feedBold}>{interaction.friendName}</Text>{' helped you with '}{meta.title}</>;
              } else if (interaction.type === 'gave_help') {
                icon = '📤';
                line = <>{'You helped '}<Text style={styles.feedBold}>{interaction.friendName}</Text>{' with '}{meta.title}</>;
              } else if (interaction.type === 'sent_help') {
                icon = '🙋';
                line = <>{'You asked a friend for help with '}{meta.title}</>;
              } else if (interaction.type === 'sent_challenge') {
                icon = '⚔️';
                line = <>{'You challenged '}<Text style={styles.feedBold}>{interaction.friendName}</Text>{' to '}{meta.title}</>;
                resolvedEntry = acceptedMap.get(`${interaction.gameId}|${interaction.questionIndex}|${interaction.friendName}`);
              } else if (interaction.type === 'challenge_accepted') {
                icon = '⚔️';
                line = <><Text style={styles.feedBold}>{interaction.friendName}</Text>{' accepted your challenge — '}{meta.title}</>;
              } else if (interaction.type === 'received_challenge') {
                icon = '⚔️';
                line = <><Text style={styles.feedBold}>{interaction.friendName}</Text>{' challenged you to '}{meta.title}</>;
              }

              const isPendingHelp = interaction.type === 'sent_help' &&
                !friendInteractions.some(i => i.type === 'received_help' && i.token === interaction.token);
              const isPending = (interaction.type === 'sent_challenge' && !resolvedEntry) || isPendingHelp;

              return (
                <View key={interaction.id} style={styles.feedItem}>
                  <Text style={styles.feedIcon}>{icon}</Text>
                  <View style={styles.feedBody}>
                    <Text style={styles.feedText}>{line}</Text>
                    <Text style={styles.feedMeta}>
                      {formatRelativeDate(interaction.date)}
                      {interaction.shieldEarned ? '  🛡 Shield earned' : ''}
                      {resolvedEntry?.bonusPointsEarned ? `  +${resolvedEntry.bonusPointsEarned} pts` : ''}
                    </Text>
                    {interaction.type === 'sent_challenge' && isPending && (
                      <Text style={[styles.feedMeta, styles.feedPending]}>Waiting for them to play…</Text>
                    )}
                    {isPendingHelp && (
                      <Text style={[styles.feedMeta, styles.feedPending]}>Waiting for a friend to help…</Text>
                    )}
                    {resolvedEntry && interaction.senderPrediction && (
                      <View style={styles.predictionReveal}>
                        <View style={styles.predictionRow}>
                          <Text style={styles.predictionLabel}>You picked</Text>
                          <Text style={styles.predictionValue}>{interaction.senderPrediction}</Text>
                        </View>
                        <View style={styles.predictionRow}>
                          <Text style={styles.predictionLabel}>{interaction.friendName} picked</Text>
                          <Text style={styles.predictionValue}>{resolvedEntry.friendAnswer ?? '—'}</Text>
                        </View>
                        {(() => {
                          const predictionCorrect = interaction.senderPrediction === resolvedEntry.friendAnswer;
                          return (
                            <Text style={[styles.predictionResult, predictionCorrect ? styles.predictionCorrect : styles.predictionWrong]}>
                              {predictionCorrect ? '✓ You called it' : '✗ Off this time'}
                            </Text>
                          );
                        })()}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Noodle Bowl · Friends</Text>
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
  shieldCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paperDark,
    padding: 24,
    marginBottom: 24,
    ...cardShadow,
  },
  shieldSlots: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  shieldSlot: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: C.paperDarker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldSlotFilled: {
    borderColor: C.accent,
    backgroundColor: 'rgba(184,74,53,0.06)',
  },
  shieldSlotText: {
    fontSize: 18,
    lineHeight: 22,
  },
  shieldCount: {
    fontFamily: F.frauncesSemiBold,
    fontSize: 16,
    color: C.ink,
    marginBottom: 6,
  },
  shieldExplainer: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 28,
    ...cardShadow,
  },
  emptyTitle: {
    fontFamily: F.frauncesBold,
    fontSize: 18,
    color: C.ink,
    marginBottom: 12,
  },
  emptyBody: {
    fontFamily: F.fraunces,
    fontSize: 15,
    color: C.muted,
    lineHeight: 24,
  },
  emptyBold: {
    fontFamily: F.frauncesBold,
    color: C.ink,
  },
  weekCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paperDark,
    padding: 20,
    marginBottom: 20,
    ...cardShadow,
  },
  weekLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 10,
  },
  weekRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekStat: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.ink,
  },
  weekDot: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
  },
  weekShields: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.ink,
    marginTop: 8,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.paperDarker,
  },
  feedIcon: {
    fontSize: 20,
    lineHeight: 24,
    marginTop: 2,
  },
  feedBody: {
    flex: 1,
  },
  feedText: {
    fontFamily: F.fraunces,
    fontSize: 15,
    color: C.ink,
    lineHeight: 22,
    marginBottom: 4,
  },
  feedBold: {
    fontFamily: F.frauncesBold,
  },
  feedMeta: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.muted,
  },
  feedPending: {
    marginTop: 2,
    fontStyle: 'italic',
  },
  predictionReveal: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.paperDarker,
    gap: 4,
  },
  predictionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  predictionLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.muted,
    width: 90,
  },
  predictionValue: {
    fontFamily: F.frauncesBold,
    fontSize: 13,
    color: C.ink,
    flex: 1,
  },
  predictionResult: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  predictionCorrect: {
    color: C.green,
  },
  predictionWrong: {
    color: C.accent,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  footerText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
  },
});
