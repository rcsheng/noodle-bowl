import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_OUTBOX = 50;
const timers: Record<string, ReturnType<typeof setTimeout>> = {};
const pending: Record<string, unknown> = {};

export function scheduleWrite<T>(
  key: string,
  payload: T,
  writeFn: (payload: T) => Promise<void>,
  delayMs = 1500,
): void {
  pending[key] = payload;
  if (timers[key]) clearTimeout(timers[key]);
  timers[key] = setTimeout(() => {
    const p = pending[key] as T;
    delete pending[key];
    delete timers[key];
    executeWrite(key, p, writeFn).catch(() => {});
  }, delayMs);
}

async function executeWrite<T>(
  key: string,
  payload: T,
  writeFn: (payload: T) => Promise<void>,
): Promise<void> {
  const outboxKey = `sync_outbox_${key}`;
  const raw = await AsyncStorage.getItem(outboxKey);
  const outbox: T[] = raw ? (JSON.parse(raw) as T[]) : [];

  try {
    for (const entry of outbox) {
      await writeFn(entry);
    }
    if (outbox.length > 0) await AsyncStorage.removeItem(outboxKey);
    await writeFn(payload);
  } catch {
    const next = [...outbox, payload].slice(-MAX_OUTBOX);
    await AsyncStorage.setItem(outboxKey, JSON.stringify(next));
  }
}
