import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Masthead } from '@/components/Masthead';
import { AuthGateTab } from '@/components/AuthGateTab';
import { C, F, cardShadow } from '@/constants/theme';
import { GAME_META, VISIBLE_GAMES, GameId } from '@/constants/data';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';

export default function StatsScreen() {
  const { isAnonymous } = useAuth();
  const { state } = useGame();

  if (isAnonymous) {
    return (
      <AuthGateTab
        title="Sign in to track your stats"
        body="Your streaks, accuracy, and lifetime points — saved and synced across devices."
      />
    );
  }
  const {
    totalPoints,
    dailyStreak,
    bestDailyStreak,
    totalDaysPlayed,
    streakShieldsAvailable,
  } = state.stats;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Masthead />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Streak & History</Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.streakCard}>
          <View style={styles.cardInnerBorder} />
          <View style={styles.streakRow}>
            <View style={styles.streakBlock}>
              <Text style={styles.streakValue}>{dailyStreak > 0 ? `🔥 ${dailyStreak}` : '—'}</Text>
              <Text style={styles.streakLabel}>Daily Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.streakBlock}>
              <Text style={styles.streakValue}>{totalDaysPlayed}</Text>
              <Text style={styles.streakLabel}>Days Played</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.streakBlock}>
              <Text style={styles.streakValue}>{bestDailyStreak > 0 ? `🏆 ${bestDailyStreak}` : '—'}</Text>
              <Text style={styles.streakLabel}>Best Streak</Text>
            </View>
          </View>
          <View style={styles.shieldCardDivider} />
          <View style={styles.shieldCardRow}>
            <Text style={styles.shieldCardValue}>
              {streakShieldsAvailable === 0 ? '—' : `🛡 ${streakShieldsAvailable}`}
            </Text>
            <Text style={styles.shieldCardLabel}>
              {streakShieldsAvailable === 1 ? 'Shield Available' : 'Shields Available'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Lifetime Points</Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.totalCard}>
          <View style={styles.totalInnerBorder} />
          <Text style={styles.totalValue}>{totalPoints}</Text>
          <Text style={styles.totalLabel}>pts</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Per-Game Breakdown</Text>
          <View style={styles.sectionLine} />
        </View>

        {VISIBLE_GAMES.map((id: GameId) => {
          const meta = GAME_META[id];
          const stats = state.stats[id];
          const accuracy =
            stats.played > 0 ? Math.round((stats.correct / stats.played) * 100) : 0;

          return (
            <View key={id} style={styles.gameCard}>
              <View style={styles.cardInnerBorder} />
              <View style={styles.gameHeader}>
                <Text style={styles.gameNum}>{meta.num}</Text>
                <Text style={styles.gameName}>{meta.title}</Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{stats.played}</Text>
                  <Text style={styles.statLabel}>Played</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{stats.correct}</Text>
                  <Text style={styles.statLabel}>Correct</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{accuracy}%</Text>
                  <Text style={styles.statLabel}>Accuracy</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{stats.bestScore > 0 ? `+${stats.bestScore}` : '—'}</Text>
                  <Text style={styles.statLabel}>Best</Text>
                </View>
              </View>
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Noodle Bowl · Stats</Text>
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
  streakCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paperDark,
    padding: 20,
    marginBottom: 12,
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
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBlock: {
    flex: 1,
    alignItems: 'center',
  },
  streakValue: {
    fontFamily: F.frauncesXBold,
    fontSize: 24,
    color: C.ink,
    lineHeight: 30,
  },
  streakLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: C.paperDarker,
  },
  shieldCardDivider: {
    height: 1,
    backgroundColor: C.paperDarker,
    marginTop: 16,
    marginBottom: 14,
  },
  shieldCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shieldCardValue: {
    fontFamily: F.frauncesXBold,
    fontSize: 18,
    color: C.ink,
    lineHeight: 22,
  },
  shieldCardLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
  },
  totalCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.ink,
    padding: 24,
    marginBottom: 28,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...cardShadow,
  },
  totalInnerBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(232,238,243,0.15)',
    pointerEvents: 'none',
  },
  totalValue: {
    fontFamily: F.frauncesXBold,
    fontSize: 52,
    color: C.onDark,
    lineHeight: 58,
  },
  totalLabel: {
    fontFamily: F.mono,
    fontSize: 14,
    letterSpacing: 1.5,
    color: C.onDarkDim,
    alignSelf: 'flex-end',
    paddingBottom: 6,
  },
  gameCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 24,
    marginBottom: 16,
    ...cardShadow,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 20,
  },
  gameNum: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
  },
  gameName: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 20,
    color: C.ink,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: F.frauncesXBold,
    fontSize: 22,
    color: C.ink,
    lineHeight: 26,
  },
  statLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    marginTop: 4,
    textAlign: 'center',
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
