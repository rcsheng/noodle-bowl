# Production Release Readiness — Alpha v0.3.0

App Store public release.

---

## Release metadata

| Field | Value |
|---|---|
| Version | `alpha-v0.3.0` |
| Target platform | iOS |
| Distribution channel | App Store public release |
| Target date | TBD |
| Release owner | rcsheng |
| What's new | Streak & shield onboarding (7 education surfaces, ShieldIcon, data model); landing screen privacy fix |

---

## Feature flags

| Flag | Smoke test value | Production build value | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_ENABLE_SLURP` | unset | unset | Slurp not in this release |
| `EXPO_PUBLIC_COLLECTION_PREFIX` | `qa_` | unset | `qa_` during smoke only |

---

## 1. Code quality

- [ ] All tests passing — `npm test`
- [ ] Functions tests passing — `cd functions && npm test`
- [ ] No TypeScript errors — `npx tsc --noEmit`
- [ ] Code review complete (code-reviewer agent)
- [ ] Security review complete (security-reviewer agent)

---

## 2. Smoke test

Full regression against **production Firebase with QA collections** (`npm run start:qa`).

> **Cross-device blocks (5, 6, 11):** Use `npm run start:prod_smoke` on both devices instead of `start:qa`. Deep links don't carry the collection prefix, so `start:qa` causes a mismatch. `start:prod_smoke` hits prod Firebase with no prefix so links round-trip correctly. ⚠️ Writes real data to prod collections — use throwaway accounts.

- [ ] Block 0 — Q2 Redesign (home, Lede, Spread, SoF)
- [ ] Block 1 — App launch / anonymous auth
- [ ] Block 2 — Account creation
- [ ] Block 3 — Sign in
- [ ] Block 4 — Auth gate on sharing
- [ ] Block 5 — Cross-device challenge flow
- [ ] Block 6 — Cross-device help flow
- [ ] Block 7 — Content & offline resilience
- [ ] Block 8 — Sign-out behaviour
- [ ] Block 9 — Stats persistence
- [ ] Block 10 — Self-challenge guard
- [ ] Block 11 — Universal link deep linking
- [ ] Block 12 — Live content (from alpha-v0.2.0 PRR)
- [ ] Block 13 — Weekly streak & shields
- [ ] Block 14 — Landing screen privacy (no question number)

---

## 3. App Store Connect

- [ ] Privacy policy live at public URL
- [ ] App listing complete (name, subtitle, description, keywords, URLs, category, age rating)
- [ ] Screenshots uploaded — iPhone 6.9" minimum
- [ ] App preview video (optional)
- [ ] App Store Connect status: "Ready for Review"

---

## 4. Production environment

- [ ] Production Firebase project is the target (not emulator)
- [ ] `.env.local` — `EXPO_PUBLIC_COLLECTION_PREFIX` absent or unset for prod build
- [ ] Production `contentVersions` has a doc for the current active ISO week (e.g. `2026-W21`)
- [ ] `contentPacks` collection up to date
- [ ] Firestore security rules deployed and verified
- [ ] Cloud Functions deployed and verified
- [ ] AASA file live: `https://noodlebowl.app/.well-known/apple-app-site-association`

---

## 5. App configuration

- [x] `app.json` version bumped to `0.3.0`
- [ ] `eas.json` — submit config verified (`appleId`, `ascAppId`, `appleTeamId` set)
- [ ] EAS CLI logged in — `eas whoami`

---

## 6. Build

```bash
eas build --platform ios --profile production
```

- [ ] Build submitted to EAS cloud
- [ ] Build completed without errors
- [ ] `.ipa` artifact visible in EAS dashboard

---

## 7. Submit to App Store

```bash
eas submit --platform ios --profile production --latest
```

Choose **App Store** (not TestFlight) in the submission flow.

- [ ] Submit completed — no errors
- [ ] Build appears in App Store Connect → App Store tab
- [ ] Status changes to "Waiting for Review"

