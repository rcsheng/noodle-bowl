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
        <View style={styles.titleRow}>
          <Text style={styles.title}>Noodle </Text>
          <Text style={styles.amp}>Bowl</Text>
        </View>
        <Text style={styles.tagline}>A Daily Mix Of Brain Games</Text>
        {(dailyStreak > 0 || streakShieldsAvailable > 0) && (
          <Text style={styles.streakLine}>
            {dailyStreak > 0 ? `🔥 ${dailyStreak}` : ''}
            {dailyStreak > 0 && streakShieldsAvailable > 0 ? '  ' : ''}
            {streakShieldsAvailable > 0 ? `🛡 ${streakShieldsAvailable}` : ''}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
    color: C.ink,
  },
  amp: {
    fontFamily: F.frauncesItalic,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
    color: C.accent,
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
