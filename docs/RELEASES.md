# Releases

Track every build that goes anywhere outside this laptop. One row per release.

## How to cut a release (newbie-friendly)

When you ship something — emulator-tested code merged to main, a TestFlight build,
a prod Firebase deploy — give it a name (a "git tag") so future-you knows what
shipped when, and what was different.

```bash
# 1. Make sure you're on main with no uncommitted changes:
git status

# 2. Tag the current commit. Replace N with the next number from the table below:
git tag -a v0.1.0-alpha.N -m "what shipped (one line)"

# 3. Push the tag to GitHub:
git push origin --tags

# 4. Add a row to the table below.
```

### Versioning convention

Format: `vMAJOR.MINOR.PATCH-CHANNEL.N`

- `0.1.0` — pre-1.0 alpha series. Bump the third number (`0.1.1`) when you start a
  qualitatively different alpha (new game, major redesign).
- `-alpha.N` — Tier-0 alpha (5–10 trusted testers). `N` increments per build.
- `-beta.N` — Tier-1+ broader alpha. (Switch when you start inviting beyond the trust circle.)
- No suffix (`v1.0.0`) — public launch.

So your first alpha is `v0.1.0-alpha.1`, then `v0.1.0-alpha.2`, etc.

### What counts as a "release"?

Tag every time you do one of these:

- Run `eas build` for distribution (TestFlight / Play internal track)
- Run `firebase deploy --only functions` against prod
- Run `firebase deploy --only firestore:rules` against prod
- Run `npm run seed:prod` (only when content version actually changes)

You don't tag every commit — only the ones you actually distribute or deploy.

The Claude Code hook in `.claude/hooks/release-reminder.sh` will print a reminder
the moment you run any of those commands, so you don't have to remember.

---

## Releases

| Tag | Date | What shipped | What's intentionally missing | PRD section |
| --- | --- | --- | --- | --- |
| `alpha-v0.1.1` | 2026-05-09 | Q2 UI redesign — compact home index, Lede headline-first, Spread multiple-choice, SoF segmented toggle + pick-the-fake. Reveal polish (✓/✗, compact result cards). Content pipeline (internal). | Slurp game (feature-flagged, alpha-v0.2.0). Push notifications (permanently deferred). | PRD v6 §12, §15 |
| `alpha-v0.2.0` | 2026-05-10 | Content pipeline (ingest → select → generate → publish), local SQLite history, contentPacks Firestore, recover tool, Windows Task Scheduler daily automation, source+date attribution across Lede/Spread/SoF. | App Store listing and submission (alpha-v0.3.0). | — |

<!--
Template for the next row:
| v0.1.0-alpha.1 | 2026-04-29 | First alpha to 5–10 trusted testers. 5 games, anon→email auth, Firestore stats, challenge/help links, streak shields. | Push notifications (deprioritized). Cross-device E2E (manual smoke only). | PRD v5 §1, §2, §4, §6, §7 |
-->
