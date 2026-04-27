# Noodle Bowl — Smoke Test Plan

**Purpose:** Verify that auth, content, gameplay, and the cross-device challenge/help flows work end-to-end before shipping or after any significant change.

**Devices:**
- **Device A** — iPhone running Expo Go (physical device)
- **Device B** — Android emulator (`Pixel_9` AVD) running Expo Go

Both devices connect to the same `npx expo start` Metro server and the same local Firebase emulator.

---

## Setup (do this once per session)

**Terminal 1 — Firebase emulator**
```bash
npm run emulator
```
Wait until you see `All emulators ready`. Emulator UI: http://localhost:4000

**Terminal 2 — Seed content**
```bash
npm run seed:emulator
```
Confirm a `contentVersions` doc appears at http://localhost:4000/firestore.

**Terminal 3 — Expo dev server**
```bash
npx expo start --clear
```
- iPhone: scan the QR code with the Camera app (opens in Expo Go)
- Android emulator: press `a` in this terminal

> **Simulator/emulator note:** iOS Simulator uses `localhost`; Android Emulator auto-uses `10.0.2.2` — both work with no config. For **physical devices**, set `EXPO_PUBLIC_EMULATOR_HOST` in `.env.local` to your machine's LAN IP (e.g. `192.168.1.x` — find it with `ipconfig` on Windows).

---

## Test suite

### Block 1 — App launch & anonymous play

Run on **both devices independently**.

| # | Step | Expected |
|---|---|---|
| 1.1 | Cold-launch the app | Home screen loads, no sign-in prompt |
| 1.2 | Tap any game | Game loads with a question |
| 1.3 | Answer the question | Score + result screen appears |
| 1.4 | Tap "Play Again" | New question loads |
| 1.5 | Open Stats tab | Auth gate shown ("Sign in to track your stats") |
| 1.6 | Open Friends tab | Auth gate shown ("Sign in to see friend activity") |
| 1.7 | Open Profile tab | Shows "Playing as Guest" with Create Account / Sign In buttons |

---

### Block 2 — Account creation (Device A — iPhone)

| # | Step | Expected |
|---|---|---|
| 2.1 | Profile → Create Account | Sign-up screen opens |
| 2.2 | Fill display name, email, password (≥8 chars) → tap Create Account | Transitions to "Check your inbox" confirmation screen |
| 2.3 | Tap "Back to Games" | Returns to game, still signed in |
| 2.4 | Open Profile tab | Shows display name and email |
| 2.5 | Open Stats tab | Stats content visible (no auth gate) |
| 2.6 | Open Friends tab | Friends content visible (no auth gate) |
| 2.7 | Check emulator Auth UI at http://localhost:4000/auth | User appears with the email you used |

---

### Block 3 — Sign in (Device B — Android)

| # | Step | Expected |
|---|---|---|
| 3.1 | Profile → Sign In | Sign-in screen opens |
| 3.2 | Enter same email + password as Device A → Sign In | Profile shows display name and email |
| 3.3 | Open Stats tab | Stats visible |
| 3.4 | Open Friends tab | Friends visible |

---

### Block 4 — Auth gate on sharing (both devices, while signed in)

| # | Step | Expected |
|---|---|---|
| 4.1 | Sign out on Device B (Profile → Sign Out) | Profile returns to "Playing as Guest" |
| 4.2 | Play a game, tap "Ask a friend for help" | Modal appears: "Login to share with friends" with Sign In / Create Account / Not Now |
| 4.3 | Tap "Not Now" | Modal dismisses, no navigation |
| 4.4 | Tap "Challenge a friend" | Same modal appears |
| 4.5 | Tap "Sign In" | Navigates to sign-in screen |
| 4.6 | Sign back in | Returns to app, sharing works again |

---

### Block 5 — Cross-device challenge flow

**Device A sends, Device B receives.**

| # | Step | Expected |
|---|---|---|
| 5.1 | Device A: play any game to the result screen | — |
| 5.2 | Device A: tap "Challenge a friend" | Challenge modal opens (no auth gate) |
| 5.3 | Device A: note the prediction shown, tap Share / Copy Link | URL copied or share sheet opens |
| 5.4 | Send the URL to Device B (AirDrop, email, paste into Android browser, etc.) | — |
| 5.5 | Device B: open the URL | App opens to the correct game + same question |
| 5.6 | Device B: answer the question | Result screen shown on Device B |
| 5.7 | Device A: open Friends tab | New row shows Device B's answer and whether the prediction was correct |
| 5.8 | Device A: tap the same Challenge button again (same question) | Same URL returned instantly (no loading) |
| 5.9 | Device B: try to open the same challenge link again | "This challenge has already been answered" message shown |

---

### Block 6 — Cross-device help flow

**Device A asks, Device B helps.**

