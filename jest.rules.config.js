/**
 * Jest config for Firestore rules tests.
 *
 * Run with: npm run test:rules
 * Requires the Firestore emulator running on port 8080.
 *
 * Uses ts-jest in a plain Node environment — these tests don't touch React
 * Native or Expo and shouldn't load jest-expo's transform stack.
 */
/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/firestore-rules.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          target: 'es2020',
          esModuleInterop: true,
          allowJs: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

module.exports = config;
