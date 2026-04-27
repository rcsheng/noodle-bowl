/** @type {import('jest').Config} */
const config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-worklets)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/android/', '/ios/', '/functions/'],
  collectCoverageFrom: [
    'constants/**/*.ts',
    'context/**/*.ts',
    'context/**/*.tsx',
    'components/**/*.tsx',
    'lib/**/*.ts',
    '!lib/__tests__/**',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    'constants/utils.ts': {
      lines: 80,
      branches: 80,
      functions: 80,
    },
    'context/gameReducer.ts': {
      lines: 80,
      branches: 75,
      functions: 100,
    },
  },
};

module.exports = config;
