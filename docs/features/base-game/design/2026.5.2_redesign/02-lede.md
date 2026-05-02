# 02 · The Lede — Headline-First, Answers-Only

**File to edit:** `app/games/lede.tsx`
**Reference mock:** `Games Evaluation.html`, Lede · Proposal B (with the user's edit: **drop all reporter / outlet references; focus on the answers themselves**)
**Estimated effort:** medium. UI restructure. Underlying scoring unchanged.

---

## What changes

Today the play screen is dominated by three "reporter pitch" cards (name, outlet, italic completion, italic pitch quote). The headline — the actual puzzle — is small, above the cards, in an inset box.

We are flipping that. The **headline is the screen.** The three completion options are a tight tappable list below it. **All reporter framing is removed.** No names, no outlets, no pitch quotes — the game is now strictly "pick the real ending."

## Layout

```
┌──────────────────────────────────────────────┐
│  [compact masthead]                          │
│  ← BACK TO HOME                              │
│                                              │
│  FINISH THE HEADLINE                         │   ← mono caps kicker
│                                              │
│  EU regulator orders banks to stop           │   ← LARGE italic serif
│  running their own AI models, citing         │
│  ┌──────┐                                    │
│  │  ?   │ ← pick an ending                   │   ← gold inline tag
│  └──────┘                                    │
│                                              │
│  TAP TO CHOOSE                               │
│                                              │
│  ┃ concerns over hallucinated risk advice  A │
│  ┃                                            │
│  ▌ rising GPU procurement costs            B │   ← selected (filled)
│  ┃                                            │
│  ┃ a pending civil suit from a hedge fund  C │
│                                              │
│  [LOCK IN B]                                 │
│  Stuck? Ask a friend                         │   ← demoted to text link
└──────────────────────────────────────────────┘
```

## Spec

### Headline block
- Kicker: `FINISH THE HEADLINE` — `F.mono`, 10pt, letterSpacing 2, `C.muted`.
- Headline text: `F.frauncesBoldItalic`, 22pt, `C.ink`, lineHeight 1.2. Read from `LedeItem.partialHeadline`.
- The blank "`___`" in the source string is replaced inline with a small **gold pill** containing `?` (or the chosen letter `B` after selection). Pill is `C.gold` background, `C.ink` text, mono 11pt caps, padding 2/8, no border-radius (square corners — match the existing accent block treatment).

### Choice list
- Heading: `TAP TO CHOOSE` — mono 10pt caps, `C.muted`, marginBottom 12.
- Three rows, vertically stacked, gap 10.
- Each row:
  - Left edge: 4pt-wide vertical bar. Color = `C.paperDarker` (unselected) or `C.accent` (selected).
  - Background: `C.paper` (unselected) or `C.ink` (selected).
  - Padding: 14 vertical, 14 horizontal (after the left bar).
  - Subtle 2pt offset shadow `C.paperDarker` on unselected rows. None on selected.
  - Body: `F.frauncesItalic`, 16pt, color `C.ink` (unselected) or `C.onDark` (selected). lineHeight 1.3.
  - Trailing letter (`A` / `B` / `C`): mono 10pt, `C.muted` / `C.onDarkDim`.

**No reporter name. No outlet badge. No pitch quote. No completion attribution.** The data still comes from `LedeItem.panelists[i].completion`, but we render only that string.

### Lock-in CTA
- Label changes with selection state: `LOCK IN` (disabled) → `LOCK IN B` (enabled, where B is the chosen letter).
- Existing primary-button style (ink fill, mono caps).

### "Ask a Friend" demotion
- Move from a full-width secondary button to a small centered text link below the primary CTA: mono 10pt caps `C.muted`, underlined on press. This is consistent across all three games — see also `03-spread.md` and `04-sof.md`.

### Masthead
Use the **compact masthead** (a single ruled line + small italic logotype + tiny date kicker on the right), not the four-rule full masthead. The full masthead stays on the home tab only.

If a compact masthead component does not exist yet, create one as `components/masthead/CompactMasthead.tsx`. Wire it into all three game screens in this redesign.

## Data

`LedeItem` and `LedePanelist` types in `constants/data.ts` are **not changed**. We continue to read `partialHeadline`, `panelists[i].completion`, and `panelists[i].isCorrect`. The `name`, `role`, and `pitch` fields are simply unused on the play screen now.

> Optional follow-up (out of scope for this brief): once the play screen ships, consider whether `name`/`role`/`pitch` are still earning their keep on the **reveal** screen. If not, prune in a future cleanup pass.

## Acceptance criteria

- [ ] Zero references to reporter names, outlets, or pitch quotes anywhere on the play screen.
- [ ] Headline is the largest piece of text on the screen.
- [ ] Three choices read as a list, not three competing cards.
- [ ] Selected state is a single visual change (fill + accent bar) — no card-flip, no scale animation.
- [ ] Primary CTA label updates with selection.
- [ ] "Ask a Friend" is a text link, not a button.
- [ ] Compact masthead in use; old full masthead is removed from this screen.

## Out of scope

- The reveal screen.
- Challenge / help variants of Lede.
- Any change to `LedeItem` data shape.