---

## 8. Post-release

- [ ] Git tag: `git tag -a alpha-v0.3.0 -m "feat: App Store public release"`
- [ ] Push tag: `git push origin --tags`
- [ ] Row added to `docs/RELEASES.md`
- [ ] This PRR updated with actual dates and outcomes

---

## Block 13 — Streak & shield basics (pre-existing)

Run against `npm run start:qa`. Use a signed-in account so stats persist.

| # | Step | Expected |
|---|---|---|
| 13.1 | Play any game for the first time this week | Weekly streak increments by 1; weeks played increments by 1 |
| 13.2 | Play a second game the same week | Streak and weeks played unchanged (idempotent) |
| 13.3 | Open Stats tab | Streak, best streak, weeks played show correct numbers — no `NaN` or `—` |
| 13.4 | Home screen section header | Shows "GAMES BASED ON LAST WEEK'S NEWS · [month range]" |

---

## Block 15 — Streak & shield onboarding (new in v0.3.0)

### Setup

**Start fresh.** Uninstall/reinstall Expo Go on the test device (or `npm run android:wipe`), then open with `npm run start:qa`. Use a fresh throwaway account — the onboarding flags are per-user and fire only once.

---

### 15a — Masthead chip & tooltip (always-on)

Run at any point; no special state needed.

| # | Step | Expected |
|---|---|---|
| 15a.1 | Play one game so streak = 1 | Masthead chip shows `🔥 1` + 3 shield slot icons (all outline) |
| 15a.2 | Tap the masthead chip | Tooltip popover appears: streak count, shield count, one-line mechanic recap |
| 15a.3 | Tap outside the tooltip | Tooltip dismisses |
| 15a.4 | Earn a shield (any method) | Chip updates: 1 filled shield slot + 2 outline |

---

### 15b — Stats tab shield slot row & week chain (always-on)

| # | Step | Expected |
|---|---|---|
| 15b.1 | Open Stats tab (signed-in) | **SHIELDS** section visible: 3 slot icons, filled count matches `streakShieldsAvailable` |
| 15b.2 | Check slot label | Reads `N of 3` (or `Full — give one to a friend!` at 3) |
| 15b.3 | Open Stats tab after playing once | **LAST 6 WEEKS** section shows 1 filled brick for the current week; remaining bricks are dashed/future |

---

### 15c — Friends tab slot UI & How It Works (always-on)

Must be signed in (anon gets auth gate, unchanged).

| # | Step | Expected |
|---|---|---|
| 15c.1 | Open Friends tab, 0 shields | 3 large outline shield slot icons centered; italic title "THREE EMPTY SLOTS, WAITING." |
| 15c.2 | Check body copy | Explains shields are given by friends (not earned solo) |
| 15c.3 | Check How It Works section | 3 numbered steps: You ask or challenge → They answer → You get a shield |
| 15c.4 | Earn a shield, return to Friends tab | Slot row updates: 1 filled + 2 outline; How It Works collapses |

---

### 15d — Streak ignition modal §1a (fires once, first-ever game)

**Requires fresh account / wiped state.**

| # | Step | Expected |
|---|---|---|
| 15d.1 | Play any game to completion | After result screen: **StreakIgnitionModal** appears — `WEEKLY STREAK — ESTABLISHED`, big `1`, shield slots row, body copy |
| 15d.2 | Tap **Got it** | Modal dismisses; flag `streakIntroSeen` set |
| 15d.3 | Play another game | Modal does NOT fire again |
| 15d.4 | Force-quit and reopen app; play a game | Modal still does not fire (flag persisted) |

---

### 15e — Shield primer modal §1b (fires once, first ask-a-friend tap)

**Requires fresh account / wiped state.** Play one game first so you're on a result screen with the ask-a-friend option available on the *next* game.