| # | Step | Expected |
|---|---|---|
| 6.1 | Device A: play a game, reach result screen | — |
| 6.2 | Device A: tap "Ask a friend for help" | Help modal opens with a URL |
| 6.3 | Device A: copy/share URL to Device B | — |
| 6.4 | Device B: open the URL | App opens showing the question with no answers revealed |
| 6.5 | Device B: select an answer | Confirmation shown on Device B |
| 6.6 | Device A: open Friends tab | Row shows "A Friend helped you with [game]" |
| 6.7 | Device A: play a different question in the same game, tap "Ask a friend for help" | New URL generated (different token from step 6.2) |

---

### Block 7 — Content & offline resilience

| # | Step | Expected |
|---|---|---|
| 7.1 | Stop the Firebase emulator | — |
| 7.2 | Kill and relaunch the app on either device | App loads using AsyncStorage cache, games still playable |
| 7.3 | Restart the emulator, relaunch app | App revalidates content in background, gameplay unaffected |

---

### Block 8 — Sign-out behaviour

| # | Step | Expected |
|---|---|---|
| 8.1 | Device A: Profile → Sign Out | Profile returns to "Playing as Guest" immediately |
| 8.2 | Immediately tap "Ask a friend for help" in a game | Auth gate modal appears (no delay) |
| 8.3 | Device A: Stats tab | Auth gate shown |
| 8.4 | Device A: Friends tab | Auth gate shown |

---

### Block 9 — Stats persistence to Firestore (Phase 4)

**Requires:** signed-in user and Emulator UI open at http://localhost:4000/firestore

| # | Step | Expected |
|---|---|----|
| 9.1 | Stay as guest (no sign-in). Play any game to the result screen. Open Firestore in Emulator UI. | `users` collection is empty — no write for anonymous sessions |
| 9.2 | Sign in (Profile → Sign In or Create Account). Play any game to the result screen. Wait ~2 seconds. | Emulator UI → `users/{uid}/meta/stats` doc exists with `totalPoints`, `dailyStreak`, `lastPlayedDate`, per-game stats, and an `updatedAt` server timestamp |
| 9.3 | Play a second game. Wait ~2 seconds. Refresh the `stats` doc. | `totalPoints` is higher; the second game's `played` count incremented; `updatedAt` is newer |
| 9.4 | Profile → Sign Out. In Emulator UI, manually edit the `stats` doc: set `totalPoints` to `9999` and `lastPlayedDate` to today's date. Sign back in. | App shows `9999` points (server date ≥ local date → server wins the merge) |

---

### Block 10 — Self-challenge guard & post-answer sign-up prompt

**Requires:** Device B signed in as the challenge sender (same account that sent the challenge in Block 5).

| # | Step | Expected |
|---|---|---|
| 10.1 | Device B (sender): open the same challenge URL you sent in Block 5 | "You Created This Challenge" guard screen appears; no game loads |
| 10.2 | Device B: tap "Sign Out" on the guard screen | User is signed out and a fresh anonymous session starts; challenge landing page reloads normally |
| 10.3 | Device B (now anonymous): tap "Play [Game]" | Game opens at the correct question |
| 10.4 | Device B: answer the question | Result + comparison panel shown |
| 10.5 | Device B: observe below the comparison panel | "Challenge [sender] Back" sign-up banner appears with "Create Account" and "Maybe Later" |
| 10.6 | Device B: tap "Maybe Later" | Banner dismisses; "Back to Games" button remains |
| 10.7 | Device B: reopen the same challenge URL | "This challenge has already been answered" error shown |
| 10.8 | Device B: Profile → Sign In with original account | Returns to signed-in state; Friends tab does **not** show a spurious "you challenged yourself" row from the guard flow |

---

## Pass criteria

All items in Blocks 1–9 behave as expected. No crashes, no blank screens, no "Something went wrong" errors during normal flows.

## Known limitations (emulator)

- Verification emails are not sent. To mark a user verified: http://localhost:4000/auth → Edit → check "Email verified". The app does not require verification to function.
- Push notifications do not fire on Android emulator (no Google Play Services on AVD by default). The Friends feed update in step 5.7 is driven by a Firestore `onSnapshot` listener, not a push notification — it will still update.
- **Deep links do not work via clicked HTTPS URLs in Expo Go.** Universal links (`https://noodlebowl.app/c/TOKEN`) require a standalone build with `associatedDomains` (iOS) and `intentFilters` (Android) configured and a live domain. For smoke testing, trigger deep links manually:
  - **Android emulator:** `adb shell am start -W -a android.intent.action.VIEW -d "exp://10.0.2.2:8081/--/games/challenge/TOKEN" host.exp.exponent`
  - **iOS Simulator:** `xcrun simctl openurl booted "exp://localhost:8081/--/games/challenge/TOKEN"`
  - Replace `TOKEN` with the token from the copied challenge URL (the part after `/c/`).
