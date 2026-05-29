export interface PushData {
  type: string;
  [key: string]: string;
}

/**
 * Send an Expo push notification to one token or a batch of up to 100 tokens.
 * Errors are not swallowed here — callers decide whether to log and continue.
 */
export async function sendExpoPush(
  expoPushToken: string | string[],
  data: PushData,
  title?: string,
  body?: string,
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-encoding': 'gzip, deflate',
  };

  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({ to: expoPushToken, title, body, data }),
  });

  if (!res.ok) {
    throw new Error(`Expo push API returned ${res.status}`);
  }
}
