import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Masthead } from '@/components/Masthead';
import { C, F, cardShadow } from '@/constants/theme';
import { GAME_META, VISIBLE_GAMES, GameId } from '@/constants/data';
import { useGame } from '@/context/GameContext';

export default function HubScreen() {
  const { state } = useGame();

  const totalPlayed = VISIBLE_GAMES.reduce((sum, id) => sum + state.stats[id].played, 0);
  const totalCorrect = VISIBLE_GAMES.reduce((sum, id) => sum + state.stats[id].correct, 0);
  const accuracy = totalPlayed > 0 ? Math.round((totalCorrect / totalPlayed) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Masthead />

        <View style={styles.introCard}>
          <View style={styles.cardInnerBorder} />
          <Text style={styles.introText}>
            Four games. Real news. Curiosity required.
          </Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.cardInnerBorder} />
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{state.stats.totalPoints}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{accuracy}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{totalPlayed}</Text>
              <Text style={styles.statLabel}>Rounds</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Today's Games</Text>
          <View style={styles.sectionLine} />
        </View>

        {VISIBLE_GAMES.map((id: GameId) => {
          const meta = GAME_META[id];
          const stats = state.stats[id];
          return (
            <TouchableOpacity
              key={id}
              style={styles.gameCard}
              onPress={() => router.push(`/games/${id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.gameCardHeader}>
                <View style={styles.gameCardHeaderLeft}>
                  <Text style={styles.gameNum}>{meta.num}</Text>
                  <Text style={styles.gameSection}>{meta.section}</Text>
                </View>
                <View style={styles.playBadge}>
                  <Text style={styles.playBadgeText}>Play →</Text>
                </View>
              </View>

              <View style={styles.gameCardBody}>
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
                </View>

                {stats.streak > 0 && (
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakText}>🔥 {stats.streak} streak</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
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
  introCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 20,
    marginBottom: 16,
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
  introText: {
    fontFamily: F.frauncesItalic,
    fontSize: 18,
    color: C.ink,
    lineHeight: 26,
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
  gameCardHeader: {
    backgroundColor: C.ink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gameNum: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.onDarkDim,
    textTransform: 'uppercase',
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
  streakBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 12,
  },
  streakText: {
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 1.2,
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
