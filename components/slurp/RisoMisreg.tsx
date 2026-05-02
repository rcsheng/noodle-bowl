import React from 'react';
import { Text, TextStyle } from 'react-native';
import { R, RF } from '@/constants/slurp/riso';

interface Props {
  children: string;
  color?: string;
  shift?: string;
  size?: number;
  dx?: number;
  dy?: number;
  italic?: boolean;
  style?: TextStyle;
}

// Misregistered text: heavy display font with a colored shadow offset
// simulating imperfect riso color registration.
export function RisoMisreg({
  children,
  color = R.ink,
  shift = R.red,
  size = 28,
  dx = 2,
  dy = 1,
  italic = false,
  style,
}: Props) {
  return (
    <Text
      style={[
        {
          fontWeight: '900',
          fontFamily: italic ? RF.serifBoldItalic : undefined,
          fontSize: size,
          lineHeight: size * 1.1,
          letterSpacing: -0.5,
          color,
          textShadowColor: shift,
          textShadowOffset: { width: dx, height: dy },
          textShadowRadius: 0.5,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
