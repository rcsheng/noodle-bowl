# Noodle Bowl — PRD alpha-v0.3.0

**Status:** In progress
**Last updated:** 2026-05-24
**What's new:** First public App Store release — landing screen privacy fix, App Store prep

---

## Overview

alpha-v0.3.0 is the first public App Store release. It is a small, focused release:

| Track | Goal |
|---|---|
| **Landing screen privacy** | Remove question number from help and challenge landing screens |
| **App Store prep** | Privacy policy, App Store Connect listing, screenshots (carried from v0.2.0) |

No new games in this release.

---

## 1. Landing Screen Privacy — Remove Question Number

### Background

When a friend opens a help or challenge landing screen (`/games/help/:token` or `/games/challenge/:token`), the current copy reveals the specific question number the asker is on:

- Help: "They're stuck on question #4."
- Challenge: "They challenged you to answer question #4."

The question number is unnecessary information for the friend — they just need to know that someone needs help or has issued a challenge. Showing the number feels odd and leaks internal game state to the recipient.

### What changes

**`app/games/help/[token].tsx`** — change the card label copy:

- Before: `They're stuck on question #{payload.questionIndex + 1}.`
- After: `They're stuck and need your help.`

**`app/games/challenge/[token].tsx`** — change the card label copy:

- Before: `They challenged you to answer question #{payload.questionIndex + 1}.`
- After: `They challenged you to answer a question.`

No API changes. No data model changes. UI copy only.

### Acceptance criteria

- [ ] Help landing screen does not show "question #" anywhere in the visible UI
- [ ] Challenge landing screen does not show "question #" anywhere in the visible UI
- [ ] Tapping Play on either screen still launches the game to the correct question
- [ ] `npm test` all passing; `npx tsc --noEmit` clean

---

## 2. App Store Preparation

### Background

Carried forward from alpha-v0.2.0. Apple requires a live privacy policy URL, a complete App Store Connect listing, and screenshots before Review approval.

### 2a. Privacy policy

A public privacy policy URL is required by Apple before App Store Review will approve the app.

Minimum content:
- What data is collected (anonymous auth UID, email if upgraded, gameplay stats in Firestore)
- How data is used (personalized stats, no third-party sale)
- Contact info for privacy requests

Host at a stable public URL (e.g. `https://noodlebowl.app/privacy`).

### 2b. App Store Connect listing

In App Store Connect → My Apps → Noodle Bowl → App Store tab:

| Field | Notes |
|---|---|
| Name | Noodle Bowl |
| Subtitle | ≤ 30 chars — e.g. "Daily news brain games" |
| Description | ≤ 4000 chars |
| Keywords | ≤ 100 chars total, comma-separated |
| Support URL | `https://noodlebowl.app` |
| Privacy Policy URL | from §2a above |
| Category | Primary: Games → Trivia; Secondary: News |
| Age rating | questionnaire — expected result: 4+ |
| Screenshots | at least iPhone 6.9" (required) + iPad 13" if iPad-eligible |

### 2c. Screenshots

Required: at least one iPhone 6.9" (iPhone 16 Pro Max) screenshot per supported locale.

Capture on Simulator (iPhone 16 Pro Max) or real device. Suggested screens: home, Lede game, Spread game, result/reveal, profile/stats.

### 2d. `app.json` version bump

Confirm `version` in `app.json` is `0.3.0` and `ios.buildNumber` policy in `eas.json` is correct.

### Acceptance criteria

- [ ] Privacy policy is live at a public URL
- [ ] All required App Store Connect fields are filled in
- [ ] Screenshots uploaded for at least iPhone 6.9"
- [ ] App Store Connect status moves to "Ready for Review" before submission
- [ ] `app.json` version is `0.3.0`

---

## 3. Cross-cutting

- [ ] **Code review** — changes in this release (code-reviewer agent)
- [ ] **Security review** — security-reviewer agent
- [ ] `npm test` — all passing
- [ ] `npx tsc --noEmit` — clean

---

## Out of scope (carried forward)

- Garbage-collect orphaned `received_help` interactions
- Animated entry/exit on Help Result Card and Challenge Reply Card
- Persist `homeCardDismissed` to Firestore across devices
- Shield-fill animation
- Architecture docs
- Push notifications (permanently deferred)
- Upsell CTA in `BankExhaustedModal` ("Unlock the full question bank")
