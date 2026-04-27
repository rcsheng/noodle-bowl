import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, F } from '@/constants/theme';
import { getIssueNumber, getTodayString } from '@/constants/utils';
import { useGame } from '@/context/GameContext';

export function Masthead() {
  const issueNum = getIssueNumber();
  const today = getTodayString();
  const { state } = useGame();
  const { dailyStreak, streakShieldsAvailable } = state.stats;

  return (
    <View style={styles.wrap}>
      <View style={styles.borderLine} />
      <View style={styles.borderLine} />
      <View style={styles.inner}>
        <Text style={styles.dateStrip}>
          No. {String(issueNum).padStart(4, '0')} · {today}
        </Text>
        <Text style={styles.title}>
          Noodle <Text style={styles.amp}>Bowl</Text>
        </Text>
        <Text style={styles.tagline}>A Daily Mix Of Brain Games</Text>
        {dailyStreak > 0 && (
          <Text style={styles.streakLine}>
            🔥 {dailyStreak}{streakShieldsAvailable > 0 ? '  🛡' : ''}
          </Text>
        )}
      </View>
      <View style={styles.borderLine} />
      <View style={styles.borderLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 2,
    marginBottom: 28,
  },
  borderLine: {
    height: 2,
    backgroundColor: C.rule,
    marginBottom: 2,
  },
  inner: {
    paddingVertical: 18,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  dateStrip: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 6,
  },
  title: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
    color: C.ink,
  },
  amp: {
    color: C.accent,
    fontFamily: F.frauncesItalic,
    fontSize: 48,
  },
  tagline: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.muted,
    marginTop: 8,
  },
  streakLine: {
    fontFamily: F.monoBold,
    fontSize: 13,
    letterSpacing: 1.2,
    color: C.ink,
    marginTop: 10,
  },
});
