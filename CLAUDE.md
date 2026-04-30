# CLAUDE.md

Behavioral guidelines for the noodle-bowl project. Based on https://github.com/forrestchang/andrej-karpathy-skills/blob/main/CLAUDE.md.

## 0. Context Hygiene

**At the end of every phase or major task, say:**
> "Phase X complete. Recommend starting a fresh conversation (`/clear`) before Phase Y to avoid context bloat. Run `/compact` if you want to continue here."

Do this unprompted — don't wait for the user to ask.

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
- `app/auth/` — auth screens (sign-up, sign-in, forgot-password)
- `context/` — AuthContext, ContentContext, GameContext + gameReducer
- `lib/` — authApi, challengeApi, helpApi, contentRepo, pushTokens, firebase, logger
- `constants/data.ts` — bundled game content (fallback only; live content comes from Firestore `contentVersions`)
- `constants/utils.ts` — pickFromBank, shuffleIndices, calculatePoints, scoreSpread
- `packages/shared/` — shared types (GameId, challenge/help I/O, ContentBanks, ContentVersion)
- `functions/src/` — Cloud Functions (challengeCreate/Get/Respond, helpCreate/Get/Respond)

**Auth pattern:** anonymous by default → `linkWithCredential` upgrades to email/password preserving UID.

**Content pattern:** `ContentProvider` → stale-while-revalidate (AsyncStorage cache + Firestore background refresh). Fallback to bundled `constants/data.ts` if both fail.

## Testing

- **Framework:** Jest + jest-expo + @testing-library/react-native
- **Run:** `npm test` / `npm run test:coverage`
- **Coverage targets:** `constants/utils.ts` and `context/gameReducer.ts` ≥ 80%
- **TDD is mandatory** for new features and bug fixes — write RED test first.
- **136 tests** currently passing across 8 suites.
- Mocks live in `jest.setup.ts` (async-storage, reanimated, expo-clipboard, expo-haptics, expo-router, expo-notifications).

## Firestore Rules Pattern

- `challenges/{token}` — authenticated read; create only by sender (senderId == uid); no client updates.
- `helpRequests/{token}` — same pattern with askerId.
- `pushTokens/{uid}` — read/write only by matching uid.
- `contentVersions/{versionId}` — authenticated read; no client writes (admin/functions only).

## Commands

```bash
npm test                  # run all tests
npm run test:coverage     # with coverage report
npm run seed:emulator     # seed ContentVersion to local Firestore emulator
npm run seed:prod         # seed to production (requires GOOGLE_APPLICATION_CREDENTIALS)
```

## Manual Testing Checklist (run after each phase)

At the end of every phase, prompt the user to run through this checklist before moving on.

### 1. Prerequisites (one-time setup)

- [ ] `.env.local` exists with real Firebase project values (copied from `.env.local.example`)
- [ ] `EXPO_PUBLIC_EMULATOR_HOST` set to your LAN IP if testing on a **physical device** (leave unset for simulators)
- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] Functions compiled: `cd functions && npm run build` (only needed if `functions/lib/` is empty)
- [ ] Expo Go installed on device/simulator

### 2. Start the emulator (Terminal A)

```bash
firebase emulators:start
```

Emulator UI opens at http://localhost:4000 — use it to inspect Auth users, Firestore docs, and Function logs.

> If port 8080 is in use from a previous session: find and kill the Java process (`netstat -ano | findstr 8080` on Windows, then `taskkill /PID <pid> /F`).

### 3. Seed game content (Terminal B — Phase 2+)

```bash
npm run seed:emulator
```

Verify a `contentVersions` doc appears in the Emulator UI at http://localhost:4000/firestore.

### 4. Start Expo dev server (Terminal B or C)

```bash
npx expo start --clear
```

Scan the QR code with Expo Go (physical device) or press `i`/`a` for iOS Simulator / Android Emulator.

### 5. Phase-specific smoke tests

**Phase 1 — Auth**
- [ ] App launches → plays as guest (no sign-in prompt)
- [ ] Profile tab shows "Playing as Guest" with Create Account / Sign In buttons
- [ ] Create Account → fill form → success → Profile shows display name + email
- [ ] Sign Out → back to "Playing as Guest"
- [ ] Sign In → correct credentials → Profile shows user again
- [ ] Sign In → wrong password → friendly error message shown
- [ ] Forgot Password → enter email → success message shown
- [ ] Emulator UI → Authentication tab shows the created user

**Phase 2 — Firestore content**
- [ ] After seeding, open any game — questions load (not blank/crash)
- [ ] Emulator UI → Firestore → `contentVersions` collection has one doc with `active: true`
- [ ] Kill the emulator, reload the app → game still loads (from AsyncStorage cache)
- [ ] Restart emulator, reload app → game loads fresh content from Firestore again

**Phase 3 — E2E (when complete)**
- [ ] Run Maestro flows: `maestro test e2e/`

**Phase 4 — Stats (when complete)**
- [ ] Play a game as guest → stats visible on home screen, Firestore has no entry
- [ ] Play a game as signed-in user → Firestore `users/{uid}/stats` doc updated

**Phase 5 — Cross-device challenge (when complete)**
- [ ] Send a challenge link from Device A
- [ ] Open link on Device B → navigates to correct game + question
- [ ] Device B submits answer → Device A receives push notification

## V5 Remaining Phases

- **Phase 3** — E2E framework (Maestro): auth flows, challenge link flow
- **Phase 4** — Stats persistence to Firestore (uid-scoped; guest warning shown)
- **Phase 5** — Cross-device E2E challenge flow
