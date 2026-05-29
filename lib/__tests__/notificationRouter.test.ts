import { routeNotification } from '../notificationRouter';

const mockPush = jest.fn();
const mockRouter = { push: mockPush };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('routeNotification', () => {
  test('routes screen=home to the home tab', () => {
    routeNotification({ screen: 'home' }, mockRouter);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/');
  });

  test('routes screen=friends to the friends tab', () => {
    routeNotification({ screen: 'friends' }, mockRouter);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/friends');
  });

  test('routes screen=stats to the stats tab', () => {
    routeNotification({ screen: 'stats' }, mockRouter);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/explore');
  });

  test('does nothing when screen is unknown', () => {
    routeNotification({ screen: 'nonexistent' }, mockRouter);
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('does nothing when screen is undefined', () => {
    routeNotification({}, mockRouter);
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('does nothing when data is null', () => {
    routeNotification(null, mockRouter);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
