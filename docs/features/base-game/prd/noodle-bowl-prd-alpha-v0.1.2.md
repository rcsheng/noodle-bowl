# Noodle Bowl — PRD alpha-v0.1.2

**Status:** In progress
**Last updated:** 2026-05-09
**What's new:** Deep link routing fix, AASA setup, cross-cutting quality pass

---

## Overview

alpha-v0.1.2 is a patch release on top of the shipped alpha-v0.1.1 Q2 redesign. It fixes a routing gap that prevented universal links from reaching the correct game screen, establishes the infrastructure needed for iOS universal links to work end-to-end, and clears the cross-cutting P1 items that have been pending since the redesign shipped.

No new games. No new user-facing features.

---

## 1. Deep Link Routing Fix

### Background

Challenge and help links have the form:

| Flow | URL |
|---|---|
| Challenge | `https://noodlebowl.app/c/{token}` |
| Help | `https://noodlebowl.app/h/{token}` |

The app's Expo Router file tree previously had no routes at `/c/` or `/h/`. When iOS opened a universal link, Expo Router received the path `/c/{token}` and had no handler — the app fell through to the home screen silently.

### Fix

Two redirect-only screens added:

| File | Route | Redirects to |
|---|---|---|
| `app/c/[token].tsx` | `/c/:token` | `/games/challenge/:token` |
| `app/h/[token].tsx` | `/h/:token` | `/games/help/:token` |

Both screens render `<Redirect>` immediately with no visible UI. `_layout.tsx` registers `c` and `h` with `headerShown: false` to suppress any header flash.

### Acceptance criteria

- [ ] Opening `https://noodlebowl.app/c/{token}` on a device with the app installed lands on the correct game screen with the challenge question loaded.
- [ ] Opening `https://noodlebowl.app/h/{token}` on a device with the app installed lands on the correct game screen with the help question loaded.
- [ ] Neither redirect shows a header or a blank screen flash.
- [ ] Custom scheme (`noodlebowl://c/{token}` and `noodlebowl://h/{token}`) works identically.

---

## 2. Universal Link Infrastructure (AASA)

Universal links on iOS require an Apple App Site Association (AASA) file hosted on the domain. This is infrastructure work — no code change.

### What needs to be set up (outside the app)

#### 2a. AASA file

Create the following file and host it at **`https://noodlebowl.app/.well-known/apple-app-site-association`**.

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["BKVD6WM3XV.app.noodlebowl.noodlebowl"],
        "components": [
          { "/": "/c/*", "comment": "Challenge deep links" },
          { "/": "/h/*", "comment": "Help deep links" }
        ]
      }
    ]
  }
}
```

`appID` format is `{appleTeamId}.{bundleIdentifier}` — values from `eas.json` and `app.json`.

#### 2b. Hosting requirements

- Must be served over **HTTPS** (`.app` TLD requires it)
- Content-Type: `application/json`
- **No redirects** — iOS fetches this URL directly; a redirect causes it to fall through to Safari
- Must be accessible without authentication

#### 2c. Apple App Store Connect

No manual action needed. EAS automatically includes the `Associated Domains` entitlement (from `associatedDomains` in `app.json`) when building. The entitlement is already in the production build.

#### 2d. Verify AASA is live

After deploying the file, confirm Apple's CDN has picked it up:

```
https://app-site-association.cdn-apple.com/a/v1/noodlebowl.app
```

This URL reflects what Apple serves to devices. Changes take up to 24 hours to propagate.

### Acceptance criteria

- [ ] AASA file is live at `https://noodlebowl.app/.well-known/apple-app-site-association`
- [ ] Apple CDN validator returns the AASA JSON (no error, no redirect)
- [ ] AASA includes `/c/*` and `/h/*` components with the correct `appID`

---

## 3. Cross-cutting quality

- [ ] **Code review** — run code-reviewer agent over all changes since alpha-v0.1.1 branch cut
- [ ] **Security review** — run security-reviewer agent (Firestore rules, auth flows, content writes)
- [ ] **README update** — add `seed:emulator`, `seed:prod`, `start:dev`, `start:qa` to the quick-start section

---

## 4. Deep link smoke test (new Block 11)

Block 11 is added to the regression suite. It requires a **native build** (TestFlight or dev build) — Expo Go cannot handle universal links.

See PRR `docs/releases/alpha-v0.1.2/prr-alpha-v0.1.2.md` §2 Block 11 for step-by-step instructions.

---

## Out of scope (carried to future releases)

These remain open but are not blocking alpha-v0.1.2:

- Garbage-collect orphaned `received_help` interactions
- Animated entry/exit on Help Result Card and Challenge Reply Card
- Persist `homeCardDismissed` to Firestore across devices
- Shield-fill animation
- Architecture docs (auth + content + stats flow diagrams)
