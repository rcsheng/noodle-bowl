type NotificationData = Record<string, unknown> | null | undefined;
type Router = { push: (href: string) => void };

const SCREEN_ROUTES: Record<string, string> = {
  home: '/(tabs)/',
  friends: '/(tabs)/friends',
  stats: '/(tabs)/explore',
};

/**
 * Routes the app to the correct tab based on the `screen` field in a
 * notification's data payload. No-ops for unknown or missing screen values.
 */
export function routeNotification(data: NotificationData, router: Router): void {
  if (!data) return;
  const screen = data.screen as string | undefined;
  if (!screen) return;
  const route = SCREEN_ROUTES[screen];
  if (route) router.push(route);
}