| # | Step | Expected |
|---|---|---|
| 15e.1 | Start any game (play phase), tap **"Stuck? Ask a friend"** | **ShieldPrimerModal** appears — `STREAK SHIELDS` kicker, 3 outline slots, gift-mechanic body copy |
| 15e.2 | Tap **"Not now"** | Modal dismisses; NO help link created; flag NOT set |
| 15e.3 | Tap "Ask a friend" again | Primer fires again (flag still unset) |
| 15e.4 | Tap **"Ask a friend →"** (primary CTA) | Modal dismisses; flag `shieldPrimerSeen` set; help sheet opens |
| 15e.5 | Start a different game, tap "Ask a friend" | Goes straight to help sheet — no primer |
| 15e.6 | Force-quit, reopen, tap "Ask a friend" | Still no primer (flag persisted) |

---

### 15f — ShieldIcon everywhere (no emoji §1i)

Quick visual scan; no special state.

| # | Step | Expected |
|---|---|---|
| 15f.1 | Earn a shield | **ShieldEarnedToast** shows monoline shield icon + "Shield earned" — no 🛡 emoji |
| 15f.2 | Complete a help game as anonymous user | **ShieldSignUpBanner** shows monoline shield icon in heading |
| 15f.3 | Check ShieldSavedBanner on home (if shield previously saved streak) | Monoline shield icon in banner, sub-text "Earn another by helping a friend or answering a challenge." |

---

### 15g — At-risk banner §1e (weekend only)

**Can only run on Saturday or Sunday.** Skip if today is Mon–Fri; come back to it.

Setup: ensure signed-in account has `weeklyStreak ≥ 2` and has NOT played the current ISO week.

| # | Step | Expected |
|---|---|---|
| 15g.1 | Open home tab on Sat or Sun | **StreakAtRiskBanner** visible below masthead — gold background, streak count, explanation |
| 15g.2 | Tap **✕** dismiss | Banner disappears |
| 15g.3 | Force-quit, reopen same day | Banner stays dismissed |
| 15g.4 | (Next week) Open home tab | Banner gone (new ISO week; dismissal was for previous week only) |

---

### 15h — First shield earned modal §1c (needs cross-device help flow)

⚠️ **Requires prod_smoke** — deep link round-trip won't work in QA. Run this block with `npm run start:prod_smoke` on both devices using throwaway accounts.

| # | Step | Expected |
|---|---|---|
| 15h.1 | Device A: play a game, ask for help (primer if first time → proceed), share link to Device B | Help link generated; `qa_helpRequests` doc created (or `helpRequests` in prod_smoke) |
| 15h.2 | Device B: open link, play game, lock in answer | Help response submitted |
| 15h.3 | Device A: navigate to any screen | **FirstShieldEarnedModal** fires — large ShieldIcon, gift framing, `"[Friend] gave you a shield."`, 1-of-3 slot row |
| 15h.4 | Tap **Keep playing** | Modal dismisses; `firstShieldEarnedSeen` flag set |
| 15h.5 | Device A: earn a second shield (another help/challenge) | Regular 2.2 s **ShieldEarnedToast** fires — NOT the modal |

---

## Block 14 — Landing screen privacy (no question number)

⚠️ **Requires prod_smoke** — deep links don't round-trip in QA. Run with `npm run start:prod_smoke` on both devices.

| # | Step | Expected |
|---|---|---|
| 14.1 | Device A: complete a game, challenge a friend, share link to Device B | — |
| 14.2 | Device B: open the challenge link | Landing card reads **"They challenged you to answer a question."** — no "question #N" anywhere |
| 14.3 | Device A: play a game, ask for help, share link to Device B | — |
| 14.4 | Device B: open the help link | Landing card reads **"They're stuck and need your help."** — no "question #N" anywhere |
| 14.5 | Tap Play on either landing screen | Game launches to the correct question; friend hint / challenge comparison works normally |

---

## Sign-off

| Step | Done by | Date |
|---|---|---|
| Code quality | | |
| Smoke tests | | |
| App Store listing | | |
| Build | | |
| App Store submit | | |
