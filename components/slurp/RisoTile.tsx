import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { R, RF, RS } from '@/constants/slurp/riso';

interface Props {
  letter: string;
  value: number;
  selected?: boolean;
  boosted?: boolean;
  onPress?: () => void;
  size?: number;
}

// Letter tile — selected tiles are red-filled, unselected cream, boosted (wildcard) mustard.
// Slight rotation based on letter character code (hand-pasted feel).
export function RisoTile({ letter, value, selected = false, boosted = false, onPress, size = 38 }: Props) {
  const rotation = `${(letter.charCodeAt(0) % 5) - 2}deg`;
  const bg = selected ? R.red : boosted ? R.mustard : R.cream;
  const textColor = selected ? R.cream : R.ink;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.tile,
        (selected ? RS.tileSelected : RS.tileUnselected) as ViewStyle,
        {
          width: size,
          height: size,
          backgroundColor: bg,
          borderRadius: size * 0.22,
          transform: [{ rotate: rotation }],
        },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.48, color: textColor }]}>
        {letter}
      </Text>
      <View style={styles.valueWrap}>
        <Text style={[styles.value, { color: textColor, opacity: selected ? 0.7 : 0.65 }]}>
          {value}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 2,
    borderColor: R.ink,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  letter: {
    fontWeight: '900',
    lineHeight: undefined,
  },
  valueWrap: {
    position: 'absolute',
    bottom: 2,
    right: 3,
  },
  value: {
    fontFamily: RF.mono,
    fontSize: 8,
    fontWeight: '700',
  },
});
