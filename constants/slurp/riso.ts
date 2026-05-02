// Riso Broth design tokens — two-color risograph zine aesthetic.
// Chili red + miso mustard on warm cream paper.

export const R = {
  cream: '#f5ecd9',
  creamDeep: '#ecdfb8',
  ink: '#2b2014',
  red: '#e54a3b',
  redShift: '#cc3d2e',
  mustard: '#d9a52a',
  mustardShift: '#c89322',
  scallion: '#5e8a3a',
} as const;

// Hard offset shadows — no blur, mimicking riso layer offset
export const RS = {
  card: {
    shadowColor: R.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1 as number,
    shadowRadius: 0,
    elevation: 3,
  },
  cardDouble: {
    shadowColor: R.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1 as number,
    shadowRadius: 0,
    elevation: 4,
  },
  tileUnselected: {
    shadowColor: R.mustard,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1 as number,
    shadowRadius: 0,
    elevation: 2,
  },
  tileSelected: {
    shadowColor: R.ink,
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 1 as number,
    shadowRadius: 0,
    elevation: 3,
  },
  btnInk: {
    shadowColor: R.red,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1 as number,
    shadowRadius: 0,
    elevation: 3,
  },
  btnRed: {
    shadowColor: R.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1 as number,
    shadowRadius: 0,
    elevation: 2,
  },
} as const;

// Font constants — display uses system weight-900, mono uses JetBrains
export const RF = {
  mono: 'JetBrainsMono_700Bold',
  monoRegular: 'JetBrainsMono_400Regular',
  serifItalic: 'Fraunces_400Regular_Italic',
  serifBoldItalic: 'Fraunces_800ExtraBold_Italic',
} as const;
