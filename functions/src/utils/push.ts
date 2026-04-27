export interface PushData {
  type: string;
  token: string;
  [key: string]: string;
}

export async function sendExpoPush(
  expoPushToken: string,
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

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({ to: expoPushToken, title, body, data }),
  });
}
