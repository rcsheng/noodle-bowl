# Noodle Bowl v6 — Open Task List

**PRD ref:** `noodle-bowl-prd-v6.md`
**Last updated:** May 2026

Legend: `[P1]` = needed for next milestone · `[P2]` = nice to have · `[def]` = permanently deferred

Everything in v5 Phases 1, 2, 4, 6, 7, 8 and the full 2026 Q2 redesign (§12) is shipped. This list is the remaining backlog only.

---

## Deferred — re-open only if re-prioritized

- [ ] [def] **Phase 3 — Maestro E2E framework.** Requires macOS CI runner + native dev build. Manual two-device smoke covers this per PRD §4.1.
- [ ] [def] **Phase 5 — Cross-device E2E flows.** Same blocker as Phase 3.
- [ ] [def] **AC6.3 — Auto-open Help Sent modal on share-sheet dismiss.** Needs platform-specific Share return handling; deferred per PRD §6.3.

---

## Help flow follow-ups (PRD §6)

- [ ] [P2] Garbage-collect orphaned local `received_help` interactions after N days when Firestore validation fails (AC6.10 hides the card; interaction object stays in state indefinitely).
- [ ] [P2] Animated entry/exit on Help Result Card and Challenge Reply Card.
- [ ] [P2] Persist `homeCardDismissed` to Firestore so dismissals survive across devices for signed-in users.

---

## Streak shields follow-ups (PRD §7)

- [ ] [P1] **"Streak saved!" banner.** Show a brief celebration banner on the home screen the first time a shield is consumed. Requires fixing the `streakShieldUsedToday` flag — it currently is not reset on normal continuation, which causes the banner to show incorrectly on subsequent plays. Fix the reducer first, then add the banner.
- [ ] [P2] Shield-fill animation when a shield is earned.
- [ ] [P2] Retroactive shield credit for anon→sign-in to a different existing account (currently out of scope per §7.4).

---

## Infrastructure follow-ups (PRD §7.5)

- [ ] [P1] **`firebase-functions` v6 → v7.** Major version — own session. Introduces breaking API changes; track release notes before starting.
- [ ] [P2] Remove the debug "Clear local data" button from the Profile tab before first TestFlight cut, OR confirm the `__DEV__` gate is sufficient to leave it in. Currently it is stripped from release builds by Metro's dead-code elimination.

---

## TJ feedback — reveal UX (PRD §15)

- [x] [P1] **§15.1 Reveal layout reorder — Lede.** Move result/reveal box above the choice list in the reveal phase.
- [x] [P1] **§15.1 Reveal layout reorder — Spread.** Move resultCard above choiceList in the reveal phase.
- [x] [P1] **§15.1 Reveal layout reorder — SoF.** Move resultCard above claimList in the reveal phase.
- [x] [P1] **§15.1 Audit Wave + Quip** for the same issue; apply if present.
- [x] [P1] **§15.2 "Back to Home" text link — all game screens.** Visible at top and bottom in all phases (play and reveal); mono 14pt, muted, caps.
- [x] [P1] **§15.4 Reveal visual polish** — ✓/✗ indicators, green/accent row backgrounds, compact result cards ("Correct"/"Incorrect" verdict, 22pt/18pt font sizes), Lede explanation-only reveal.
- [x] [P1] **§15.5 Seed data: remove panelist prefixes** — `constants/data.ts` updated; 5 LEDE_BANK items cleaned.
- [ ] [P1] **§15.5 Reseed QA/Prod** — run `SEED_TARGET=prod node scripts/seed-content.js` against production Firebase after emulator reseeding confirmed.
- [ ] [P1] **§15.3 Spread distractor decimal precision.** When truth has decimal places, round distractors to the same precision. Fix `lib/spreadChoices.ts`; integer truths unaffected.

---

## Cross-cutting

- [ ] [P1] Run **code-reviewer** agent over the 2026 Q2 redesign diff before next alpha build.
- [ ] [P1] Run **security-reviewer** agent before next prod deploy (covers Firestore rules, auth flows, content writes).
- [ ] [P1] Update `README.md` — add `seed:emulator`, `seed:prod`, `start:dev`, `start:qa` scripts to the quick-start section.
- [ ] [P2] Add `firestore.indexes.json` entries if any new compound queries are introduced.
- [ ] [P2] Update architecture docs with auth + content + stats flow diagrams.
