# Noodle Bowl — Task List alpha-v0.3.0

**PRD ref:** `noodle-bowl-prd-alpha-v0.3.0.md`
**Last updated:** 2026-05-24

---

## Landing screen privacy fix (PRD §1)

### Challenge landing screen (`app/games/challenge/[token].tsx`)

Test file: `app/games/challenge/__tests__/ChallengeToken.test.tsx` — already exists.

- [ ] `ChallengeToken.test.tsx` — RED: add assertion that "question #" does not appear in the rendered landing card copy
- [ ] `app/games/challenge/[token].tsx` — change label from `They challenged you to answer question #{payload.questionIndex + 1}.` → `They challenged you to answer a question.`
- [ ] Run tests → GREEN

### Help landing screen (`app/games/help/[token].tsx`)

No test file exists yet — create one.

- [ ] `app/games/help/__tests__/HelpToken.test.tsx` — RED: render the help landing screen; assert card label does not contain "question #"; assert "They're stuck and need your help." is visible
- [ ] `app/games/help/[token].tsx` — change label from `They're stuck on question #{payload.questionIndex + 1}.` → `They're stuck and need your help.`
- [ ] Run tests → GREEN

### Final check

- [ ] `npm test` — all passing; `npx tsc --noEmit` clean

---

## App Store prep (PRD §2) — MANUAL

- [ ] Write and publish privacy policy to `https://noodlebowl.app/privacy`
- [ ] Fill in App Store Connect listing (name, subtitle, description, keywords, URLs, category, age rating)
- [ ] Capture and upload screenshots — iPhone 6.9" minimum
- [ ] Verify `app.json` version is `0.3.0`

---

## Cross-cutting quality (PRD §3)

- [ ] Run code-reviewer agent — changes in this release
- [ ] Run security-reviewer agent
- [ ] `npm test` — all passing
- [ ] `npx tsc --noEmit` — clean

---

## Release

- [ ] Cut EAS build: `eas build --platform ios --profile production`
- [ ] Submit to App Store: `eas submit --platform ios --profile production --latest` (choose App Store, not TestFlight)
- [ ] Tag: `git tag -a alpha-v0.3.0 -m "feat: App Store public release"`
- [ ] Push tag: `git push origin --tags`
- [ ] Add row to `docs/RELEASES.md`

---

## Deferred (not in this release)

- [ ] [P2] Garbage-collect orphaned `received_help` interactions after N days
- [ ] [P2] Animated entry/exit on Help Result Card and Challenge Reply Card
- [ ] [P2] Persist `homeCardDismissed` to Firestore across devices
- [ ] [P2] Shield-fill animation
- [ ] [P2] Architecture docs — auth + content + stats flow diagrams
- [ ] [P3] Push notifications (permanently deferred)
