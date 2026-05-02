import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { R, RF } from '@/constants/slurp/riso';

interface Props {
  label: string;
  value: string | number;
  bg?: string;
  style?: StyleProp<ViewStyle>;
}

// Small mono-text badge for stat callouts (coins, slurps, spits).
export function RisoBadge({ label, value, bg = R.cream, style }: Props) {
  return (
    <View style={[styles.wrap, { backgroundColor: bg }, style]}>
      <Text style={[styles.value, { color: bg === R.mustard ? R.ink : R.red }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: R.ink,
    borderRadius: 4,
    minWidth: 40,
  },
  value: {
    fontWeight: '900',
    fontSize: 16,
    lineHeight: 18,
  },
  label: {
    fontFamily: RF.mono,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: R.ink,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
});
