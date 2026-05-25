# Noodle Bowl — PRD alpha-v0.3.0

**Status:** In progress
**Last updated:** 2026-05-25
**What's new:** Streak & shield onboarding — seven new education surfaces. App Store submission work deferred to alpha-v0.4.0.

---

## Overview

alpha-v0.3.0 pivots to address the most consistent piece of user feedback so far: **players don't understand what streaks and shields are, or how to earn them.** Both mechanics exist and work — they're just invisible.

| Track | Goal |
|---|---|
| **Streak & shield onboarding** | Seven new education surfaces. No mechanic changes — just timing, visibility, framing. |
| **Landing screen privacy** | Remove question number from help and challenge landing screens. Carried from previous v0.3.0 scope. |

App Store submission (privacy policy URL, App Store Connect listing, screenshots) moves to **alpha-v0.4.0**. The onboarding work materially changes what new App Store users will see on day one, so shipping the listing before the onboarding lands would put the wrong product in front of the wrong reviewers.

---

## 1. Streak & Shield Onboarding

### Background

Current state — six surfaces touch streaks or shields, none of them teach:

| Surface | Where | Problem |
|---|---|---|
| Masthead `🔥 N 🛡 N` chip | Every screen | 13 px decoration; not tappable; hidden when zero |
| `ShieldEarnedToast` | End of game, 2.2 s | Reads as system log; explains nothing |
| `ShieldSavedBanner` | Home, post-miss | Only time player learns the mechanic actually fired — too late |
| `StreakCelebrationModal` | Game completion | No context first time it fires; bare numeral |
| Friends tab "Streak Shields" card | Friends tab | Best existing copy, but anon users can't reach it; no slot UI |
| `ShieldSignUpBanner` | Game end, anon only | Conflates education with sign-up upsell |

Result: new players don't form a mental model. By the time the system explains itself (via the saved-streak banner) the player has already done the eligible action without understanding why.

### Design reference

Full design rationale, Duolingo teardown, mocked screens, and open-question recommendations live in:

```
docs/features/base-game/design/streak-shield-onboarding.html
```

This PRD is the canonical scope; the design doc is the canonical *look* and *reasoning*.

### Principles (binding)

1. **Teach only what's about to happen.** No mechanic gets explained until the player is one tap away from using it.
2. **Shields are gifts, not insurance.** Foreground the friend's name — "Mei gave you a shield," not "you earned a shield."
3. **One modal per session, max.** Second eligible education moment downgrades to an inline banner.
4. **Visible cap, visible slots.** Wherever a shield count appears, render empty slots too. Mental model = "n of 3," not just "n."
5. **Weekly rhythm, not daily anxiety.** No countdowns, no flame multipliers, no "play now or else."
6. **Anon users get the same education, different ending.** Sign-up CTA appears *after* the value is shown, not embedded inside the lesson.

---

### 1a. Streak ignition modal

**Trigger:** First-ever game completion (`stats.totalWeeksPlayed === 0` before this play resolves).
**Frequency:** Once per user.
**Surface:** Full-screen modal overlay on the game result screen.

**Replaces:** The v1 case of `StreakCelebrationModal` (which currently fires identically every week).

**Contents:**
- Kicker: `WEEKLY STREAK — ESTABLISHED`
- Big italic `1`
- Sublabel: `week in a row`
- Week-chain visualization: W1 = filled (accent), W2–W4 = dashed-outline future
- Body copy: *"Each week you play at least one game, your streak grows. Play next week to keep it going — you have until Sunday night."*
- Primary CTA: `Got it`
- Secondary: `Tell me more` → advances to a second card teasing the shield mechanic (only shown if `shieldPrimerSeen === false`)

**Acceptance criteria:**
- [ ] Fires exactly once, on the player's first-ever game completion
- [ ] Does not fire for any subsequent first-game-of-the-week event
- [ ] Persisted via `onboarding.streakIntroSeen` flag (see §1j)
- [ ] On 2nd+ week starts, fall through to the standard `StreakCelebrationModal`

### 1b. Shield primer modal

**Trigger:** First time the player taps **Ask a friend for help** OR **Challenge a friend** during a game.
**Frequency:** Once per user.
**Surface:** Modal overlay on the game screen.

**Contents:**
- Kicker: `STREAK SHIELDS`
- Slot row: three empty shield slots (monoline SVG, see §1i)
- Sublabel: `0 of 3 shields`
- Body copy: *"A shield is a gift from a friend. Ask one for help with this question — when they answer, you earn a shield that protects your streak for a missed week."*
- Primary CTA: `Ask a friend →` (or `Challenge a friend →` if entered via challenge path) — **proceeds to the share sheet**
- Secondary: `Not now` → returns to question

