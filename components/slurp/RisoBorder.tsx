import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { R, RS } from '@/constants/slurp/riso';

interface Props {
  children: React.ReactNode;
  bg?: string;
  pad?: number;
  double?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Hand-drawn paper card with hard offset shadow.
export function RisoBorder({ children, bg = R.cream, pad = 12, double = false, style }: Props) {
  const shadow = double ? RS.cardDouble : RS.card;
  return (
    <View
      style={[
        styles.base,
        shadow as ViewStyle,
        { backgroundColor: bg, padding: pad },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    borderColor: R.ink,
    borderRadius: 6,
  },
});
