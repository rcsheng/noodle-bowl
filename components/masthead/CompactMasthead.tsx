import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { C, F } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

function getCompactDate(): string {
  const d = new Date();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${weekday} ${month} ${d.getDate()}`;
}

export function CompactMasthead() {
  const { isOffline } = useNetworkStatus();

  return (
    <View style={styles.wrap}>
      <View style={styles.borderLine} />
      <View style={styles.borderLine} />
      <View style={styles.inner}>
        <View style={styles.logoRow}>
          <Text style={styles.logoMain}>Noodle </Text>
          <Text style={styles.logoAccent}>Bowl</Text>
        </View>
        <Text style={styles.date}>{getCompactDate()}</Text>
      </View>
      <View style={styles.borderLine} />
      <View style={styles.borderLine} />
      {isOffline && (
        <Text style={styles.offlineBanner}>NO INTERNET · USING SAVED CONTENT</Text>
      )}
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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
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
  offlineBanner: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.accentWarm,
    textAlign: 'center',
    marginTop: 6,
  },
});