**Acceptance criteria:**
- [ ] Fires on the first invocation of either ask-for-help or challenge-friend flow
- [ ] Does not block the action — primary CTA continues into the existing share flow
- [ ] `Not now` returns the player to the question without sending anything
- [ ] Persisted via `onboarding.shieldPrimerSeen` flag
- [ ] Shows for both anonymous and signed-in users with identical copy

### 1c. First shield earned modal

**Trigger:** Player's first-ever shield is earned (`stats.streakShieldsAvailable` increments from 0 for the first time after `onboarding.firstShieldEarnedSeen === false`).
**Frequency:** Once per user.
**Surface:** Full-screen modal, fires on the next screen the player lands on after the eligible action resolves.

**Replaces:** The first instance only of `ShieldEarnedToast`. Subsequent shields keep the existing 2.2 s toast.

**Contents:**
- Kicker: `YOUR FIRST SHIELD`
- Large monoline shield SVG (accent fill)
- Hero copy: *"**{friendName}** gave you a shield."*
- Sub-kicker: `She answered your Spread question` (verb varies: "answered your X question" / "accepted your X challenge")
- Slot row: `1 of 3` filled, two empty
- Sublabel: `Protects 1 missed week`
- Body copy: *"Miss a week? This shield absorbs it — your streak stays intact."*
- Primary CTA: `Nice`
- Secondary: `See how shields work` → routes to Friends tab

**Anon variant:** Primary CTA becomes `Sign up to keep it` (existing sign-up flow); secondary becomes `Stay as guest` (dismisses, modal does not re-fire; the existing `ShieldSignUpBanner` is suppressed afterward — no double-ask).

**Acceptance criteria:**
- [ ] Fires once, the first time `streakShieldsAvailable` transitions from 0 → 1 for that user
- [ ] Friend name resolved from the originating `FriendInteraction`
- [ ] Verb correctly reflects the path (help / challenge)
- [ ] Suppresses the toast for that single event (no double-celebration)
- [ ] Anon variant suppresses `ShieldSignUpBanner` on this same session
- [ ] Persisted via `onboarding.firstShieldEarnedSeen` flag

### 1d. Shield saved your streak modal (first time)

**Trigger:** First time `streakShieldUsedThisWeek` transitions to `true` AND `onboarding.firstShieldSaveSeen === false`.
**Frequency:** Once per user.
**Surface:** Full-screen modal on home, replaces the existing `ShieldSavedBanner` for this single occurrence.

**Contents:**
- Kicker (gold): `🛡 SHIELD TRIGGERED`
- Cracked-shield illustration (monoline shield with break-line, gold fill)
- Hero: *"Your streak survived."*
- Sub-kicker: `A shield covered last week`
- Week chain showing the absorbed gap: `W1 done · W2 shield · W3 now · W4 future`
- Stats line: *"Weekly streak: 3 · Shields: 0 of 3"*
- Italic muted copy: *"Help a friend or take a challenge to earn another."*
- Primary CTA: `Continue`
- Secondary: `Find a friend to help →` → routes to Friends tab

**Acceptance criteria:**
- [ ] Fires on the player's next session after a shield absorbs a miss (first occurrence only)
- [ ] Subsequent shield-saves use the existing inline `ShieldSavedBanner` unchanged
- [ ] Week chain reflects actual `lastPlayedWeek` history
- [ ] Persisted via `onboarding.firstShieldSaveSeen` flag

### 1e. Streak at-risk inline banner

**Trigger:** Player opens the home tab on Saturday or Sunday AND has not played the current ISO week AND `weeklyStreak ≥ 2`.
**Frequency:** Once per week, dismissible.
**Surface:** Inline banner at top of home tab, below masthead, above game list.

**Contents:**
- Label (accent): `⏳ STREAK ENDS SUNDAY`
- Body: *"Play one game by tomorrow night to keep your **{n}-week streak**."*
- Primary action: `Play now` (scrolls to game list / picks first unplayed)
- Secondary action: `Later` (dismisses for the rest of this week)

**Explicitly out of scope:** Push notifications (deferred per CLAUDE.md). Countdown timers. Red coloration. Any tone that implies failure.

**Acceptance criteria:**
- [ ] Only renders on Sat/Sun (device local time)
- [ ] Suppressed if any game has been played this week
- [ ] Suppressed if `weeklyStreak < 2` (do not pressure week-1 players)
- [ ] Dismissal persists until the next ISO week boundary
- [ ] Disappears the instant the player plays any game

### 1f. Stats tab — streak card redesign

**Trigger:** Always-on.
**Surface:** Existing streak card in `app/(tabs)/explore.tsx`.

