# 04 · Science or Fiction — Pick The Lie

**File to edit:** `app/games/sof.tsx`
**Reference mock:** `Games Evaluation.html`, SoF · Proposal A
**Estimated effort:** medium. UI + scoring change. Data shape unchanged.

---

## What changes

The game's premise is **two truths, one lie** — find the fake. The current UI asks the player to vote Science / Fiction on each of three claims (six taps minimum). We are collapsing that to **one tap on the suspected fake**, plus an optional 1× / 2× **confidence wager** before lock-in.

## Layout

```
┌──────────────────────────────────────────────┐
│  [compact masthead]                          │
│  ← BACK TO HOME                              │
│                                              │
│  SCIENCE OR FICTION · OCTOPUS COGNITION      │
│                                              │
│  Two of these are real. One is a lie.        │
│  TAP THE FAKE                                │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ CLAIM 1                              │    │
│  │ Octopuses have neurons distributed   │    │
│  │ across their arms…                   │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ CLAIM 2          ← MY PICK           │    │   ← selected (accent fill)
│  │ Common octopuses can identify and    │    │
│  │ remember individual humans by scent… │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ CLAIM 3                              │    │
│  │ Cephalopods edit their RNA…          │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  CONFIDENCE                                  │
│  [  1× safe  ] [ 2× double down ]            │
│                                              │
│  [LOCK IN CLAIM 2]                           │
│  Stuck? Ask a friend                         │
└──────────────────────────────────────────────┘
```

## Spec

### Topic header
- One line, mono 10pt caps: `SCIENCE OR FICTION · {topic}`. Reads `SofItem.topic`.
- The longer `intro` field becomes a single italic-serif line below: `F.frauncesItalic`, 14pt, `C.muted`. Trim hard if it runs long; this is no longer a topic card with its own chrome.

### Instruction
- Two short lines:
  - `Two of these are real. One is a lie.` — `F.frauncesBoldItalic`, 16pt, `C.ink`.
  - `TAP THE FAKE` — `F.mono`, 10pt caps, `C.muted`.

### Claim cards
- Three cards, vertically stacked, gap 12.
- **Single** border (1.5pt, `C.ink`). No inset frame. No drop shadow.
- Padding: 14.
- Header row: `CLAIM 1` mono caps left-aligned. When selected, append `← MY PICK` in italic serif on the right (or below on narrow screens).
- Body: `F.fraunces`, 15pt, `C.ink`, lineHeight 1.4. Reads `SofItem.claims[i].text`.
- Selected state: background `C.accent`, text `C.onDark`, header text `C.onDark` / `C.onDarkDim`.

**Only one claim can be selected at a time.** Tapping a different one moves the selection. (Today: three independent toggles. Now: a single radio group.)

### Confidence wager
Below the claim list, two side-by-side buttons:
- **1× safe** — outline button, ink border, paper fill.
- **2× double down** — gold fill (`C.gold`), ink text.

State: defaults to `1×`. Tap to toggle. Both label and visual state should make it obvious which is active.

Wager rule:
- Win at 1× = `+10` pts.
- Win at 2× = `+20` pts.
- Lose at 1× = `0` pts.
- Lose at 2× = `−10` pts.

Negative scoring is intentional: the wager only matters if there's downside.

### CTA
- `LOCK IN CLAIM N` (label updates with selection). Disabled until a claim is picked.
- Existing primary-button style.

### Standard / Weird-True toggle
**Move it off the play screen.** It is a mode that should be set once before starting, not re-litigated mid-round. Two options, choose one and document in the PR:
- **(Preferred)** Move the toggle to the SoF home-screen tile as a small segmented control. Tapping a mode then tapping the row enters that mode.
- **(Acceptable)** Keep the toggle on this screen but collapse it into a small `MODE: STANDARD ▾` link in the top-right of the masthead row. Tap opens a sheet.

The current full-width segmented control at the top of the play screen is gone either way.

### "Ask a Friend"
Same demotion as Lede and Spread: small mono caps text link below the primary CTA.

## Reveal — minimal change

The reveal screen logic mostly stays. Two adjustments to keep it consistent:
- Show whether the user picked the actual fake first, big and clear.
- Score line shows the wager: `+20 (2× double down)` or `−10 (2× missed)`.

## Acceptance criteria

- [ ] Player commits with **one tap** + (optionally) one wager toggle.
- [ ] Only one claim can be selected.
- [ ] Wager defaults to 1×, persists across rounds within a session.
- [ ] Negative scoring at 2× wrong is implemented and shown clearly at reveal.
- [ ] Standard / Weird-True toggle is **not** a top-of-play-screen segmented control anymore.
- [ ] Compact masthead in use.
- [ ] No card insets, drop shadows, or double borders on claim cards.
- [ ] "Ask a Friend" demoted to text link.

## Edge cases

- If a player tries to lock in without selecting (button disabled), no-op.
- If push back on negative scoring: ship 2× = +20 / 0 (no penalty) as a fallback. Decide before merge.

## Out of scope

- The challenge / help versions of SoF.
- Confidence sliders per-claim (Proposal B); we chose A.
- Any change to `SofItem` / `SofClaim` data shapes.
