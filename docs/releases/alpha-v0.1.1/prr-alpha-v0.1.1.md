# Production Release Readiness — Alpha v0.1.1

Q2 UI redesign: compact home index, PLAY/PLAY AGAIN affordance, Lede headline-first, Spread multiple-choice, SoF segmented toggle. Slurp not included.

---

## Release metadata

| Field | Value |
|---|---|
| Version | `alpha-v0.1.1` |
| Target platform | iOS |
| Distribution channel | TestFlight (internal testers) |
| Target date | TBD |
| Release owner | rcsheng |
| What's new | Q2 UI redesign — home, Lede, Spread, SoF |

---

## Feature flags

| Flag | Smoke test value | Production build value | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_ENABLE_SLURP` | unset | unset | Slurp not in this release |
| `EXPO_PUBLIC_COLLECTION_PREFIX` | `qa_` | unset | `qa_` during smoke only |

**`.env.local` for smoke testing** (keep Firebase config vars, replace feature flag section):
```
EXPO_PUBLIC_COLLECTION_PREFIX=qa_
# EXPO_PUBLIC_ENABLE_SLURP must be absent or commented out
```

**`.env.local` for production build** (keep Firebase config vars, replace feature flag section):
```
# EXPO_PUBLIC_COLLECTION_PREFIX — must be absent or commented out
# EXPO_PUBLIC_ENABLE_SLURP — must be absent or commented out
```

---

## 1. Code quality

- [ ] All tests passing — `npm test` (438 tests, 37 suites at branch cut)
- [ ] Functions tests passing — `cd functions && npm test`
- [ ] No TypeScript errors — `npx tsc --noEmit`
- [ ] Code review complete (code-reviewer agent)
- [ ] Security review complete (security-reviewer agent)

---

## 2. Smoke test

Run against **production Firebase with QA collections** using `npm run start:qa`.

### Setup

```bash
npm run start:qa
```

Confirm `.env.local` has `EXPO_PUBLIC_COLLECTION_PREFIX=qa_` and `EXPO_PUBLIC_ENABLE_SLURP` is unset, then scan QR or press `i`/`a`.

For cross-device blocks, connect both devices to the same Metro server.

---

### Block 0 — Q2 Redesign: home index + three games

Run on **one device** before regression blocks.

#### 0a — Home tab (Compact Index)

| # | Step | Expected |
|---|---|---|
| 0a.1 | Cold-launch the app | Home shows a tight list: N° 01 The Lede, N° 02 The Spread, N° 03 Science or Fiction — all three visible without scrolling |
| 0a.2 | Check row styling | Each row has a game number in mono, bold-italic title, tagline below, meta strip below that. No card borders, no shadows on rows. |
| 0a.3 | Tap a row | Navigates to the correct game screen |
| 0a.4 | Check unplayed trailing element | Each unplayed game shows a small `PLAY` button (ink fill, white caps) on the right |
| 0a.5 | Play any game to completion, return to home | The played game's trailing changes to `✓ +N` in gold with `PLAY AGAIN` underlined below it |
| 0a.6 | The other two games | Still show the `PLAY` button |

#### 0b — Lede (Headline-First)

| # | Step | Expected |
|---|---|---|
| 0b.1 | Tap The Lede | Screen opens with a compact masthead (two thin rules, "Noodle Bowl" + date) — not the four-rule home masthead |
| 0b.2 | Read the headline | Large bold-italic serif text. A gold square `...` pill is inline where the blank is. No reporter names, outlets, or pitch quotes anywhere. |
| 0b.3 | Tap one of the three choices | Row fills with ink background; left bar turns accent. The `...` pill stays as `...` — it does not change to A/B/C. Lock-in button reads `LOCK IN B` (matching letter). |
| 0b.4 | Tap a different choice | Selection moves; only one row is filled at a time. |
| 0b.5 | Tap "Lock In" | Reveal appears. The `...` pill turns green. A single ink-background box shows: "THE REAL HEADLINE" label, then the full completed headline, then the explanation — all together with no gap between them. |
| 0b.6 | Look below the Lock-in button | "Stuck? Ask a friend" is a small underlined text link, not a full-width button. |

#### 0c — Spread (Multiple Choice)

| # | Step | Expected |
|---|---|---|
| 0c.1 | Tap The Spread | Screen opens with compact masthead. Question card visible at top. "TAP TO CHOOSE" kicker below. |
| 0c.2 | Read the four choices | Four rows, each with a left bar, the value + unit, and a letter (A–D). All four are plausible numbers within the same order of magnitude as each other. |
| 0c.3 | Tap a choice | Row fills with ink background; left bar turns accent. Lock-in button reads `LOCK IN B` (matching letter). |
| 0c.4 | Tap a different choice | Selection moves; only one row filled at a time. |
| 0c.5 | Tap "Lock In X" | Reveal: correct choice turns green, wrong pick (if any) turns accent. Result card shows "Nailed It" or "Not Quite", the real answer, and points (+10 or 0). Explanation block below. |
| 0c.6 | Look below the lock-in button | "Stuck? Ask a friend" is a small underlined text link. |

#### 0d — Science or Fiction (Pick The Lie)

| # | Step | Expected |
|---|---|---|
| 0d.1 | Tap Science or Fiction | Screen opens with compact masthead. Two-button segmented control at top: `STANDARD` (active, ink fill) and `WEIRD & TRUE` (inactive). |
| 0d.2 | Read the topic line | Reads "SCIENCE OR FICTION · [TOPIC]" in mono caps, noticeably larger than before. |
| 0d.3 | Read the instructions | "Two of these are real. One is a lie." + "TAP THE FAKE" in mono caps. No confidence wager buttons anywhere on screen. |
| 0d.4 | Tap `WEIRD & TRUE` | Button switches to ink fill; `STANDARD` becomes outline. Question changes to a weird-and-true topic. |
| 0d.5 | Tap claim 2 | Only claim 2 gets the accent fill + "← MY PICK". Claims 1 and 3 are unaffected. |
| 0d.6 | Tap claim 1 | Selection moves to claim 1 only. |
| 0d.7 | Tap "Lock In Claim N" | Reveal screen. Score shows +10 (correct) or 0 (wrong). No wager note. |
| 0d.8 | Look below the Lock-in button | "Stuck? Ask a friend" is a small underlined text link. |

---

### Regression blocks (Blocks 1–10)

These cover auth, challenge/help flows, content resilience, stats, and edge cases. Steps unchanged from alpha-v0.1.0 — run all on two devices where noted.

#### Block 1 — App launch & anonymous play _(both devices)_

| # | Step | Expected |
|---|---|---|
| 1.1 | Cold-launch the app | Home screen loads, no sign-in prompt |
| 1.2 | Tap any game | Game loads with a question |
| 1.3 | Answer the question | Score + result screen appears |
| 1.4 | Tap "Play Again" | New question loads |
| 1.5 | Open Stats tab | Auth gate shown ("Sign in to track your stats") |
| 1.6 | Open Friends tab | Auth gate shown ("Sign in to see friend activity") |
| 1.7 | Open Profile tab | Shows "Playing as Guest" with Create Account / Sign In buttons |

#### Block 2 — Account creation _(Device A — iPhone)_

| # | Step | Expected |
|---|---|---|
| 2.1 | Profile → Create Account | Sign-up screen opens |
| 2.2 | Fill display name, email, password (≥8 chars) → tap Create Account | Transitions to "Check your inbox" confirmation screen |
| 2.3 | Tap "Back to Games" | Returns to game, still signed in |
| 2.4 | Open Profile tab | Shows display name and email |
| 2.5 | Open Stats tab | Stats content visible (no auth gate) |
| 2.6 | Open Friends tab | Friends content visible (no auth gate) |

#### Block 3 — Sign in _(Device B — Android)_

| # | Step | Expected |
|---|---|---|
| 3.1 | Profile → Sign In | Sign-in screen opens |
| 3.2 | Enter same email + password as Device A → Sign In | Profile shows display name and email |
| 3.3 | Open Stats tab | Stats visible |
| 3.4 | Open Friends tab | Friends visible |

#### Block 4 — Auth gate on sharing _(both devices, signed in)_

| # | Step | Expected |
|---|---|---|
| 4.1 | Sign out on Device B | Profile returns to "Playing as Guest" |
| 4.2 | Play a game, tap "Ask a friend for help" | Modal: "Login to share with friends" — Sign In / Create Account / Not Now |
| 4.3 | Tap "Not Now" | Modal dismisses, no navigation |
| 4.4 | Tap "Challenge a friend" | Same modal appears |
| 4.5 | Tap "Sign In" | Navigates to sign-in screen |
| 4.6 | Sign back in | Returns to app, sharing works again |

#### Block 5 — Cross-device challenge flow _(Device A sends, Device B receives)_

| # | Step | Expected |
|---|---|---|
| 5.1 | Device A: play any game to the result screen | — |
| 5.2 | Device A: tap "Challenge a friend" | Challenge modal opens (no auth gate) |
| 5.3 | Device A: note the prediction shown, tap Share / Copy Link | URL copied or share sheet opens |
| 5.4 | Send the URL to Device B | — |
| 5.5 | Device B: open the URL | App opens to the correct game + same question |
| 5.6 | Device B: answer the question | Result screen shown on Device B |
| 5.7 | Device A: open Friends tab | New row shows Device B's answer and whether the prediction was correct |
| 5.8 | Device A: tap the same Challenge button again (same question) | Same URL returned instantly (no loading) |
| 5.9 | Device B: try to open the same challenge link again | "This challenge has already been answered" message shown |

#### Block 6 — Cross-device help flow _(Device A asks, Device B helps)_

| # | Step | Expected |
|---|---|---|
| 6.1 | Device A: play a game, reach result screen | — |
| 6.2 | Device A: tap "Ask a friend for help" | Help modal opens with a URL |
| 6.3 | Device A: copy/share URL to Device B | — |
| 6.4 | Device B: open the URL | App opens showing the question with no answers revealed |
| 6.5 | Device B: select an answer | Confirmation shown on Device B |
| 6.6 | Device A: open Friends tab | Row shows "A Friend helped you with [game]" |
| 6.7 | Device A: play a different question, tap "Ask a friend for help" | New URL generated (different token from 6.2) |

#### Block 7 — Content & offline resilience

| # | Step | Expected |
|---|---|---|
| 7.1 | Stop the Firebase emulator (or kill network) | — |
| 7.2 | Kill and relaunch the app | App loads from AsyncStorage cache; games still playable |
| 7.3 | Restore network, relaunch app | App revalidates content in background; gameplay unaffected |

#### Block 8 — Sign-out behaviour

| # | Step | Expected |
|---|---|---|
| 8.1 | Device A: Profile → Sign Out | Profile returns to "Playing as Guest" immediately |
| 8.2 | Immediately tap "Ask a friend for help" | Auth gate modal appears (no delay) |
| 8.3 | Stats tab | Auth gate shown |
| 8.4 | Friends tab | Auth gate shown |

#### Block 9 — Stats persistence to Firestore

| # | Step | Expected |
|---|---|---|
| 9.1 | As guest: play a game | No write to Firestore `users` collection |
| 9.2 | Sign in, play a game, wait ~2 s | `users/{uid}/meta/stats` doc exists with `totalPoints`, `dailyStreak`, per-game stats |
| 9.3 | Play a second game, wait ~2 s | `totalPoints` higher; second game's `played` count incremented |

#### Block 10 — Self-challenge guard & post-answer sign-up prompt

| # | Step | Expected |
|---|---|---|
| 10.1 | Device B (sender): open the same challenge URL from Block 5 | "You Created This Challenge" guard screen — no game loads |
| 10.2 | Tap "Sign Out" on the guard screen | Anonymous session starts; challenge landing reloads normally |
| 10.3 | Play the challenge as anonymous | Game opens at the correct question |
| 10.4 | Answer the question | Result + comparison panel shown |
| 10.5 | Look below the comparison panel | "Challenge [sender] Back" sign-up banner: Create Account / Maybe Later |
| 10.6 | Tap "Maybe Later" | Banner dismisses; "Back to Games" button remains |
| 10.7 | Reopen the same challenge URL | "This challenge has already been answered" |
| 10.8 | Sign back in with original account | Friends tab does not show a spurious self-challenge row |

---

## 3. Production environment

- [ ] Production Firebase project is the target (not emulator)
- [ ] `.env.local` — `EXPO_PUBLIC_COLLECTION_PREFIX` removed or unset
- [ ] `.env.local` — `EXPO_PUBLIC_ENABLE_SLURP` absent or `false`
- [ ] Production Firestore has at least one active `contentVersions` doc — `npm run seed:prod`
- [ ] Firestore security rules deployed — `firebase deploy --only firestore:rules`
- [ ] Cloud Functions deployed — `firebase deploy --only functions`
- [ ] Functions build is clean — `cd functions && npm run build`

> **Infra note:** if `challengeCreate` was redeployed from scratch, re-grant the IAM binding:
> ```bash
> gcloud run services add-iam-policy-binding challengecreate --region=us-central1 --member="allUsers" --role="roles/run.invoker" --project=noodle-bowl
> ```

---

## 4. App configuration

- [ ] `app.json` version bumped to `1.0.1` (or matching EAS auto-increment)
- [ ] `eas.json` — `appleId` and `ascAppId` filled in
- [ ] EAS CLI logged in — `eas whoami`

---

## 5. Build

```bash
eas build --platform ios --profile production
```

- [ ] Build submitted to EAS cloud
- [ ] Build completed without errors (https://expo.dev/accounts/rcsheng/projects/noodle-bowl/builds)
- [ ] `.ipa` artifact visible in dashboard

---

## 6. Submit to TestFlight

```bash
eas submit --platform ios --profile production --latest
```

- [ ] Submit completed — no errors
- [ ] Build appears in App Store Connect → TestFlight
- [ ] Status changes to "Ready to Test"

---

## 7. TestFlight tester management

- [ ] Internal testers notified
- [ ] Invite emails sent / TestFlight links distributed

---

## 8. Post-release

- [ ] Git tag created — `git tag -a alpha-v0.1.1 -m "Q2 UI redesign: compact home, Lede headline-first, Spread multiple-choice, SoF segmented toggle"`
- [ ] Tag pushed — `git push origin --tags`
- [ ] Row added to `docs/RELEASES.md`
- [ ] This PRR doc updated with actual dates and outcomes

---

## Sign-off

| Step | Done by | Date |
|---|---|---|
| Smoke tests | | |
| Build | | |
| TestFlight submit | | |
| Testers notified | | |
