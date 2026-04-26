# Noodle Bowl — Backend PRD

**Status:** Planning
**Author:** Product team
**Last updated:** April 2026
**Document version:** 1.1 (updated from Supabase to Firebase)
**Depends on:** Frontend v4 checklist (§10.5) complete before Phase 2 begins

---

## 0. Monorepo — Recommendation and Concerns

### Recommendation: stay at repo root, add a `functions/` folder

For a solo developer, a full monorepo migration (Turborepo, `apps/mobile`, `apps/api`, workspace packages) is more overhead than it's worth at this stage. The recommended approach is simpler:

```
noodle-bowl/               ← existing repo root, Expo project unchanged
├── functions/             ← created by `firebase init functions`
│   ├── src/
│   │   ├── challengeCreate.ts
│   │   ├── challengeGet.ts
│   │   ├── challengeRespond.ts
│   │   ├── helpCreate.ts
│   │   └── helpRespond.ts
│   ├── package.json       ← separate Node.js package for functions
│   └── tsconfig.json
├── firestore.rules        ← Firestore security rules
├── firestore.indexes.json
├── firebase.json          ← Firebase project config
├── .firebaserc            ← project alias (dev/prod)
└── [all existing Expo files unchanged]
```

Running `firebase init` at the repo root creates these files without touching the Expo project. The `functions/` folder is its own Node.js package — it does not interfere with the Expo `package.json`.

### Shared TypeScript types (recommended)

The `functions/` package and the Expo app share the same interface shapes (`FriendInteraction`, `ChallengePayload`, `GameId`). Rather than duplicating them, create a lightweight `packages/shared/` folder:

```
noodle-bowl/
├── packages/
│   └── shared/
│       └── types.ts       ← shared interfaces, imported by both app and functions
├── functions/
└── [Expo app files]
```

Reference from the Expo app via the existing `@/` alias or a direct relative import. Reference from `functions/` via a relative path in `tsconfig.json`. No build tooling required — just TypeScript path resolution.

### Concerns with a true monorepo (`apps/mobile`)

| Concern | Detail |
|---------|--------|
| Expo root config | `expo-router` expects `app/` at the project root. Moving to `apps/mobile/` requires updating `expo.web.output`, `eas.json`, Metro config, and all `@/` path aliases. One-time cost but real breakage risk. |
| EAS Build | EAS needs to know the new project root. Requires `eas.json` updates and a full build test. |
| Jest config | `moduleNameMapper` and `testPathIgnorePatterns` need updating. |
| Verdict | Not worth it now. Migrate later if a second app (web, admin) needs to share the same workspace. |

---

## 1. Why a Backend

The frontend v4 social features work in isolation on a single device. The backend enables features that require a second device:

| Feature | Requires Backend |
|---------|-----------------|
| Short challenge tokens (instead of long base64 URLs) | Yes |
| Friend opens challenge link and answer goes back to sender | Yes |
| `challenge_accepted` event pushed to sender | Yes |
| Help link — friend's response goes back to asker | Yes |
| `received_help` event pushed to asker | Yes |
| Challenge expiry enforcement | Yes |
| Future: friend graph, leaderboard, account sync | Yes |
| Hub played-today state | No — already in local state |
| `gave_help` recording | No — frontend-only |
| `received_challenge` recording | No — frontend-only |

---

## 2. Tech Stack

### Primary: Firebase

| Layer | Choice | Reason |
|-------|--------|--------|
| Auth | Firebase Anonymous Auth | No login required in v1; upgrades cleanly to real accounts in v2 |
| Database | Firestore | NoSQL document store, real-time listeners built in, excellent React Native SDK |
| API | Firebase Cloud Functions (TypeScript) | Serverless, same language as the app, deploy with `firebase deploy` |
| Real-time | Firestore `onSnapshot` | Native to Firestore — no separate subscription service needed |
| Push notifications | Expo Push Notification Service | Single endpoint for iOS + Android; Cloud Functions call the Expo Push API |
| Hosting | Firebase | Included |

### Why Firebase over a custom Node.js API

