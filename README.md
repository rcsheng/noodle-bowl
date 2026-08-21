# Noodle Bowl

*Stretch your noodle. Weekly.*

The weekly brain game built from real news — five games, five minutes, a new edition every week. Not a quiz. A workout.

`FIVE GAMES` · `FIVE MINUTES` · `REAL NEWS` · [noodlebowl.app](https://noodlebowl.app)

**Stack:** React Native · Expo Router v3 · Firebase Auth + Firestore + Cloud Functions · AsyncStorage · Jest

---

## The games

**The Lede** — *Finish the headline*
A real headline with the ending missing. Three possible completions — one is the truth. Pick the one that actually ran. The real answer is always the surprising one.

**The Spread** — *Pick the number*
A real number from this week's news. Four choices — one is right. No Googling, no trivia banks. Just your sense of scale against what actually happened.

**Science or Fiction** — *Tap the real science*
Two claims about science or health. One is real and cited. One is fabricated. Tap the one that's actually true — the real science is always the weird one.

**Wave** — *Read the spectrum*
A real story, plotted between two extremes. Drag to where you think the truth landed. The closer you land, the more it's worth.

**Quip** — *Beat the panel*
A real headline missing its punchline. Write your own. A panel of fictional critics — dry, chaotic, or just plain mean — judges whether it lands.

Play at least one game a week to keep your streak alive. Miss a week and it resets — unless a streak shield is protecting you, earned by helping a friend answer a question or taking up their challenge.

Built by one person who got tired of news quizzes.

---

## Prerequisites

Install these once before starting:

- [Node.js](https://nodejs.org) 22+
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- [Expo Go](https://expo.dev/go) on your iOS/Android device or simulator
- Java 11+ (required by the Firebase emulator)

---

## One-time setup

**1. Install dependencies**

```bash
npm install
cd functions && npm install && npm run build && cd ..
```

**2. Configure environment**

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your Firebase project values. If you are testing on a **physical device** via Expo Go, also set `EXPO_PUBLIC_EMULATOR_HOST` to your machine's LAN IP (e.g. `192.168.1.154`) — leave it unset for simulators.

---

## Running locally

Three terminals are needed. Start them in order.

### Terminal A — Firebase emulator

```bash
npm run emulator
```

The emulator UI is available at **http://localhost:4000**. Use it to inspect Auth users, Firestore documents, and Cloud Function logs.

To persist emulator state across restarts (so you don't need to re-seed every time):

```bash
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
```

> **Port conflict on Windows:** If port 8080 is already in use from a previous session, run `npm run emulator:kill` to kill the Java process, then retry.

### Terminal B — Seed game content

Run this once after the emulator starts (or after each restart if not using `--import`):

```bash
npm run seed:emulator   # seed to local emulator
npm run seed:prod       # seed to production (requires GOOGLE_APPLICATION_CREDENTIALS)
```

This writes a `contentVersions` document to Firestore with all five game banks. Verify it appears at http://localhost:4000/firestore under `contentVersions`.

> **Why this is needed:** The app fetches live content from Firestore on launch. Without a seeded version, it falls back to the bundled `constants/data.ts`. Both work, but the emulator path exercises the full content pipeline.

### Terminal C — Expo dev server

```bash
npx expo start --clear
```

Scan the QR code with Expo Go (physical device) or press `i`/`a` for iOS Simulator / Android Emulator.

---

## Firestore collections

| Collection | Populated by |
|---|---|
| `contentVersions/{versionId}` | `npm run seed:emulator` |
| `challenges/{token}` | Sending a challenge in-app |
| `helpRequests/{token}` | Asking for help in-app |
| `pushTokens/{uid}` | App launch (notification permission grant) |
| `users/{uid}/friendInteractions/{id}` | Sending/receiving challenges or help (signed-in users) |
| `users/{uid}/meta/stats` | Stats sync (debounced write on every game) |
| `users/{uid}/meta/seen` | Seen-question indices (synced alongside stats) |

---

## Auth

The app starts every user as an anonymous Firebase user — no sign-in required to play. When a user creates an account, `linkWithCredential` upgrades the anonymous session to email/password **preserving the same UID**, so all stats and interactions carry over.

**Email verification in the emulator** does not send real emails. To verify a user:
- Emulator UI → Authentication → find the user → Edit → check "Email verified"
- Or fetch the OOB link: `curl "http://localhost:9099/emulator/v1/projects/YOUR_PROJECT_ID/oobCodes"`

---

## Tests

```bash
npm test                 # run all tests
npm run test:watch       # watch mode
npm run test:coverage    # with coverage report
npm run test:rules       # Firestore security-rules suite (requires emulator running)
```

281 tests across 14 suites (app) + 59 function tests + 34 security-rules tests. TDD is mandatory for new features — write the failing test first.

---

## EAS Build & Publish

Requires `eas-cli` installed globally: `npm install -g eas-cli` and `eas login`.

### Build profiles (from `eas.json`)

| Profile | Distribution | Use for |
|---|---|---|
| `development` | Internal (TestFlight/link) | Dev client builds for feature work |
| `preview` | Internal (TestFlight/link) | QA / smoke testing |
| `production` | App Store / Play Store | Release builds |

### Build commands

```bash
# Build for a single platform
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Build for both platforms at once
eas build --profile production --platform all

# Build a development client (needed when native deps change)
eas build --profile development --platform ios
```

### OTA updates (JS-only changes)

Push a JS bundle to all users on a channel without a new binary:

```bash
eas update --channel preview --message "fix: correct answer highlight"
eas update --channel production --message "feat: new game mode"
```

> OTA updates only work for JS changes. Native dependency changes (new `expo-*` modules, `app.json` native fields) require a new binary build.

### Submit to App Store / Play Store

```bash
# iOS — uses appleId + ascAppId + appleTeamId from eas.json submit.production
eas submit --platform ios --profile production --latest

# Android
eas submit --platform android --profile production --latest
```

`--latest` picks up the most recent completed production build automatically. To submit a specific build, pass `--id <build-id>` instead.

---

## Functions

Cloud Functions source lives in `functions/src/`. After editing:

```bash
cd functions && npm run build
```

Then restart the emulator to pick up the compiled output in `functions/lib/`.

---

## Project structure

```
app/
  (tabs)/          # Tab screens: home, stats, friends, profile
  games/           # Game screens: lede, spread, sof, wave, quip
  auth/            # Auth screens: sign-up, sign-in, forgot-password
  games/challenge/ # Challenge deep-link receiver
context/           # AuthContext, ContentContext, GameContext + gameReducer
lib/               # authApi, challengeApi, helpApi, contentRepo, firebase, logger
components/        # Shared UI components
constants/
  data.ts          # Bundled game content (fallback only)
  utils.ts         # pickFromBank, calculatePoints, scoreSpread
functions/src/     # Cloud Functions
packages/shared/   # Shared types used by app and functions
```
