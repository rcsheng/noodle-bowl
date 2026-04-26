export const C = {
  ink: '#1a2030',
  paper: '#e8eef3',
  paperDark: '#d8e1ea',
  paperDarker: '#c4d0dc',
  rule: '#2a3548',
  accent: '#b84a35',
  accentWarm: '#d97a3c',
  gold: '#b8902c',
  green: '#4a7a3e',
  greenLight: '#7ba368',
  blue: '#3a5a7a',
  muted: '#5a6878',
  onDark: '#e8eef3',
  onDarkDim: '#b8c4d4',
} as const;

export const F = {
  fraunces: 'Fraunces_400Regular',
  frauncesItalic: 'Fraunces_400Regular_Italic',
  frauncesSemiBold: 'Fraunces_600SemiBold',
  frauncesSemiBoldItalic: 'Fraunces_600SemiBold_Italic',
  frauncesBold: 'Fraunces_700Bold',
  frauncesBoldItalic: 'Fraunces_700Bold_Italic',
  frauncesXBold: 'Fraunces_800ExtraBold',
  frauncesXBoldItalic: 'Fraunces_800ExtraBold_Italic',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

// Keep legacy Colors export for components that haven't been updated yet
export const Colors = {
  light: {
    text: C.ink,
    background: C.paper,
    tint: C.accent,
    icon: C.muted,
    tabIconDefault: C.muted,
    tabIconSelected: C.accent,
  },
  dark: {
    text: C.ink,
    background: C.paper,
    tint: C.accent,
    icon: C.muted,
    tabIconDefault: C.muted,
    tabIconSelected: C.accent,
  },
};

export const cardShadow = {
  shadowColor: C.rule,
  shadowOffset: { width: 3, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 3,
} as const;