A custom Express/Fastify/Hono API on Railway or Render gives more flexibility but requires managing deployments, environment variables, uptime monitoring, and a database separately. Firebase handles all of this as one integrated platform with a single CLI and dashboard. For a solo developer, that operational simplicity is worth more than the flexibility tradeoff.

---

## 3. Auth Strategy — v1

v1 uses anonymous device identity. No login screen, no accounts.

**How it works:**
- On first launch, the app calls `signInAnonymously()` — Firebase returns a stable UID for the device session.
- This UID is stored by the Firebase SDK automatically and persists across app restarts.
- It is used as `senderId` on all Firestore documents.
- All Firestore Security Rules are written against this anonymous UID.
- The app must call `signInAnonymously()` on startup before any social feature is used.

```typescript
import { getAuth, signInAnonymously } from 'firebase/auth';

const auth = getAuth();
await signInAnonymously(auth); // idempotent — reuses existing session
const uid = auth.currentUser?.uid;
```

**Upgrade path:** When real accounts are introduced (v2), Firebase supports `linkWithCredential()` to promote an anonymous session to a full account (Google, Apple, email) without losing existing Firestore documents tied to the old UID.

---

## 4. Data Model (Firestore)

Firestore stores data as documents inside collections. There are no tables or schemas — structure is enforced by the app and Security Rules.

### `challenges/{token}` collection

| Field | Type | Notes |
|-------|------|-------|
| `token` | `string` | 8-char alphanumeric, same as the document ID |
| `gameId` | `string` | lede, spread, sof, wave, quip |
| `questionIndex` | `number` | Index into the game's question bank |
| `senderId` | `string` | Firebase anonymous UID |
| `senderName` | `string` | Captured in ChallengeModal step 0; defaults to "A Friend" |
| `senderPrediction` | `string` | What the sender predicted |
| `senderAnswer` | `string` | What the sender actually answered |
| `issuedAt` | `Timestamp` | When the challenge was created |
| `expiresAt` | `Timestamp` | `issuedAt + 24 hours` — enforced in Security Rules and Cloud Functions |
| `friendAnswer` | `string \| null` | Written by Cloud Function when friend responds |
| `resolvedAt` | `Timestamp \| null` | Written when friend responds |
| `senderPushToken` | `string \| null` | Expo push token for notifying the sender |

### `helpRequests/{token}` collection

| Field | Type | Notes |
|-------|------|-------|
| `token` | `string` | Document ID |
| `gameId` | `string` | |
| `questionIndex` | `number` | |
| `askerId` | `string` | Firebase anonymous UID |
| `askerName` | `string \| null` | |
| `issuedAt` | `Timestamp` | |
| `expiresAt` | `Timestamp` | `issuedAt + 24 hours` |
| `helperAnswer` | `string \| null` | Written when friend responds |
| `resolvedAt` | `Timestamp \| null` | |
| `askerPushToken` | `string \| null` | |

### `pushTokens/{uid}` collection

| Field | Type | Notes |
|-------|------|-------|
| `expoPushToken` | `string` | Current Expo push token for this device |
| `updatedAt` | `Timestamp` | Tokens can rotate — upsert on every launch |

---

## 5. Cloud Functions (API)

All functions are HTTPS callable or HTTPS-triggered. Written in TypeScript, deployed with `firebase deploy --only functions`.

---

### `challengeCreate` — HTTPS Callable

Called by ChallengeModal when the user taps "Share with a Friend."

**Request:**
```typescript
{
  gameId: string;
  questionIndex: number;
  senderPrediction: string;
  senderAnswer: string;
  senderName: string;
  senderPushToken: string | null;
}
```

**Response:**
```typescript
{
  token: string;          // "AB3X9K2M"
  url: string;            // "https://noodlebowl.app/c/AB3X9K2M"
  expiresAt: string;      // ISO datetime
}
```

**Server logic:**
1. Verify caller is authenticated (`context.auth` is present)
2. Validate `gameId` is a known value, `questionIndex` is a non-negative integer
3. Generate a unique 8-char token (retry on collision)
4. Write document to `challenges/{token}`
5. Upsert `pushTokens/{uid}` with the sender's push token
6. Return token and URL

---

