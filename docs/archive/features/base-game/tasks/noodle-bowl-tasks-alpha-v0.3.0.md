# Noodle Bowl — Task List alpha-v0.3.0

**PRD ref:** `noodle-bowl-prd-alpha-v0.3.0.md`
**Last updated:** 2026-05-27

---

## 1. Streak & Shield Onboarding

### §1j Data model (reducer + context + storage)

- [x] `context/__tests__/GameContext.reducer.test.ts` — RED: 29 new tests covering `onboarding` field defaults, `DISMISS_ONBOARDING_FLAG`, `DISMISS_AT_RISK`, `UPDATE_WEEKLY_STREAK` week-history, `LOAD` backward-compat, `MERGE_FROM_SERVER` any-true-wins
- [x] `context/gameReducer.ts` — `OnboardingFlags` interface; `MAX_SHIELDS = 3`; `defaultOnboarding`; `recentPlayedWeeks`/`shieldSaveWeeks` on `AppState.stats`; `EARN_SHIELD` clamps at 3; `LOAD` restores all three new fields; `UPDATE_WEEKLY_STREAK` appends to week-history arrays; `MERGE_FROM_SERVER` onboarding merge; `DISMISS_ONBOARDING_FLAG` case; `DISMISS_AT_RISK` case
- [x] `context/GameContext.tsx` — `dismissOnboardingFlag` + `dismissAtRisk` callbacks; `earnStreakShield` Firestore write clamped to `MAX_SHIELDS`
- [x] Run tests → GREEN (461 passing)

### §1i Iconography — monoline ShieldIcon

- [x] Install `react-native-svg` via `npx expo install react-native-svg`
- [x] `components/ui/ShieldIcon.tsx` — `filled` / `outline` / `gold` variants; `size` prop
- [x] `jest.setup.ts` — comprehensive `react-native-svg` mock (no-op stubs for all SVG primitives)
- [x] `components/ShieldEarnedToast.tsx` — replace `🛡` emoji with `ShieldIcon size={14}` + `suppressed` prop
- [x] `components/ShieldSignUpBanner.tsx` — replace `🛡` emoji with `ShieldIcon size={18}`
- [x] `components/ShieldSavedBanner.tsx` — replace `🛡` emoji with `ShieldIcon size={13}` + `sub` text
- [x] `components/__tests__/ShieldEarnedToast.test.tsx` — update to `'Shield earned'` (SVG separate from text)
- [x] `components/__tests__/ShieldSignUpBanner.test.tsx` — update to `'Sign up to keep your shield'`

### §1a Streak ignition modal

- [x] `components/StreakIgnitionModal.tsx` — fires when `totalWeeksPlayed === 1 && weeklyStreak === 1 && !streakIntroSeen`; 3 outline shield slots; "Got it" CTA; fade-in animation

### §1b Shield primer modal

- [x] `components/ShieldPrimerModal.tsx` — intercepts first "Ask a Friend" tap; 3-step list; "Ask a friend →" / "Not now" CTAs
- [x] `app/games/lede.tsx` — `handleAskFriend()` + `handleShieldEarned()` helpers; ShieldPrimerModal JSX
- [x] `app/games/spread.tsx` — same pattern
- [x] `app/games/sof.tsx` — same pattern
- [x] `app/games/quip.tsx` — same pattern
- [x] `app/games/wave.tsx` — same pattern

### §1c First shield earned modal

- [x] `components/FirstShieldEarnedModal.tsx` — fires on first `streakShieldsAvailable` 0→1 transition; large ShieldIcon; 3-slot row; gift framing; "Keep playing" CTA
- [x] All five game screens — `handleShieldEarned()` routes to modal (first) vs. toast (repeat); `ShieldEarnedToast suppressed={firstShieldModalVisible}`

### §1d Shield saved modal (first time)

- [x] `components/ShieldSavedModal.tsx` — gold ShieldIcon; slot row (first=gold); "Keep it going" CTA
- [x] `app/(tabs)/index.tsx` — `showShieldSavedModal` condition (first-time only, not shown if ignition modal active)

### §1e Streak at-risk banner

- [x] `components/StreakAtRiskBanner.tsx` — Sat/Sun only; `weeklyStreak ≥ 2`; not played this week; gold background; dismiss stores week ID
- [x] `app/(tabs)/index.tsx` — `showAtRiskBanner` condition; `dismissAtRisk(currentWeek)` on dismiss

### §1f Stats tab — shield slot row + week chain

