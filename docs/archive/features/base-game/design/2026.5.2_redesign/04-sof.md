# 04 · Science or Fiction — Pick The Lie

**File to edit:** `app/games/sof.tsx`
**Reference mock:** `Games Evaluation.html`, SoF · Proposal A
**Estimated effort:** medium. UI change. Data shape unchanged.

---

## What changes

The game's premise is **two truths, one lie** — find the fake. The current UI asks the player to vote Science / Fiction on each of three claims (six taps minimum). We collapsed that to **one tap on the suspected fake**.

The confidence wager (1× / 2× with negative scoring) has been **removed**. Correct = +10, wrong = 0.

The Standard / Weird-True toggle is a **segmented control at the top of the play screen**, hidden in challenge and help modes.

## Layout

```
┌──────────────────────────────────────────────┐
│  [compact masthead]                          │
│  ← BACK TO HOME                              │
│                                              │
│  [ STANDARD ]  [ WEIRD & TRUE ]              │   ← segmented control (hidden in challenge/help)
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
│  [LOCK IN CLAIM 2]                           │
│  Stuck? Ask a friend                         │
└──────────────────────────────────────────────┘
```

## Spec

### Mode toggle
- Two-button segmented control: `STANDARD` and `WEIRD & TRUE`.
- Placed above the topic line.
- Active button: `C.ink` fill, `C.onDark` text. Inactive: paper fill, `C.ink` text.
- testIDs: `sof-mode-standard`, `sof-mode-weird`.
- Hidden in challenge mode and help mode.

### Topic header
- One line, mono 14pt caps: `SCIENCE OR FICTION · {topic}`. Reads `SofItem.topic`.
- The `intro` field below: `F.frauncesItalic`, 14pt, `C.muted`.

### Instruction
- Two short lines:
  - `Two of these are real. One is a lie.` — `F.frauncesBoldItalic`, 16pt, `C.ink`.
  - `TAP THE FAKE` — `F.mono`, 10pt caps, `C.muted`.

### Claim cards
- Three cards, vertically stacked, gap 12.
- **Single** border (1.5pt, `C.ink`). No inset frame. No drop shadow.
- Padding: 14.
- Header row: `CLAIM 1` mono caps left-aligned. When selected, append `← MY PICK` in italic serif on the right.
- Body: `F.fraunces`, 15pt, `C.ink`, lineHeight 1.4. Reads `SofItem.claims[i].text`.
- Selected state: background `C.accent`, text `C.onDark`, header text `C.onDark` / `C.onDarkDim`.

**Only one claim can be selected at a time.** Tapping a different one moves the selection.

### Scoring
- Correct = +10 pts. Wrong = 0 pts.
- No wager, no negative scoring.

### CTA
- `LOCK IN CLAIM N` (label updates with selection). Disabled until a claim is picked.
- Existing primary-button style.

### "Ask a Friend"
Same demotion as Lede and Spread: small mono caps text link below the primary CTA.

## Reveal — minimal change

Show whether the user picked the actual fake first, big and clear. Score line: `+10` or `0`.

## Acceptance criteria

- [x] Player commits with **one tap**.
- [x] Only one claim can be selected.
- [x] Confidence wager removed. Correct = +10, wrong = 0.
- [x] Standard / Weird-True toggle is a segmented control at top of play screen.
- [x] Toggle hidden in challenge and help modes.
- [x] Topic line is mono 14pt caps.
- [x] Compact masthead in use.
- [x] No card insets, drop shadows, or double borders on claim cards.
- [x] "Ask a Friend" demoted to text link.

## Out of scope

- The challenge / help versions of SoF.
- Any change to `SofItem` / `SofClaim` data shapes.
