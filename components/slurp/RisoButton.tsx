import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { R, RF } from '@/constants/slurp/riso';

type Variant = 'ink' | 'cream' | 'red' | 'mustard';

interface Props {
  children: string;
  variant?: Variant;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  flex?: number;
}

export function RisoButton({ children, variant = 'ink', onPress, disabled, style, flex }: Props) {
  const v = VARIANTS[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        v.shadow,
        { backgroundColor: v.bg, flex },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, { color: v.fg }]}>{children}</Text>
    </TouchableOpacity>
  );
}

const VARIANTS: Record<Variant, { bg: string; fg: string; shadow: ViewStyle }> = {
  ink:     { bg: R.ink,    fg: R.cream, shadow: { shadowColor: R.red,  shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 } },
  cream:   { bg: R.cream,  fg: R.ink,   shadow: { shadowColor: R.ink,  shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 } },
  red:     { bg: R.red,    fg: R.cream, shadow: { shadowColor: R.ink,  shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 } },
  mustard: { bg: R.mustard, fg: R.ink,  shadow: { shadowColor: R.ink,  shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 } },
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    borderColor: R.ink,
    borderRadius: 5,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.45,
  },
});
