import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Masthead } from '@/components/Masthead';
import { C, F, cardShadow } from '@/constants/theme';
import { GAME_META, VISIBLE_GAMES, GameId } from '@/constants/data';
import { useGame } from '@/context/GameContext';

export default function StatsScreen() {
  const { state } = useGame();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Masthead />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Your Record</Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.totalCard}>
          <View style={styles.cardInnerBorder} />
          <Text style={styles.totalLabel}>Total Points</Text>
          <Text style={styles.totalValue}>{state.stats.totalPoints}</Text>
        </View>

        {VISIBLE_GAMES.map((id: GameId) => {
          const meta = GAME_META[id];
          const stats = state.stats[id];
          const accuracy =
            stats.played > 0 ? Math.round((stats.correct / stats.played) * 100) : 0;

          return (
            <View key={id} style={styles.gameCard}>
              <View style={styles.gameCardInnerBorder} />
              <View style={styles.gameHeader}>
                <Text style={styles.gameNum}>{meta.num}</Text>
                <Text style={styles.gameName}>{meta.title}</Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{stats.streak}</Text>
                  <Text style={styles.statLabel}>Current{'\n'}Streak</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{stats.bestStreak}</Text>
                  <Text style={styles.statLabel}>Best{'\n'}Streak</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{accuracy}%</Text>
                  <Text style={styles.statLabel}>Accuracy</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{stats.played}</Text>
                  <Text style={styles.statLabel}>Rounds{'\n'}Played</Text>
                </View>
              </View>
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Noodle Bowl · Solo Edition</Text>
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
    marginBottom: 20,
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
  totalCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.ink,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    ...cardShadow,
  },
  cardInnerBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(232,238,243,0.15)',
    pointerEvents: 'none',
  },
  totalLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.onDarkDim,
    marginBottom: 8,
  },
  totalValue: {
    fontFamily: F.frauncesXBold,
    fontSize: 52,
    color: C.onDark,
    lineHeight: 58,
  },
  gameCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 24,
    marginBottom: 16,
    ...cardShadow,
  },
  gameCardInnerBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(42,36,29,0.15)',
    pointerEvents: 'none',
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
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: C.paperDarker,
  },
  statValue: {
    fontFamily: F.frauncesXBold,
    fontSize: 24,
    color: C.ink,
    lineHeight: 28,
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