### `challengeGet` — HTTPS Request (GET)

Called by the `/games/challenge/[token]` route when a friend opens the link. This is a plain HTTPS function (not callable) so it works from a web browser deep link as well as the app.

**Request:** `GET /challengeGet?token=AB3X9K2M`

**Response (valid):**
```json
{
  "gameId": "lede",
  "questionIndex": 3,
  "senderName": "Alex",
  "senderPrediction": "Pip",
  "expiresAt": "2026-04-27T14:32:00Z"
}
```

**Response (expired or not found):**
```json
{ "error": "expired" }
```

`senderAnswer` is intentionally excluded — revealing it before the friend answers would let them cheat. It is only returned by `challengeRespond` after the friend locks in.

---

### `challengeRespond` — HTTPS Callable

Called by the friend's device after they lock in their answer.

**Request:**
```typescript
{
  token: string;
  friendAnswer: string;
}
```

**Server logic:**
1. Look up `challenges/{token}`
2. Return error if not found, expired (`expiresAt` < now), or already resolved
3. Write `friendAnswer` and `resolvedAt` to the document
4. Send Expo push notification to `senderPushToken` if present:
   - Title: `"Alex responded to your Lede challenge"`
   - Body: `"See how they did"`
   - Data: `{ type: "challenge_accepted", token: "AB3X9K2M" }`
5. Return full comparison data (now safe to include `senderAnswer`):

```typescript
{
  gameId: string;
  questionIndex: number;
  senderName: string;
  senderAnswer: string;
  senderPrediction: string;
  friendAnswer: string;
}
```

---

### `helpCreate` — HTTPS Callable

Called when the user taps "Share" in the Ask a Friend for Help modal.

**Request:**
```typescript
{
  gameId: string;
  questionIndex: number;
  askerName: string | null;
  askerPushToken: string | null;
}
```

**Response:**
```typescript
{
  token: string;
  url: string;            // "https://noodlebowl.app/h/ZQ8WY4NR"
  expiresAt: string;
}
```

---

### `helpRespond` — HTTPS Callable

Called by the helper's device after they answer.

**Request:**
```typescript
{
  token: string;
  helperAnswer: string;
}
```

**Server logic:**
1. Look up `helpRequests/{token}`, validate not expired or resolved
2. Write `helperAnswer` and `resolvedAt`
3. Send Expo push notification to `askerPushToken`:
   - Title: `"Your friend answered your Spread question"`
   - Data: `{ type: "received_help", token: "ZQ8WY4NR" }`
4. Return confirmation so the helper sees a thank-you screen

---

## 6. Push Notification Strategy

Cloud Functions send push notifications via Expo's Push API — a single endpoint that handles both iOS (APNs) and Android (FCM) without requiring separate integrations.

```typescript
// Inside a Cloud Function
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.EXPO_ACCESS_TOKEN}`,
  },
  body: JSON.stringify({
    to: senderPushToken,
    title: 'Alex responded to your challenge',
    body: 'See how they did',
    data: { type: 'challenge_accepted', token },
  }),
});
```

**On the app side:** A notification listener reads the `type` field in the data payload, dispatches the correct `ADD_FRIEND_INTERACTION` action, and updates the Friends feed.

**Push token registration:** The app calls `Notifications.getExpoPushTokenAsync()` on startup and writes the result to `pushTokens/{uid}`. Tokens can rotate between sessions so this must happen on every launch.

---

## 7. Real-time Updates (Firestore `onSnapshot`)

For users who have granted notification permissions, push handles the update. For users who have denied notifications — or as a belt-and-suspenders fallback — the Friends feed subscribes to its own challenges in Firestore:

```typescript
import { doc, onSnapshot } from 'firebase/firestore';

