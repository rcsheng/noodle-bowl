import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, F } from '@/constants/theme';

function getCompactDate(): string {
  const d = new Date();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${weekday} ${month} ${d.getDate()}`;
}

export function CompactMasthead() {
  return (
    <View style={styles.wrap}>
      <View style={styles.borderLine} />
      <View style={styles.borderLine} />
      <View style={styles.inner}>
        <Text>
          <Text style={styles.logoMain}>Noodle </Text>
          <Text style={styles.logoAccent}>Bowl</Text>
        </Text>
        <Text style={styles.date}>{getCompactDate()}</Text>
      </View>
      <View style={styles.borderLine} />
      <View style={styles.borderLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 2,
    marginBottom: 24,
  },
  borderLine: {
    height: 2,
    backgroundColor: C.rule,
    marginBottom: 2,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  logoMain: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: C.ink,
  },
  logoAccent: {
    fontFamily: F.frauncesItalic,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: C.accent,
  },
  date: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
  },
});
