# CLAUDE.md

Behavioral guidelines for the noodle-bowl project. Based on https://github.com/forrestchang/andrej-karpathy-skills/blob/main/CLAUDE.md.

## 0. Context Hygiene

**At the end of every phase or major task, say** (with the actual phase name/number filled in):
> "[Task] complete. Recommend starting a fresh conversation (`/clear`) before the next phase to avoid context bloat. Run `/compact` if you want to continue here."

Do this unprompted — don't wait for the user to ask. Never say "Phase X" or "Phase Y" literally — always substitute the real name.

## 1. Think Before Coding

**Don't assume. Surface tradeoffs.**

Before implementing:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must.**

- Don't improve adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove only imports/variables made unused by YOUR changes.

Every changed line should trace directly to the request.

## 4. Goal-Driven Execution (TDD)

**Write the failing test first. Loop until green.**

- "Fix the bug" → write a test that reproduces it, then make it pass.
- "Add feature X" → write RED tests, then GREEN implementation, then refactor.
- For multi-step tasks, state a plan with verifiable steps before coding.

## 5. Model Selection

**Pick the cheapest model that can do the job.**

| Task | Model |
|------|-------|
| Single-file fix, rename, boilerplate from a clear pattern | `haiku` |
| Multi-file features, refactors, anything in this project | `sonnet` (default) |
| Architecture, ambiguous requirements, deep tradeoffs | `opus` |

Run `/model-route <task>` when unsure. Use `model: "haiku"` when spawning subagents for lightweight work (code review of a small diff, adding a missing mock, etc.).

## 6. Subagents

Spawn subagents to isolate context, parallelize independent work, or offload bulk mechanical tasks. Don't spawn when the parent needs the reasoning, when synthesis requires holding things together, or when spawn overhead dominates.

Pick the cheapest model that can do the subtask well:
- Haiku: bulk mechanical work, no judgment
- Sonnet: scoped research, code exploration, in-scope synthesis
- Opus: subtasks needing real planning or tradeoffs

If a subagent realizes it needs a higher tier than itself, return to the parent.

Parent owns final output and cross-spawn synthesis. User instructions override.

## 7. Preferred Tools

### Data Fetching

1. **WebFetch**: free, text-only, works on public pages that don't block bots.
2. **agent-browser CLI**: free, local Rust CLI + Chrome via CDP. For dynamic pages or auth walls that WebFetch can't handle. Returns the accessibility tree with element refs (@e1, @e2). ~82% fewer tokens than screenshot-based tools. Install: `npm i -g agent-browser && agent-browser install`. Use `snapshot` for AI-friendly DOM state, element refs for interaction.
3. **Notice recurring fetch patterns and propose wrapping them as dedicated tools.** When the same fetch/parse logic comes up more than once, suggest wrapping it as a named tool (e.g. a skill file or a .py script that calls `agent-browser` with the snapshot and extraction steps baked in for that source). Add the entry to `## Dedicated Tools` below and reference it by name on future calls.

## Dedicated Tools

_(none yet — add entries here as recurring fetch/parse patterns are identified)_

## Project Overview

React Native Expo app — daily brain-game with 5 games (Lede, Spread, SoF, Wave, Quip). Firebase backend with anonymous auth + email upgrade.

**Stack:** Expo Router v3, Firebase Auth + Firestore + Functions, AsyncStorage, zod, Jest.

**Key paths:**
- `app/(tabs)/` — tab screens (home, explore, friends, profile)
- `app/games/` — game screens (lede, spread, sof, wave, quip)
- `app/games/challenge/[token].tsx` — challenge landing screen
- `app/games/help/[token].tsx` — help landing screen
- `app/c/[token].tsx` — universal link redirect → `/games/challenge/:token`
- `app/h/[token].tsx` — universal link redirect → `/games/help/:token`
- `app/auth/` — auth screens (sign-up, sign-in, forgot-password)
- `context/` — AuthContext, ContentContext, GameContext + gameReducer
- `lib/` — authApi, challengeApi, helpApi, contentRepo, spreadChoices, pushTokens, firebase, logger
- `constants/data.ts` — bundled game content (fallback only; live content comes from Firestore `contentVersions`)
- `constants/utils.ts` — pickFromBank, shuffleIndices, calculatePoints
- `packages/shared/` — shared types (GameId, challenge/help I/O, ContentBanks, ContentVersion)
- `functions/src/` — Cloud Functions (challengeCreate/Get/Respond, helpCreate/Get/Respond)
- `components/masthead/` — CompactMasthead (used on all game screens)

**Help hint params:** `hintQuestionIndex` + `friendHint` — passed when the asker taps "Try this question →" on the home card. Distinct from the helper flow (`helpToken`/`helpQuestionIndex`): no API submission, just loads the specific question and highlights the friend's answer. Handled in `lede.tsx` and `sof.tsx`; `isFriendHintMatch` in `lib/friendHint.ts` maps hint strings to option indices.

**Auth pattern:** anonymous by default → `linkWithCredential` upgrades to email/password preserving UID.

**Content pattern:** `ContentProvider` → stale-while-revalidate (AsyncStorage cache + Firestore background refresh). Fallback to bundled `constants/data.ts` if both fail. If the cached version is from a previous day, `isLoading` stays `true` until Firestore delivers today's content — so game screens always see fresh questions on the first open of the day.

## Docs Structure

