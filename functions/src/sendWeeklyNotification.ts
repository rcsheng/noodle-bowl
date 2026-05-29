import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { sendExpoPush } from './utils/push';

const BATCH_SIZE = 100;

export async function sendWeeklyNotificationHandler(
  db: ReturnType<typeof getFirestore>,
): Promise<void> {
  const snapshot = await db.collection('pushTokens').get();

  const tokens = snapshot.docs
    .map((d) => d.data().expoPushToken as string | undefined)
    .filter((t): t is string => !!t);

  if (tokens.length === 0) return;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    try {
      await sendExpoPush(
        batch,
        { type: 'weekly_content', screen: 'home' },
        "This week's games are ready",
        "Three rounds from this week's news. Don't break your streak.",
      );
    } catch (err) {
      console.error('[sendWeeklyNotification] batch send failed (non-fatal):', err);
    }
  }
}

export const sendWeeklyNotification = onSchedule(
  { schedule: '0 15 * * 1', timeZone: 'America/New_York' },
  async () => {
    await sendWeeklyNotificationHandler(getFirestore());
  },
);
