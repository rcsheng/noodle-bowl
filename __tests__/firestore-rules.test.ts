/**
 * Firestore security rules suite.
 *
 * Requires the Firestore emulator running on port 8080.
 *   Terminal 1: `npm run emulator` (or `firebase emulators:start --only firestore`)
 *   Terminal 2: `npm run test:rules`
 *
 * Excluded from `npm test` because of the emulator dependency.
 */

import { readFileSync } from 'fs';
import path from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-noodle-bowl-rules';
const RULES_PATH = path.join(__dirname, '..', 'firestore.rules');

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const futureTimestamp = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

const challengeDoc = (senderId: string) => ({
  token: 'CHAL1234',
  gameId: 'lede',
  questionIndex: 0,
  senderId,
  senderName: 'Alex',
  senderPrediction: 'Pip',
  senderAnswer: 'Dex',
  issuedAt: new Date(),
  expiresAt: futureTimestamp(),
  friendAnswer: null,
  resolvedAt: null,
  senderPushToken: null,
});

const helpDoc = (askerId: string) => ({
  token: 'HELP1234',
  gameId: 'spread',
  questionIndex: 0,
  askerId,
  askerName: 'Jordan',
  issuedAt: new Date(),
  expiresAt: futureTimestamp(),
  helperAnswer: null,
  resolvedAt: null,
  askerPushToken: null,
});

// @firebase/rules-unit-testing's firestore() returns the compat Firestore,
// while the modular SDK's getDoc/setDoc accept a different `Firestore` type.
// They interoperate at runtime, but TS sees the surface mismatch — cast via
// unknown so the modular helpers type-check.
const seedAsAdmin = async (
  fn: (db: Firestore) => Promise<void>,
): Promise<void> => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore() as unknown as Firestore);
  });
};

const dbAs = (uid: string): Firestore =>
  testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;

const dbUnauth = (): Firestore =>
  testEnv.unauthenticatedContext().firestore() as unknown as Firestore;

// ────────────────────────────────────────────────────────────────────────────
// users/{uid}
// ────────────────────────────────────────────────────────────────────────────

describe('users/{uid}', () => {
  test('owner can write own user doc', async () => {
    await assertSucceeds(
      setDoc(doc(dbAs('userA'), 'users/userA'), { totalScore: 100 }),
    );
  });

  test('owner can read own user doc', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'users/userA'), { totalScore: 100 });
    });
    await assertSucceeds(getDoc(doc(dbAs('userA'), 'users/userA')));
  });

  test('other authed user cannot read another user doc', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'users/userA'), { totalScore: 100 });
    });
    await assertFails(getDoc(doc(dbAs('userB'), 'users/userA')));
  });

  test('other authed user cannot write another user doc', async () => {
    await assertFails(
      setDoc(doc(dbAs('userB'), 'users/userA'), { totalScore: 999 }),
    );
  });

  test('unauthenticated cannot read any user doc', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'users/userA'), { totalScore: 100 });
    });
    await assertFails(getDoc(doc(dbUnauth(), 'users/userA')));
  });

  test('unauthenticated cannot write any user doc', async () => {
    await assertFails(
      setDoc(doc(dbUnauth(), 'users/userA'), { totalScore: 100 }),
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// users/{uid}/friendInteractions/{interactionId}
// ────────────────────────────────────────────────────────────────────────────

describe('users/{uid}/friendInteractions/{id}', () => {
  test('owner can write own friend interaction', async () => {
    await assertSucceeds(
      setDoc(doc(dbAs('userA'), 'users/userA/friendInteractions/i1'), {
        type: 'sent_help',
        gameId: 'lede',
        questionIndex: 0,
      }),
    );
  });

  test('owner can read own friend interactions', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'users/userA/friendInteractions/i1'), {
        type: 'sent_help',
      });
    });
    await assertSucceeds(
      getDoc(doc(dbAs('userA'), 'users/userA/friendInteractions/i1')),
    );
  });

  test('other authed user cannot read another user friend interaction', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'users/userA/friendInteractions/i1'), {
        type: 'sent_help',
      });
    });
    await assertFails(
      getDoc(doc(dbAs('userB'), 'users/userA/friendInteractions/i1')),
    );
  });

  test('other authed user cannot write another user friend interaction', async () => {
    await assertFails(
      setDoc(doc(dbAs('userB'), 'users/userA/friendInteractions/i1'), {
        type: 'sent_help',
      }),
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// users/{uid}/meta/{docId}
// ────────────────────────────────────────────────────────────────────────────

describe('users/{uid}/meta/{docId}', () => {
  test('owner can write own meta', async () => {
    await assertSucceeds(
      setDoc(doc(dbAs('userA'), 'users/userA/meta/seen'), {
        lede: [0, 1, 2],
      }),
    );
  });

  test('other authed user cannot read another user meta', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'users/userA/meta/seen'), { lede: [0, 1, 2] });
    });
    await assertFails(getDoc(doc(dbAs('userB'), 'users/userA/meta/seen')));
  });

  test('other authed user cannot write another user meta', async () => {
    await assertFails(
      setDoc(doc(dbAs('userB'), 'users/userA/meta/seen'), { lede: [0] }),
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// pushTokens/{uid}
// ────────────────────────────────────────────────────────────────────────────

describe('pushTokens/{uid}', () => {
  test('owner can write own push token', async () => {
    await assertSucceeds(
      setDoc(doc(dbAs('userA'), 'pushTokens/userA'), {
        expoPushToken: 'ExponentPushToken[abc]',
      }),
    );
  });

  test('owner can read own push token', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'pushTokens/userA'), { expoPushToken: 't' });
    });
    await assertSucceeds(getDoc(doc(dbAs('userA'), 'pushTokens/userA')));
  });

  test('other authed user cannot read another user push token', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'pushTokens/userA'), { expoPushToken: 't' });
    });
    await assertFails(getDoc(doc(dbAs('userB'), 'pushTokens/userA')));
  });

  test('other authed user cannot overwrite another user push token', async () => {
    await assertFails(
      setDoc(doc(dbAs('userB'), 'pushTokens/userA'), {
        expoPushToken: 'attacker-token',
      }),
    );
  });

  test('unauthenticated cannot read push tokens', async () => {
    await assertFails(getDoc(doc(dbUnauth(), 'pushTokens/userA')));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// challenges/{token}
// ────────────────────────────────────────────────────────────────────────────

describe('challenges/{token}', () => {
  test('any authed user can read a challenge (friend opening link)', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'challenges/CHAL1234'), challengeDoc('userA'));
    });
    await assertSucceeds(getDoc(doc(dbAs('userB'), 'challenges/CHAL1234')));
  });

  test('sender can create their own challenge', async () => {
    await assertSucceeds(
      setDoc(doc(dbAs('userA'), 'challenges/CHAL1234'), challengeDoc('userA')),
    );
  });

  test('user cannot create challenge with someone else as sender', async () => {
    await assertFails(
      setDoc(doc(dbAs('userB'), 'challenges/CHAL1234'), challengeDoc('userA')),
    );
  });

  test('sender cannot update an existing challenge from client', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'challenges/CHAL1234'), challengeDoc('userA'));
    });
    await assertFails(
      setDoc(
        doc(dbAs('userA'), 'challenges/CHAL1234'),
        { ...challengeDoc('userA'), friendAnswer: 'Pip' },
      ),
    );
  });

  test('responder cannot update an existing challenge from client', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'challenges/CHAL1234'), challengeDoc('userA'));
    });
    await assertFails(
      setDoc(
        doc(dbAs('userB'), 'challenges/CHAL1234'),
        { ...challengeDoc('userA'), friendAnswer: 'Pip' },
      ),
    );
  });

  test('no client can delete a challenge', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'challenges/CHAL1234'), challengeDoc('userA'));
    });
    await assertFails(deleteDoc(doc(dbAs('userA'), 'challenges/CHAL1234')));
  });

  test('unauthenticated cannot read a challenge', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'challenges/CHAL1234'), challengeDoc('userA'));
    });
    await assertFails(getDoc(doc(dbUnauth(), 'challenges/CHAL1234')));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// helpRequests/{token}
