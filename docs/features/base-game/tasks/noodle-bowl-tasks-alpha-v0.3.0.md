# Noodle Bowl — Task List alpha-v0.3.0

**PRD ref:** `noodle-bowl-prd-alpha-v0.3.0.md`
**Last updated:** 2026-05-25

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

## 3. Cross-cutting quality

- [ ] `npx tsc --noEmit` — clean (no TypeScript errors)
- [ ] Run **code-reviewer** agent — full diff since alpha-v0.2.0
- [ ] Run **security-reviewer** agent — focus on new Firestore onboarding fields
- [ ] **Block 0 smoke test** (current release PRR) after any UI change
- [ ] Update `docs/RELEASES.md` row for `alpha-v0.3.0` once shipped

---

## Release

- [ ] Cut EAS build: `eas build --platform ios --profile production`
- [ ] Submit to App Store: `eas submit --platform ios --profile production --latest`
- [ ] Tag: `git tag -a alpha-v0.3.0 -m "feat: streak & shield onboarding + landing privacy"`
- [ ] Push tag: `git push origin --tags`
- [ ] Add row to `docs/RELEASES.md`

---

## Deferred (not in this release)

- [ ] [P2] App Store submission — privacy policy URL, App Store Connect listing, screenshots, `app.json` 0.4.0 bump (moved to alpha-v0.4.0)
- [ ] [P2] Streak milestones (4 / 12 / 26 / 52 weeks)
- [ ] [P2] Engraved-monogram shield variant
- [ ] [P2] Shield primer re-promptable (if 0 shields for 3+ weeks)
- [ ] [P2] Cross-device dismissal race (simultaneous open on two devices)
- [ ] [P3] Garbage-collect orphaned `received_help` interactions
- [ ] [P3] Animated entry/exit on Help Result / Challenge Reply cards
- [ ] [P3] Shield-fill animation
- [ ] [P3] Architecture docs
- [ ] [P3] Push notifications (permanently deferred)