```
docs/
├── features/              # active feature work
│   ├── base-game/
│   │   ├── prd/           # noodle-bowl-prd-alpha-v0.1.2.md
│   │   ├── tasks/         # noodle-bowl-tasks-alpha-v0.1.2.md
│   │   ├── design/        # (empty — active designs go here)
│   │   └── research/
│   └── content-pipeline/
├── releases/              # active release PRRs only (one folder per in-flight or upcoming release)
│   └── alpha-v0.1.2/      # prr-alpha-v0.1.2.md
├── archive/               # all historical docs — mirrors active structure
│   ├── features/base-game/
│   │   ├── prd/           # v1–v6 PRDs
│   │   ├── tasks/         # tasks-v5, tasks-v6
│   │   └── design/        # 2026.5.2_redesign specs
│   ├── releases/          # completed release PRRs
│   │   ├── alpha-v0.1.0/  # prr-alpha-v0.1.0.md
│   │   └── alpha-v0.1.1/  # prr-alpha-v0.1.1.md
│   └── smoke-test/        # smoke-test-plan.md (superseded; steps now in PRRs)
├── templates/             # prr-template.md
├── README.md
└── RELEASES.md            # changelog + versioning convention
```

**Release versioning:** patch bump (0.1.x) for polish/fixes; minor bump (0.x.0) for new games/features.
- `alpha-v0.1.0` — first alpha
- `alpha-v0.1.1` — Q2 UI redesign (shipped)

## Testing

- **Framework:** Jest + jest-expo + @testing-library/react-native
- **Run:** `npm test` / `npm run test:coverage`
- **Coverage targets:** `constants/utils.ts` and `context/gameReducer.ts` ≥ 80%
- **TDD is mandatory** for new features and bug fixes — write RED test first.
- **438 tests** currently passing across 37 suites.
- Mocks live in `jest.setup.ts` (async-storage, reanimated, expo-clipboard, expo-haptics, expo-router, expo-notifications).

## Firestore Rules Pattern

- `challenges/{token}` — authenticated read; create only by sender (senderId == uid); no client updates.
- `qa_challenges/{token}` — identical rules; used when `EXPO_PUBLIC_COLLECTION_PREFIX=qa_`.
- `helpRequests/{token}` — same pattern with askerId.
- `qa_helpRequests/{token}` — identical rules; used in QA mode.
- `pushTokens/{uid}` — read/write only by matching uid. Never prefixed.
- `contentVersions/{versionId}` — authenticated read; no client writes (admin/functions only). Never prefixed.

## QA Collection Isolation

`start:qa` sets `EXPO_PUBLIC_COLLECTION_PREFIX=qa_`. This causes:
- Client code (`lib/collections.ts`) to read from `qa_challenges` / `qa_helpRequests`
- Every callable function call to include `collectionPrefix: 'qa_'` in the payload
- `challengeGet` and `helpGet` HTTP functions to receive `&env=qa_` and route to the QA collections

Production builds have no `EXPO_PUBLIC_COLLECTION_PREFIX`, so they always use `challenges` / `helpRequests`.

**QA data does not appear for real users.** After smoke testing, you can delete `qa_challenges` and `qa_helpRequests` documents in the Firebase console without touching prod data.

**Deep link testing caveat:** Challenge and help URLs (`noodlebowl.app/c/TOKEN`, `/h/TOKEN`) do not embed the collection prefix. A link generated by `start:qa` writes to `qa_challenges` but a TestFlight build (no prefix) will look in `challenges` and fail. To test deep links end-to-end across devices, either: (a) generate links from `npx expo start --clear` (no prefix, hits prod collections) or (b) use a dev build on both devices with the same `start:qa` config.

## Environments

Always ask if unsure which environment the user is targeting. Default assumptions:

| Context | Script | Firebase | Collections |
|---|---|---|---|
| Feature dev / writing code | `npm run start:dev` | Emulator | `challenges`, `helpRequests` |
| Smoke testing / alpha QA | `npm run start:qa` | Production | `qa_challenges`, `qa_helpRequests` |
| TestFlight / App Store build | EAS production build | Production | `challenges`, `helpRequests` |

**Rule:** if the user says "smoke testing", "alpha", "QA", or "testing on device" → assume `start:qa` (prod Firebase, QA collections). If they say "local dev", "working on a feature", or "emulator" → assume `start:dev`. When ambiguous, ask before suggesting commands or diagnosing issues.

## Commands

```bash
npm run start:dev         # local dev — points at Firebase emulator
npm run start:qa          # smoke testing — points at production Firebase
npm test                  # run all tests
npm run test:coverage     # with coverage report
npm run seed:emulator     # seed ContentVersion to local Firestore emulator
npm run seed:prod         # seed to production (requires GOOGLE_APPLICATION_CREDENTIALS)
```

## Manual Testing

Smoke test steps are embedded in each release's PRR (`docs/releases/{version}/prr-{version}.md`).

- **After any UI change:** run Block 0 from the current release PRR.
- **Before any release build:** run all blocks from that release's PRR against `npm run start:qa`.
- **Regression step tables** are in `docs/releases/alpha-v0.1.1/prr-alpha-v0.1.1.md` §2 — copy forward as needed.

### Test target declaration

**At the start of any testing session, tell Claude which version you're targeting** (e.g. "testing alpha-v0.1.1"). Claude will:
1. Read that version's PRR `## Feature flags` section
2. Check your `.env.local` against the "Smoke test value" column
3. Call out any mismatches before proceeding

Current test target is tracked in memory (`current_test_version.md`). When it changes, say so — Claude will update memory and re-check `.env.local`.

Quick local smoke setup (dev emulator):
```bash
npm run emulator        # Terminal 1 — wait for "All emulators ready"
npm run seed:emulator   # Terminal 2 — seed content
npx expo start --clear  # Terminal 2 — then scan QR or press i/a
```

For QA against production Firebase (recommended before release):
```bash
npm run start:qa        # single terminal — prod Firebase, qa_ collections
```