// ────────────────────────────────────────────────────────────────────────────

describe('helpRequests/{token}', () => {
  test('any authed user can read a help request', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'helpRequests/HELP1234'), helpDoc('userA'));
    });
    await assertSucceeds(getDoc(doc(dbAs('userB'), 'helpRequests/HELP1234')));
  });

  test('asker can create their own help request', async () => {
    await assertSucceeds(
      setDoc(doc(dbAs('userA'), 'helpRequests/HELP1234'), helpDoc('userA')),
    );
  });

  test('user cannot create help request with someone else as asker', async () => {
    await assertFails(
      setDoc(doc(dbAs('userB'), 'helpRequests/HELP1234'), helpDoc('userA')),
    );
  });

  test('asker cannot update an existing help request from client', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'helpRequests/HELP1234'), helpDoc('userA'));
    });
    await assertFails(
      setDoc(
        doc(dbAs('userA'), 'helpRequests/HELP1234'),
        { ...helpDoc('userA'), helperAnswer: '42' },
      ),
    );
  });

  test('helper cannot update an existing help request from client', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'helpRequests/HELP1234'), helpDoc('userA'));
    });
    await assertFails(
      setDoc(
        doc(dbAs('userB'), 'helpRequests/HELP1234'),
        { ...helpDoc('userA'), helperAnswer: '42' },
      ),
    );
  });

  test('no client can delete a help request', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'helpRequests/HELP1234'), helpDoc('userA'));
    });
    await assertFails(deleteDoc(doc(dbAs('userA'), 'helpRequests/HELP1234')));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// contentVersions/{versionId}
// ────────────────────────────────────────────────────────────────────────────

describe('contentVersions/{versionId}', () => {
  test('any authed user can read content', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'contentVersions/v1'), { active: true });
    });
    await assertSucceeds(getDoc(doc(dbAs('userA'), 'contentVersions/v1')));
  });

  test('client cannot create content version', async () => {
    await assertFails(
      setDoc(doc(dbAs('userA'), 'contentVersions/v1'), { active: true }),
    );
  });

  test('unauthenticated cannot read content', async () => {
    await seedAsAdmin(async (db) => {
      await setDoc(doc(db, 'contentVersions/v1'), { active: true });
    });
    await assertFails(getDoc(doc(dbUnauth(), 'contentVersions/v1')));
  });
});
