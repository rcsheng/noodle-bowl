import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Masthead } from '@/components/Masthead';
import { AuthGateTab } from '@/components/AuthGateTab';
import { ShieldIcon } from '@/components/ui/ShieldIcon';
import { C, F, cardShadow } from '@/constants/theme';
import { GAME_META } from '@/constants/data';
import { useContent } from '@/context/ContentContext';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { formatRelativeDate } from '@/constants/utils';
import { evaluateHelperAnswer } from '@/lib/helpAnswerEvaluator';

export default function FriendsScreen() {
  const { isAnonymous } = useAuth();
  const { state } = useGame();
  const { banks } = useContent();
  const { streakShieldsAvailable } = state.stats;
  const { friendInteractions } = state;

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
          <Text style={styles.shieldTitle}>Your shields</Text>

          {/* 3 large shield slots */}
          <View style={styles.shieldSlotRow}>
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.shieldSlot}>
                <ShieldIcon
                  size={36}
                  variant={i < streakShieldsAvailable ? 'filled' : 'outline'}
                />
              </View>
            ))}
          </View>
          <Text style={styles.shieldSlotCaption}>
            {streakShieldsAvailable === 0
              ? 'No shields yet'
              : `${streakShieldsAvailable} of 3 shields`}
          </Text>

          <Text style={styles.shieldExplainer}>
            Each shield protects your streak for one missed week.
          </Text>

          {/* HOW IT WORKS */}
          <View style={styles.howDivider} />
          <Text style={styles.howTitle}>HOW IT WORKS</Text>
          {[
            'Ask a friend for help on a question →',
            'Friend answers your question →',
            'Friend earns a shield',
          ].map((step, i) => (
            <View key={i} style={styles.howStep}>
              <Text style={styles.howNum}>{i + 1}</Text>
              <Text style={styles.howText}>{step}</Text>
            </View>
          ))}
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
              Help a friend back, or take a challenge they send, to earn yourself a streak shield.
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

              const helpEvaluation = interaction.type === 'received_help' && interaction.friendAnswer
                ? evaluateHelperAnswer(interaction.gameId, interaction.questionIndex, interaction.friendAnswer, banks)
                : null;

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
                    {helpEvaluation && (
                      <View style={styles.predictionReveal}>
                        <View style={styles.predictionRow}>
                          <Text style={styles.predictionLabel}>{interaction.friendName} picked</Text>
                          <Text style={styles.predictionValue}>{helpEvaluation.label}</Text>
                        </View>
                        {helpEvaluation.correct !== null && (
                          <Text style={[styles.predictionResult, helpEvaluation.correct ? styles.predictionCorrect : styles.predictionWrong]}>
                            {helpEvaluation.correct ? '✓ Correct' : '✗ Wrong'}
                          </Text>
                        )}
                      </View>
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
    gap: 12,
    ...cardShadow,
  },
  shieldTitle: {
    fontFamily: F.frauncesBold,
    fontSize: 18,
    color: C.ink,
    textAlign: 'center',
  },
  shieldSlotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  shieldSlot: {
    alignItems: 'center',
  },
  shieldSlotCaption: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
    letterSpacing: 1,
  },
  shieldExplainer: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  howDivider: {
    height: 1,
    backgroundColor: C.paperDarker,
    marginVertical: 4,
  },
  howTitle: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    textAlign: 'center',
  },
  howStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  howNum: {
    fontFamily: F.monoBold,
    fontSize: 12,
    color: C.muted,
    width: 16,
  },
  howText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.ink,
    flex: 1,
    lineHeight: 18,
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
