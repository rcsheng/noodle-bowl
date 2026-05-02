import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { R, RF } from '@/constants/slurp/riso';

interface Props {
  current: number;
  quota: number;
}

// Broth progress meter — ink-bordered pill with red fill.
export function RisoMeter({ current, quota }: Props) {
  const pct = Math.min(current / quota, 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <Text style={styles.label}>BROTH {current.toLocaleString()}</Text>
        <Text style={styles.label}>/ {quota.toLocaleString()}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingVertical: 6 },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: R.ink,
  },
  track: {
    height: 9,
    backgroundColor: R.cream,
    borderWidth: 1.5,
    borderColor: R.ink,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: R.red,
    borderRadius: 999,
    minWidth: 2,
  },
});
