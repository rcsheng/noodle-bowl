import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Masthead } from '@/components/Masthead';
import { AuthGateTab } from '@/components/AuthGateTab';
import { ShieldIcon } from '@/components/ui/ShieldIcon';
import { C, F, cardShadow } from '@/constants/theme';
import { GAME_META, VISIBLE_GAMES, GameId } from '@/constants/data';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';

const MAX_SHIELDS = 3;
const WEEK_CHAIN_LENGTH = 6;

/** Return the short label for a weekId, e.g. "W21" */
function weekLabel(weekId: string): string {
  const m = weekId.match(/W(\d+)$/);
  return m ? `W${m[1]}` : weekId.slice(-3);
}

export default function StatsScreen() {
  const { isAnonymous } = useAuth();
  const { state } = useGame();

  if (isAnonymous) {
    return (
      <AuthGateTab
        title="Sign in to track your stats"
        body="Your streaks, accuracy, and history — saved and synced across devices."
      />
    );
  }
  const {
    weeklyStreak,
    bestWeeklyStreak,
    totalWeeksPlayed,
    streakShieldsAvailable,
    recentPlayedWeeks,
    shieldSaveWeeks,
  } = state.stats;

  // Build the week-chain display: last N played weeks, most-recent last
  const chainWeeks = (Array.isArray(recentPlayedWeeks) ? recentPlayedWeeks : []).slice(-WEEK_CHAIN_LENGTH);
  const shieldWeekSet = new Set(Array.isArray(shieldSaveWeeks) ? shieldSaveWeeks : []);

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

          {/* Top row: streak numbers */}
          <View style={styles.streakRow}>
            <View style={styles.streakBlock}>
              <Text style={styles.streakValue}>{weeklyStreak > 0 ? `🔥 ${weeklyStreak}` : '—'}</Text>
              <Text style={styles.streakLabel}>Weekly Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.streakBlock}>
              <Text style={styles.streakValue}>{Number.isFinite(totalWeeksPlayed) && totalWeeksPlayed > 0 ? totalWeeksPlayed : '—'}</Text>
              <Text style={styles.streakLabel}>Weeks Played</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.streakBlock}>
              <Text style={styles.streakValue}>{bestWeeklyStreak > 0 ? `🏆 ${bestWeeklyStreak}` : '—'}</Text>
              <Text style={styles.streakLabel}>Best Streak</Text>
            </View>
          </View>

          {/* Shield slot row */}
          <View style={styles.shieldCardDivider} />
          <Text style={styles.shieldSlotLabel}>SHIELDS</Text>
          <View style={styles.shieldSlotRow}>
            {Array.from({ length: MAX_SHIELDS }).map((_, i) => (
              <ShieldIcon
                key={i}
                size={26}
                variant={i < streakShieldsAvailable ? 'filled' : 'outline'}
              />
            ))}
            <Text style={styles.shieldCount}>
              {streakShieldsAvailable}/{MAX_SHIELDS}
            </Text>
          </View>
          <Text style={styles.shieldHint}>
            {streakShieldsAvailable === 0
              ? 'Help a friend or answer a challenge to earn one.'
              : `${streakShieldsAvailable} protect${streakShieldsAvailable > 1 ? ' your' : 's your'} streak if you miss a week.`}
          </Text>
        </View>

        {/* Week-chain card */}
        {chainWeeks.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Last {WEEK_CHAIN_LENGTH} Weeks</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.weekChainCard}>
              <View style={styles.cardInnerBorder} />
              <View style={styles.weekChain}>
                {chainWeeks.map((weekId, i) => {
                  const isShield = shieldWeekSet.has(weekId);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.weekBrick,
                        isShield ? styles.weekBrickShield : styles.weekBrickDone,
                      ]}
                    >
                      <Text style={[styles.weekBrickLabel, isShield && styles.weekBrickLabelGold]}>
                        {weekLabel(weekId)}
                      </Text>
                      {isShield && (
                        <ShieldIcon size={10} variant="gold" />
                      )}
                    </View>
                  );
                })}
                {/* Placeholder for future weeks up to chain length */}
                {Array.from({ length: Math.max(0, WEEK_CHAIN_LENGTH - chainWeeks.length) }).map((_, i) => (
                  <View key={`future-${i}`} style={[styles.weekBrick, styles.weekBrickFuture]}>
                    <Text style={styles.weekBrickLabelMuted}>—</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.weekChainCaption}>
                🛡 = shield saved your streak that week
              </Text>
            </View>
          </>
        )}

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
  shieldSlotLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 10,
    textAlign: 'center',
  },
  shieldSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  shieldCount: {
    fontFamily: F.monoBold,
    fontSize: 13,
    color: C.muted,
    marginLeft: 4,
  },
  shieldHint: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  weekChainCard: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 20,
    marginBottom: 12,
    ...cardShadow,
  },
  weekChain: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  weekBrick: {
    flex: 1,
    minWidth: 40,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 4,
    borderRadius: 4,
  },
  weekBrickDone: {
    backgroundColor: C.ink,
  },
  weekBrickShield: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#C9A24A',
  },
  weekBrickFuture: {
    backgroundColor: C.paperDarker,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: C.rule,
  },
  weekBrickLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: '#FAF8F3',
    textTransform: 'uppercase',
  },
  weekBrickLabelGold: {
    color: '#C9A24A',
  },
  weekBrickLabelMuted: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.rule,
  },
  weekChainCaption: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    marginTop: 12,
    textAlign: 'center',
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