// When a sent_challenge feed entry is in "waiting" state, subscribe to it
const unsub = onSnapshot(doc(db, 'challenges', token), (snap) => {
  if (snap.data()?.resolvedAt) {
    dispatch({ type: 'ADD_FRIEND_INTERACTION', interaction: buildResolvedEntry(snap.data()) });
    unsub(); // stop listening once resolved
  }
});
```

This fires immediately when `challengeRespond` writes `resolvedAt`, without requiring a push notification roundtrip. Unsubscribe when the feed unmounts or the challenge resolves.

---

## 8. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /challenges/{token} {
      // Anyone authenticated can read by token (friend opening the link)
      allow read: if request.auth != null;
      // Only the sender can create their own challenge
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.senderId;
      // Only Cloud Functions (admin SDK) can update — enforced by not granting update here
      allow update: if false;
    }

    match /helpRequests/{token} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.askerId;
      allow update: if false;
    }

    match /pushTokens/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Cloud Functions use the Firebase Admin SDK which bypasses Security Rules, so `challengeRespond` can write `friendAnswer` even though `update` is `false` for clients.

---

## 9. Deep Link Routing (Frontend — built in v4)

The `/games/challenge/[token]` route:

1. Calls `challengeGet` with the token from the URL
2. If expired → shows "This challenge has expired" screen
3. If valid → loads the game in challenge mode (question at `questionIndex`, no random pick)
4. On lock-in → calls `challengeRespond`
5. Shows comparison screen using the response (which now includes `senderAnswer`)
6. Dispatches `ADD_FRIEND_INTERACTION` locally with type `received_challenge`

The help link equivalent uses `/games/help/[token]` and follows the same pattern with `helpCreate` / `helpRespond`.

---

## 10. Implementation Order

### Phase 1 — Foundation

1. `firebase init` at repo root (select: Firestore, Functions, Emulators)
2. Write `firestore.rules` for `challenges`, `helpRequests`, `pushTokens`
3. Implement and deploy `challengeCreate` function
4. Implement and deploy `challengeGet` function
5. Add Firebase SDK to the Expo app, call `signInAnonymously()` on startup
6. Wire `genChallengeUrl()` to call `challengeCreate` instead of generating a stub
7. Test round-trip: create challenge → copy token → open link on second device

### Phase 2 — Response loop

8. Implement and deploy `challengeRespond`
9. Add push token registration to app startup (`Notifications.getExpoPushTokenAsync()`)
10. Wire the challenge route to call `challengeRespond` after lock-in
11. Add notification listener in the app; dispatch `ADD_FRIEND_INTERACTION` on receipt
12. Wire `onSnapshot` fallback on sent-challenge feed entries
13. Show prediction reveal in Friends feed

### Phase 3 — Help flow

14. Implement and deploy `helpCreate` and `helpRespond`
15. Wire Ask a Friend modals to call `helpCreate`
16. Wire help link route to call `helpRespond`
17. Handle `received_help` push notification; dispatch `ADD_FRIEND_INTERACTION`

### Phase 4 — Hardening

18. Add token expiry UI in challenge and help routes
19. Add server-side rate limiting (one challenge per game per sender per day)
20. Add Firestore indexes for any queries that appear in the console warnings
21. Review Expo push delivery receipts (`/--/api/v2/push/getReceipts`) for failures
22. Enable Firebase App Check to block non-app clients from calling functions

---

## 11. Local Development

Firebase ships an emulator suite that runs Firestore, Auth, and Functions locally — no cloud usage or billing during development.

```bash
firebase emulators:start
```

The app connects to the emulator by setting environment variables:

```typescript
// In app startup (dev only)
if (__DEV__) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

This means the full challenge flow (create → respond → push) can be tested end-to-end on two simulators before deploying anything to Firebase cloud.

---

## 12. Environment Variables

**Expo app** — add to `.env.local` (not committed):
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

**Cloud Functions** — set via `firebase functions:secrets:set`:
```
EXPO_ACCESS_TOKEN=...    # for calling Expo's Push API
```

---

## 13. What This Does Not Cover

| Topic | Reason deferred |
|-------|----------------|
| User accounts / login | Anonymous works for v1; add Google/Apple sign-in in v2 |
| Friend graph / contacts | Requires real accounts first |
| Leaderboard | Requires accounts + server-side score validation |
| Cross-device play history sync | Requires accounts |
| Admin dashboard | Defer until there are users to monitor |
| Abuse / rate limiting beyond basic | Defer until launch |

---

*End of document — Backend v1.1*
