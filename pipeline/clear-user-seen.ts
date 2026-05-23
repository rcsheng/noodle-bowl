/**
 * Clears the `users/{uid}/meta/seen` document in Firestore for a specific user,
 * resetting all seen arrays to empty.  Used when QA/testing has accumulated
 * stale seen indices that make all games appear exhausted.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=C:/Users/rcshe/.firebase/noodle-bowl-sa.json \
 *   npx ts-node pipeline/clear-user-seen.ts [--uid <uid>]
 */

import * as https from 'https';
import { loadEnv } from './utils';

loadEnv();

const DEFAULT_UID = 'a4wbOiOxi0bpSzQnzAhKvUvhO472';

type FirestoreValue =
  | { nullValue: null }
  | { stringValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

function toFirestoreValue(val: unknown): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  throw new Error(`Unsupported type: ${typeof val}`);
}

async function getAccessToken(): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleAuth } = require('google-auth-library') as {
    GoogleAuth: new (opts: unknown) => {
      getClient: () => Promise<{ getAccessToken: () => Promise<{ token: string }> }>;
    };
  };
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const result = await client.getAccessToken();
  return result.token;
}

async function firestoreGet(
  token: string,
  projectId: string,
  docPath: string,
): Promise<Record<string, unknown> | null> {
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: 'firestore.googleapis.com', path: urlPath, method: 'GET',
        headers: { Authorization: `Bearer ${token}` } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode === 404) { resolve(null); return; }
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const doc = JSON.parse(data) as { fields?: Record<string, unknown> };
            resolve(doc.fields ? doc : null);
          } else {
            reject(new Error(`GET ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function firestorePatch(
  token: string,
  projectId: string,
  docPath: string,
  data: Record<string, unknown>,
): Promise<void> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v);
  const body = JSON.stringify({ fields });
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'firestore.googleapis.com',
        path: urlPath,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
          else reject(new Error(`PATCH ${res.statusCode}: ${data.slice(0, 200)}`));
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const uidArg = process.argv.indexOf('--uid');
  const uid = uidArg !== -1 ? process.argv[uidArg + 1] : DEFAULT_UID;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'noodle-bowl';

  console.log(`\nClearing seen arrays for uid: ${uid}`);
  console.log(`Project: ${projectId}\n`);

  const token = await getAccessToken();
  const docPath = `users/${uid}/meta/seen`;

  // Read current state first so we can show what's being cleared
  const existing = await firestoreGet(token, projectId, docPath);
  if (!existing) {
    console.log('ℹ️  No seen document found — nothing to clear.');
    return;
  }
  console.log('Current seen document (raw fields present):',
    Object.keys(existing.fields as Record<string, unknown>).join(', '));

  // Overwrite with empty arrays for all games + reset seenWeek to ''
  // Using empty string so MERGE_FROM_SERVER week-guard treats it as "no data yet"
  const resetDoc: Record<string, unknown> = {
    lede: [],
    spread: [],
    sof: [],
    quip: [],
    wave: [],
    seenWeek: '',
  };

  await firestorePatch(token, projectId, docPath, resetDoc);
  console.log('✅  Seen arrays cleared. seenWeek reset to empty string.');
  console.log('\nNext steps:');
  console.log('  1. Ask the user to force-close and reopen the app.');
  console.log('     (The STORAGE_KEY bump in GameContext.tsx will clear local AsyncStorage.)');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
