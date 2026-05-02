// Build-time feature flags — controlled via EXPO_PUBLIC_* env vars.
// Set in .env.local for development, in eas.json for EAS builds.

export const FEATURES = {
  // Set EXPO_PUBLIC_ENABLE_SLURP=true to show the Slurp tab.
  // Keep false (or unset) to hide it from testers on the base games.
  slurp: process.env.EXPO_PUBLIC_ENABLE_SLURP === 'true',
} as const;
