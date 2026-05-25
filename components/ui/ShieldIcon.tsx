import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

export type ShieldVariant = 'filled' | 'outline' | 'gold';

interface ShieldIconProps {
  size?: number;
  variant?: ShieldVariant;
}

/**
 * Monoline shield icon — replaces the 🛡 emoji everywhere.
 * - 'filled' : ink fill (streak alive, shield earned)
 * - 'outline': empty slot (shield not yet earned)
 * - 'gold'   : gold border + crack (shield that saved a streak)
 */
export function ShieldIcon({ size = 24, variant = 'filled' }: ShieldIconProps) {
  const strokeColor =
    variant === 'gold' ? '#C9A24A' : variant === 'outline' ? '#AAAAAA' : '#1A1A1A';
  const fillColor =
    variant === 'filled' ? '#1A1A1A' : 'none';
  const checkColor = variant === 'filled' ? '#FFFFFF' : 'transparent';
  const crackColor = variant === 'gold' ? '#C9A24A' : 'transparent';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 28" fill="none">
      {/* Shield body */}
      <Path
        d="M12 1 L22 4 L22 14 C22 20 17 25 12 27 C7 25 2 20 2 14 L2 4 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={variant === 'gold' ? 2 : 1.5}
        strokeLinejoin="round"
      />
      {/* Checkmark — shown only in filled variant */}
      {variant === 'filled' && (
        <Path
          d="M9 14 L11.5 16.5 L16 11"
          stroke={checkColor}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* Crack — shown only in gold variant (shield was used) */}
      {variant === 'gold' && (
        <Path
          d="M9 6 L13 12 L10 16 L14 22"
          stroke={crackColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}
