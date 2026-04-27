const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export const logger = {
  info: (...args: unknown[]) => { if (isDev) console.log('[INFO]', ...args); },
  warn: (...args: unknown[]) => { if (isDev) console.warn('[WARN]', ...args); },
  error: (...args: unknown[]) => { if (isDev) console.error('[ERROR]', ...args); },
};