- [x] `app/(tabs)/explore.tsx` — 3-slot ShieldIcon row; "Last 6 Weeks" brick row from `recentPlayedWeeks` + `shieldSaveWeeks`

### §1g Friends tab — slot UI + how-it-works

- [x] `app/(tabs)/friends.tsx` — 3 large ShieldIcon slots; "How it works" 3-step section

### §1h Tappable masthead chip

- [x] `components/Masthead.tsx` — `Pressable` chip with 🔥 count + mini 3-slot shield row; tooltip Modal on tap

---

## 2. Landing Screen Privacy

- [x] `app/games/challenge/[token].tsx` — `They challenged you to answer a question.` (no question #)
- [x] `app/games/help/[token].tsx` — `They're stuck and need your help.` (no question #)

---

## 3. Code quality gates

- [ ] `npm test` — all tests passing
- [ ] `cd functions && npm test` — functions tests passing
- [ ] `npx tsc --noEmit` — no TypeScript errors
- [ ] **code-reviewer** agent — full diff since alpha-v0.2.0
- [ ] **security-reviewer** agent — Firestore onboarding fields

---

## 4. Smoke tests (→ PRR §2 for step-by-step)

Standard blocks run against `npm run start:qa`. Blocks marked `prod_smoke` require `npm run start:prod_smoke` on both devices (deep links don't carry the QA prefix).

- [ ] Block 0 — Q2 Redesign (home, Lede, Spread, SoF)
- [ ] Block 1 — App launch / anonymous auth
- [ ] Block 2 — Account creation
- [ ] Block 3 — Sign in
- [ ] Block 4 — Auth gate on sharing
- [ ] Block 5 — Cross-device challenge flow `prod_smoke`
- [ ] Block 6 — Cross-device help flow `prod_smoke`
- [ ] Block 7 — Content & offline resilience
- [ ] Block 8 — Sign-out behaviour
- [ ] Block 9 — Stats persistence
- [ ] Block 10 — Self-challenge guard
- [ ] Block 11 — Universal link deep linking `prod_smoke`
- [ ] Block 12 — Live content
- [ ] Block 13 — Weekly streak & shields
- [ ] Block 14 — Landing screen privacy `prod_smoke`
- [ ] Block 15 — Streak & shield onboarding (new — 15a–15h; 15h requires `prod_smoke`)

---

## 5. App Store Connect (→ PRR §3)

- [ ] Privacy policy live at `https://noodlebowl.app/privacy`
- [ ] App listing complete (name, subtitle, description, keywords, URLs, category, age rating) 🔄
- [ ] Screenshots uploaded — iPhone 6.9" minimum 🔄 *(in progress — separate thread)*
- [ ] App preview video *(optional — skip if not ready)*
- [ ] Status set to **Ready for Review**

---

## 6. Production environment (→ PRR §4–5)

- [ ] `contentVersions` has a doc for the active ISO week at release time
- [ ] Firestore security rules deployed and verified
- [ ] Cloud Functions deployed and verified
- [ ] AASA file live: `https://noodlebowl.app/.well-known/apple-app-site-association`
- [ ] `eas.json` — `appleId`, `ascAppId`, `appleTeamId` verified
- [ ] `eas whoami` — EAS CLI logged in

---

## 7. Build & submit

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest
```

- [ ] Build submitted to EAS cloud
- [ ] Build completed without errors
- [ ] `.ipa` artifact visible in EAS dashboard
- [ ] Submission completed — no errors
- [ ] Build appears in App Store Connect → App Store tab
- [ ] Status changes to **Waiting for Review**

---

## 8. Post-release

- [ ] Git tag: `git tag -a alpha-v0.3.0 -m "feat: App Store public release"`
- [ ] Push tag: `git push origin --tags`
- [ ] Add row to `docs/RELEASES.md`
- [ ] PRR sign-off complete (`docs/releases/alpha-v0.3.0/prr-alpha-v0.3.0.md`)

---

## Deferred (not in this release)

- [ ] [P2] Streak milestones (4 / 12 / 26 / 52 weeks)
- [ ] [P2] Engraved-monogram shield variant
- [ ] [P2] Shield primer re-promptable (if 0 shields for 3+ weeks)
- [ ] [P2] Cross-device dismissal race (simultaneous open on two devices)
- [ ] [P3] Garbage-collect orphaned `received_help` interactions
- [ ] [P3] Animated entry/exit on Help Result / Challenge Reply cards
- [ ] [P3] Shield-fill animation
- [ ] [P3] Architecture docs
- [ ] [P3] Push notifications (permanently deferred)
