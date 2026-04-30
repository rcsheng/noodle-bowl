import { HttpsError } from 'firebase-functions/v2/https';

const VALID_PREFIXES = new Set(['', 'qa_']);

export function validateCollectionPrefix(prefix: string | undefined): string {
  const p = prefix ?? '';
  if (!VALID_PREFIXES.has(p)) {
    throw new HttpsError('invalid-argument', 'Invalid collectionPrefix');
  }
  return p;
}