**Changes:**
- Top row keeps: `🔥 Weekly Streak`, `Weeks Played`, `🏆 Best Streak`
- Existing `🛡 N Shield Available` row is **removed**
- New section below divider:
  - Label: `SHIELDS`
  - Slot row: three slots, filled state matches `streakShieldsAvailable` (clamped to 3 visually)
  - Status line: `n of 3 · {n} slot{s} open` (or `Full — give one to a friend!` at 3)
- New card below the streak card: `LAST 6 WEEKS` with the week-chain visualization (done / shield / now / future bricks)

**Acceptance criteria:**
- [ ] Shield slot row renders for any value of `streakShieldsAvailable` 0–3+
- [ ] Week chain pulls from `stats.lastPlayedWeek` history (may require lightweight history tracking — see §1j)
- [ ] No data model change required for the slot row itself

### 1g. Friends tab — empty state redesign

**Trigger:** Always-on when `streakShieldsAvailable === 0`.
**Surface:** Existing "Streak Shields" card in `app/(tabs)/friends.tsx`.

**Changes when zero shields:**
- Three large empty shield slots, centered
- Italic title: *"Three empty slots, waiting."*
- Body: *"Shields are given to you by friends — when they answer a question you asked, or accept a challenge you sent."*
- Two equal-weight CTAs side-by-side: `Ask for help` / `Challenge a friend` (both deep-link into the game picker)
- Below: numbered three-step "How it works" — `1. You ask or challenge` / `2. They answer` / `3. You get a shield`

**When ≥ 1 shield:**
- Compact slot row (current style, but with the new monoline SVG)
- "How it works" collapses to a single tappable link: `How shields work →`

**Acceptance criteria:**
- [ ] Empty state shows two CTAs of equal weight (current copy only mentions one earn path)
- [ ] CTAs deep-link to the home tab with a hint to tap the game list
- [ ] Filled state preserves the current slot count display

### 1h. Tappable masthead chip

**Trigger:** Visible whenever `weeklyStreak > 0` OR `streakShieldsAvailable > 0` (unchanged from today).
**Surface:** `components/Masthead.tsx`.

**Changes:**
- Replace `🔥 N  🛡 N` string with: flame + count, vertical divider, **mini slot row** (3 small shield glyphs, filled or outlined per current count)
- Wrap in a `Pressable` — becomes a tap target
- On tap: open a small popover/tooltip with:
  - Status line: *"{N}-week streak, {M} shields banked."*
  - One-sentence mechanic recap: *"Each shield absorbs one missed week. Earn more by helping friends or sending challenges."*
  - CTA: `See stats` → routes to Stats tab

**Acceptance criteria:**
- [ ] Chip is now a tap target everywhere it appears (Home, Friends, Stats, Profile)
- [ ] Popover dismisses on outside-tap or back gesture
- [ ] `🔥` count uses the same flame emoji (not the SVG shield); only the shield glyph changes

### 1i. Iconography

Replace the emoji `🛡` with a custom **monoline shield SVG** everywhere it currently appears (masthead, toast, banners, modals, Friends card, Stats card). Single shared component:

```tsx
components/ui/ShieldIcon.tsx
```

Variants:
- `filled` — accent fill with white check (earned slot)
- `outline` — stroke only, paper-darker (empty slot)
- `gold` — gold fill (used in "shield saved" modal)

The engraved-monogram option (option C in the design doc) is explicitly deferred — possible future use in milestone celebrations only.

**Acceptance criteria:**
- [ ] No `🛡` emoji remains in any user-facing string
- [ ] Shield renders consistently across iOS, Android, web
- [ ] Component accepts a `size` and `variant` prop

### 1j. Data model

New object on `state.stats`:

```ts
onboarding: {
  streakIntroSeen: boolean;       // 1a
  shieldPrimerSeen: boolean;      // 1b
  firstShieldEarnedSeen: boolean; // 1c
  firstShieldSaveSeen: boolean;   // 1d
  atRiskWeekDismissed: string | null;  // 1e — ISO week key
};
```

- Persisted alongside existing stats via the same AsyncStorage + Firestore merge path
- On merge, **any `true` flag wins** (we never re-show an education the user has dismissed on another device)
- For `atRiskWeekDismissed`, the most recent ISO week key wins
- Migration: missing `onboarding` field is treated as all-false / null

Week-chain history (1d, 1f) requires a small addition:

```ts
recentPlayedWeeks: string[]  // last 6 ISO week keys, append on first play of each week
shieldSaveWeeks: string[]    // ISO week keys where a shield absorbed a miss
```

Both arrays are bounded (slice to last 6 / 12). No retroactive backfill — players who upgrade mid-streak see partial history until they accumulate more weeks.

