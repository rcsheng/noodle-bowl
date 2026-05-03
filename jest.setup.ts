// @testing-library/react-native v13+ auto-registers matchers; no extend-expect import needed.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

jest.mock('react-native-worklets', () => ({}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: jest.fn().mockReturnValue({}),
  Link: 'Link',
}));

jest.mock('posthog-react-native', () =>
  jest.fn().mockImplementation(() => ({ capture: jest.fn() }))
);

jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: null }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
}));
