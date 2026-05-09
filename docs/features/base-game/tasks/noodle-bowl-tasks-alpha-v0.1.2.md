# Noodle Bowl — Task List alpha-v0.1.2

**PRD ref:** `noodle-bowl-prd-alpha-v0.1.2.md`
**Last updated:** 2026-05-09

---

## Deep link routing (PRD §1)

- [x] Create `app/c/[token].tsx` — redirect to `/games/challenge/:token`
- [x] Create `app/h/[token].tsx` — redirect to `/games/help/:token`
- [x] Register `c` and `h` screens in `_layout.tsx` with `headerShown: false`

---

## Universal link infrastructure (PRD §2) — MANUAL / INFRA

- [ ] Create AASA file (content in PRD §2a)
- [ ] Deploy AASA to `https://noodlebowl.app/.well-known/apple-app-site-association`
  - No redirect, `application/json`, served over HTTPS
- [ ] Verify Apple CDN: `https://app-site-association.cdn-apple.com/a/v1/noodlebowl.app`

---

## Cross-cutting quality (PRD §3)

- [ ] Run code-reviewer agent over changes since alpha-v0.1.1
- [ ] Run security-reviewer agent
- [ ] Update `README.md` — add `seed:emulator`, `seed:prod`, `start:dev`, `start:qa` to quick-start

---

## Release

- [ ] Run `npm test` — all passing
- [ ] Run `npx tsc --noEmit` — clean
- [ ] Run deep link smoke test — Block 11 in PRR
- [ ] Cut `eas build --platform ios --profile production`
- [ ] Submit to TestFlight — `eas submit --platform ios --profile production --latest`
- [ ] Tag: `git tag -a alpha-v0.1.2 -m "fix: deep link routing for /c/ and /h/ universal links"`
- [ ] Push tag: `git push origin --tags`
- [ ] Add row to `docs/RELEASES.md`

---

## Deferred (not in this release)

- [ ] [P2] Garbage-collect orphaned `received_help` interactions after N days
- [ ] [P2] Animated entry/exit on Help Result Card and Challenge Reply Card
- [ ] [P2] Persist `homeCardDismissed` to Firestore across devices
- [ ] [P2] Shield-fill animation
- [ ] [P2] Architecture docs — auth + content + stats flow diagrams