**Acceptance criteria:**
- [ ] All five `onboarding` flags persist across app restarts
- [ ] All five sync to Firestore for signed-in users
- [ ] Existing AsyncStorage-only data without the `onboarding` field upgrades cleanly (defaults to all-false)
- [ ] Reducer unit tests cover each new flag (RED first per TDD)

### 1k. Anonymous flow rules

Binding rules for which surfaces fire for guest users:

| Surface | Anon? | Notes |
|---|---|---|
| 1a Streak ignition | ✅ Yes | Identical |
| 1b Shield primer | ✅ Yes | Identical — no auth gate |
| 1c First shield earned | ✅ Yes | Primary CTA becomes `Sign up to keep it`; suppresses `ShieldSignUpBanner` for the same session to avoid double-ask |
| 1d Shield saved | ✅ Yes | Identical |
| 1e At-risk banner | ✅ Yes | Identical |
| 1f Stats card | ❌ — | Anon users still see the `AuthGateTab` for the Stats tab (unchanged) |
| 1g Friends empty state | ❌ — | Anon users still see the `AuthGateTab` for the Friends tab (unchanged) |
| 1h Masthead chip | ✅ Yes | Identical |

The current `ShieldSignUpBanner` remains in place for *non-first* shield earns (so anon users still get periodic upsell nudges), but its educational copy is now redundant with 1c — trim to a single sentence + CTA.

---

## 2. Landing Screen Privacy

(Carried unchanged from previous v0.3.0 scope.)

**`app/games/help/[token].tsx`** — change the card label copy:
- Before: `They're stuck on question #{payload.questionIndex + 1}.`
- After: `They're stuck and need your help.`

**`app/games/challenge/[token].tsx`** — change the card label copy:
- Before: `They challenged you to answer question #{payload.questionIndex + 1}.`
- After: `They challenged you to answer a question.`

No API changes. No data model changes. UI copy only.

**Acceptance criteria:**
- [ ] Help landing screen does not show "question #" anywhere in the visible UI
- [ ] Challenge landing screen does not show "question #" anywhere in the visible UI
- [ ] Tapping Play on either screen still launches the game to the correct question

---

## 3. Cross-cutting

- [ ] `npm test` — all passing (438+ existing tests + new tests per §1j and per-surface)
- [ ] `npx tsc --noEmit` — clean
- [ ] **Code review** (code-reviewer agent) — full diff
- [ ] **Security review** (security-reviewer agent) — focus on the new Firestore fields
- [ ] **Block 0 smoke test** (current release PRR) after any UI change
- [ ] Update `RELEASES.md` row for `alpha-v0.3.0` once shipped — "What shipped" should list the seven surfaces + iconography refresh + landing privacy fix; "What's intentionally missing" should list App Store submission

---

## Open questions

These were resolved during the design phase. Recorded here so the rationale doesn't get lost.

| Q | Decision |
|---|---|
| Hard cap on shields? | **3.** Reducer currently allows up to 12; clamp to 3 in `earnStreakShield` going forward. Slot UI assumes 3. |
| At-risk nudge for week-1 players? | **No.** Only fires when `weeklyStreak ≥ 2`. |
| Anon "first shield" CTA? | **Same modal**, primary CTA becomes `Sign up to keep it`. Suppresses the legacy sign-up banner that session. |
| "Tell me more" on streak ignition? | **Opens a 2nd card** (shield teaser), matching the progress-dot pattern. |
| Milestone weeks? | **Out of scope this release.** Future: 4 / 12 / 26 / 52 weeks get a subtle border treatment on the existing celebration modal. |
| Shield primer blocks the share flow? | **No.** Primary CTA proceeds to share sheet; the primer is education *during* the action, not a wall before it. |
| Per-user tracking schema? | **Single `onboarding` map** on `stats` (see §1j). |
| Push notifications for at-risk? | **No.** Permanently deferred per CLAUDE.md. In-app banner only. |

---

## Out of scope (deferred to alpha-v0.4.0)

- **App Store submission** — privacy policy URL, App Store Connect listing fields, screenshots, age rating, `app.json` version bump. Full spec preserved in alpha-v0.4.0 PRD.
- **Streak milestones** (4 / 12 / 26 / 52 week celebrations)
- **Engraved-monogram shield variant** for milestone moments
- **Push notification** for at-risk streak
- **Shield primer as a re-promptable surface** — currently fires once, ever; could become "fire again if user has 0 shields for 3+ weeks"
- **Cross-device dismissal sync timing** — flags merge correctly, but a user dismissing on phone A may briefly see the modal on phone B if both are open simultaneously. Acceptable for v0.3.0.
- Garbage-collect orphaned `received_help` interactions
- Animated entry/exit on Help Result Card and Challenge Reply Card
- Shield-fill animation
- Architecture docs
- Upsell CTA in `BankExhaustedModal` ("Unlock the full question bank")
