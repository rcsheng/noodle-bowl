# Handoff: Slurp — Riso Broth direction

## Overview

**Slurp** is a 20–60 minute word-finding roguelike with a noodle-soup economy. Players build words from letter tiles to fill broth/score quotas across rounds, buying toppings (passive modifiers) and spices (consumables) at intermission shops between courses. This handoff covers the **visual + UX direction** picked from a four-direction exploration: **"Riso Broth"** — a hand-printed, two-color zine aesthetic.

The mechanics, screens, and economy are defined in the team's PRD. This package only covers **how it looks and feels**.

## About the Design Files

The files in this bundle are **design references created in HTML** — a clickable React+Babel prototype showing the intended look and feel. They are **not production code to copy directly.**

Your task is to **recreate these designs in the target codebase's existing environment**. The PRD targets **React Native (mobile)** as the production framework, so styles need to be translated from inline CSS to `StyleSheet` (or your codebase's styling system, e.g. Tamagui, NativeWind, restyle). If the project does not yet have a styling foundation, choose what fits — but the visual targets below should be matched closely.

## Fidelity

**Mid-fidelity.** The mockups have:

- ✅ Final color palette and typography intent
- ✅ Real spacing, layout, and component structure
- ✅ The aesthetic language (halftone, misregistration, hand-drawn borders)
- ⚠️ **Placeholder iconography** — the bowl illustration, emoji-based broth icons, and tab-bar glyphs are stand-ins. Replace with custom illustrations done in the same riso/zine style (single-line ink + halftone fills).
- ⚠️ **Placeholder copy on auxiliary screens** (run summary stats, market item names) — final copy comes from PRD/content design.
- ⚠️ **Static** — no animations or transitions are implemented. See "Interactions & Behavior" for intent.

---

## The Aesthetic — "Riso Broth"

A two-color **risograph zine** vibe: chili red + miso mustard inks on warm cream paper. Halftone dot patterns, hand-drawn wobbly outlines, slight color misregistration (a colored shadow offset behind ink type), small rotations to give a hand-pasted feel. The voice is **playful and punny** — it leans into noodle metaphors (Slurp/Spit, Broth/Quota, Tasting/Course, Topping cards). Indie, photocopied, confident.

**It must NOT look like Balatro.** No purple/teal neon, no glassy holographic foils, no card-game suit iconography.

---

## Design Tokens

```js
// Colors (drop into theme)
const colors = {
  cream:      '#f5ecd9',  // primary surface / paper
  creamDeep:  '#ecdfb8',  // secondary surface, panels
  ink:        '#2b2014',  // primary text, borders, "ink" color
  red:        '#e54a3b',  // accent / CTA / score callouts
  redShift:   '#cc3d2e',  // misregistration shadow variant
  mustard:    '#d9a52a',  // secondary accent / coins / highlights
  mustardShift:'#c89322', // misregistration shadow variant
  scallion:   '#5e8a3a',  // tertiary accent (sparing)
  shadow:     'rgba(43,32,20,0.12)',
};

// Spacing — loose 4px grid; the design uses 4 / 6 / 8 / 10 / 12 / 14 / 16 px steps
// Border radius
const radius = {
  sm: 4,   // chips, mini badges
  md: 6,   // cards, buttons
  lg: 8,   // letter tiles
  pill: 999,
};

// Drop shadows are NOT soft — they are HARD offset shadows mimicking riso layer offset:
//   Standard:    boxShadow: '2px 2px 0 #2b2014'
//   Hero/double: boxShadow: '4px 4px 0 #2b2014, -3px 3px 0 #e54a3b'
// Always solid, no blur.

// Borders are 1.5–2.5px solid ink, never thin hairlines.
```

### Typography

Three families, used semantically:

| Role | Family | Notes |
|---|---|---|
| Display / headings / numbers | **Inter Display** (or Inter, weight 900) | Heavy, tight tracking (`-0.02em`). Used in `RisoMisreg` with a colored shadow offset. |
| Italic accents / captions | **Times New Roman** (or any transitional serif: Source Serif, Lora, Tinos) | Italic only. Captions, taglines, "tap to continue" text. Adds zine flavor. |
| Mono / labels / numbers in tables | **ui-monospace / SF Mono / JetBrains Mono** | All-caps eyebrow labels with `0.2em` letter-spacing. Stat readouts. |

Sizes seen in the mocks:
- Hero display: 32–44px (with `lineHeight: 0.95`)
- Section title: 22–28px
- Body display: 14–16px (always 900 weight)
- Italic accent: 11px
- Mono eyebrow: 7–9px, weight 700, letter-spacing `0.2em`–`0.25em`, all caps

### Signature visual primitives

These three things define the look — implement them as reusable components.

**1. `RisoMisreg` — misregistered headline text**
A heavy display word with a colored ghost shadow offset 1–2px down/right, set to `mix-blend-mode: multiply`. Mimics imperfect riso color registration.

```js
// Pseudocode
<Misreg color={ink} shift={red} dx={2} dy={1}>SLURP</Misreg>
// Renders: an absolutely-positioned ghost layer in `red` with mixBlendMode multiply,
// behind the same word in `ink`. Use `dx`, `dy` to offset.
```

In RN: stack two `<Text>` layers absolutely; iOS supports `mixBlendMode` on View, Android may need a flat compositing fallback (just use `redShift` color directly).

**2. `RisoBorder` — hand-drawn paper card**
A bordered panel with hard offset shadow.
- 2px solid ink border, 6px radius
- Default: `boxShadow: '3px 3px 0 ink'`
- "Double-stamped" variant (hero callouts): `boxShadow: '4px 4px 0 ink, -3px 3px 0 red'`
- Optional inner halftone overlay (see #3)

**3. Halftone dot fills**
Tiny dot pattern overlays on filled areas — letter tiles, progress bars, the bowl interior. Two implementations:
- Flat backgrounds: `radial-gradient(circle at 1px 1px, rgba(43,32,20,0.18) 0.7px, transparent 1.4px) 0 0 / 4px 4px`
- Inside SVG: `<pattern>` with small `<circle>` elements

**4. Slight rotation**
List items, market cards, broth options have `transform: rotate(±0.4deg–0.5deg)` to feel hand-pasted. Alternate signs across siblings.

---

## Screens

The reference prototype shows **6 screens**. All in a 280×570 mobile viewport.

### 1. Tab Landing (Home tab — entry point)

**Purpose:** Hub — start a run, see best score / runs / wins, navigate via tab bar.

**Layout (top to bottom):**
- Status bar (system)
- Header block (left-aligned, padding 8px/16px):
  - Eyebrow: `VOL. 01 / ISSUE 7` — mono, 9px, red, letter-spacing 0.25em
  - Title: `SLURP` (ink) + `!` (mustard, italic serif) — 36px misreg
  - Tagline: `a noodle-soup zine of luck & vocabulary` — 11px italic serif
- Hero illustration block — `RisoBorder` double-stamped, 130px tall, contains a bowl + steam + chopsticks SVG. **Replace this SVG with custom illustration.**
- Primary CTA: full-width black button, `START A RUN`, 14px tracked 0.2em, red hard-shadow
- Stats row: 3-column grid of mini `RisoBorder` tiles — `BEST 14,820 / RUNS 7 / WINS 2`. Middle one mustard-filled.
- Bottom tab bar (5 items, "Slurp" middle is active)

**File:** `RisoLanding` in `dir2-riso.jsx`

### 2. Broth Select (run start)

**Purpose:** Choose one of N broth bases (each is a starting modifier set).

**Layout:**
- Header: `STEP 1 / 9` eyebrow + `pick your broth` misreg title (22px)
- Vertical list of 4 broth cards, each:
  - 36×36 emoji "icon" tile (ink-bordered cream square) — **placeholder, replace with custom riso-style food icons**
  - Name (14px display) + tag (10px italic serif: "balanced", "high variance", etc.)
  - One card is selected (red fill + double-shadow + ★ badge)
  - Each card slightly rotated (±0.4°)

**File:** `RisoBrothSelect`

### 3. Tasting · Play (the core loop screen — most-used)

**Purpose:** Build words from a row of letter tiles to fill the broth meter. Most important screen.

**Layout (top to bottom):**
- Header strip with bottom border:
  - Left: `APPETIZER · BOWL TASTING` eyebrow + `quota 450` misreg
  - Right: two stat blocks — `3 SLURPS` (red) / `2 SPITS` (ink), mono, 16px
- Broth progress meter: label row `BROTH 287 / 450`, then a 9px-tall ink-bordered pill, fill is red with halftone overlay. **Animate fill width on word-commit.**
- Topping row: 5 small mustard-filled chips with 1.5px ink borders, mono labels. Last chip is `+` for adding.
- "Word being built" panel — `RisoBorder` cream-deep, contains:
  - `NOODLE · 5 LETTERS` mono eyebrow
  - The word (`SLURP`) at 26px misreg
  - Score formula: `17 × 2.5 = **42**` (mono, with the result big in red display)
- Bottom area:
  - Letter tile bowl — flex-wrap row of `RisoTile`s. Selected tiles are red-filled with cream letter; unselected are cream with halftone-red overlay + mustard hard shadow. Each tile rotated by `(charCode % 5) - 2` degrees.
  - Three buttons: `SLURP!` (2x flex, ink-bg, red shadow), `spit` (cream, ink border), `spice` (mustard, ink border)

**File:** `RisoPlay`

### 4. Score Readout (after committing a word)

**Purpose:** Itemize how the word's score was computed (chips → toppings → multipliers → total).

**Layout:**
- Header: pattern label `RAMEN PATTERN · 6 LETTERS` + word `NOODLE` (32px misreg)
- Receipt-style `RisoBorder` panel with double shadow:
  - 4 line items: `letter chips +8`, `ramen base +20`, `crispy shallots ×3 ssn`, `scallions +3 ssn` — italic serif left, display-bold right (red), dashed underlines between
  - Bottom total row: `30 × 7.5 = **225**` (last number 32px misreg, red on mustard ghost)
- Caption: `tap to keep slurping →` (italic serif, centered)

**File:** `RisoScoreReadout`

### 5. The Market (intermission shop)

**Purpose:** Spend coins between rounds on toppings, flavors, pantry items, spices.

**Layout:**
- Header strip with **dashed** bottom border:
  - Left: `INTERMISSION` eyebrow + `The Market` misreg
  - Right: coin badge — mustard-filled mini panel `¢42` mono-bold
- 2-column grid of 6 item cards. Each card:
  - Mono red sub-label: `topping`, `flavor`, `pantry`, `spice`
  - Display name (12px)
  - Bottom row: price (`¢4`) + small red `BUY` chip
  - Slight alternating rotation
- Footer two-button row: `REROLL ¢5` (cream), `NEXT →` (ink with red shadow)

**File:** `RisoMarket`

### 6. Run Summary (end of run)

**Purpose:** Celebrate (or commiserate) the finished run, show stats, choose what's next.

**Layout:**
- Header: `★ RUN COMPLETE ★` mono red 9px + title `well slurped!` (`well` ink, `slurped!` red italic serif misreg)
- Big score panel — `RisoBorder` cream-deep with double shadow:
  - `FINAL SCORE` mono eyebrow centered
  - `38,420` at 44px misreg (red on mustard ghost)
  - Dashed divider
  - 2x2 stat grid: Best slurp / Top pattern / Coins / Toppings — mono caption + display value
- Two buttons stacked: `ENDLESS MODE →` (red) and `NEW RUN` (cream)

**File:** `RisoRunSummary`

---

## Components to extract / build

When you implement this in RN, build these as reusable components first:

1. **`<RisoText>` (a.k.a. `RisoMisreg`)** — heavy display text with colored ghost layer
2. **`<RisoBorder>`** — bordered panel with hard offset shadow (single or double)
3. **`<RisoTile>`** — letter tile (selected/unselected states, value subscript)
4. **`<RisoButton>`** — three variants: filled-ink, filled-cream, filled-red — all with hard shadow
5. **`<RisoMeter>`** — the broth progress bar with halftone-overlaid fill
6. **`<RisoBadge>`** — small mono-text badge for coin counts, slurps/spits, etc.
7. **`<HalftoneOverlay>`** — RN: a tiled small-PNG or SVG pattern positioned absolutely behind content. Pre-bake the dot pattern as a tileable PNG asset to avoid layout cost.
8. **`<TabBar>`** — bottom 5-tab nav with cream surface + red active tint

---

## Interactions & Behavior

The reference is static. Implement these motion intents:

| Moment | Behavior |
|---|---|
| Letter tile tap | Tile lifts ~3px, shadow grows briefly, rotation animates to 0°. ~120ms ease-out. |
| Adding letter to word | Letter slides into the "word being built" panel with a small overshoot. |
| Slurp! commit | Tile sequence flashes briefly; the word panel does a small shake + scale; score formula counts up over ~600ms; broth meter fills with a slight "settle" overshoot. **Moderate drama, not screen-shaking.** |
| Spit (discard) | Tiles fade + slide off the bowl row. |
| Buying at market | Selected card lifts and animates toward the coin badge; coin number ticks down. |
| Run complete | Score number counts up from 0 over ~1.2s with mono → display font morph (or just a count-up if morph is hard). |

Easing default: standard ease-out cubic. Keep durations 120–600ms; nothing should feel sluggish.

No hover states (mobile). Pressed states: scale 0.96 + shadow tightens to 1px offset.

---

## State Management

Out of scope for this handoff — refer to the PRD. The screens above consume:

- **Bowl state** — letter tiles array, selected tiles, current word, word score preview
- **Round state** — broth current/quota, slurps/spits remaining, current course
- **Run state** — coins, owned toppings (passives), owned spices (consumables), broth base, run number
- **Meta state** — best score, total runs, wins (Tab Landing)

---

## Assets to Produce

The reference uses placeholders. The Riso direction needs **custom riso-style illustrations** for:

1. **The hero bowl on Tab Landing** — replace the SVG bowl/steam/chopsticks with a more characterful illustrated bowl. Same constraints: 2 ink colors, halftone fills, hand-drawn outline.
2. **Broth base icons** (Classic Chicken, Tonkotsu, Clear Dashi, Miso) — currently emoji. Need 4–8+ custom ~36×36 monochrome line icons in the same style.
3. **Topping icons** for chips/cards (chili, egg, nori, scallion, shiitake, etc.) — same style.
4. **Tab bar glyphs** — currently text glyphs (`⌂ ◫ 🍜 ⚐ ◯`). Replace with custom 20px monoline icons.
5. **Halftone tile asset** — a small tileable PNG of the dot pattern for use in RN backgrounds.

Style brief for assets: single-weight ink line, optional halftone fill, ~2-color, 5–10° hand-tilt allowed, no shading/gradients.

---

## Files in This Package

| File | What it is |
|---|---|
| `index.html` | Standalone runnable reference. Open in any modern browser to see all 6 screens. |
| `dir2-riso.jsx` | All 6 screens as React components, with all design tokens and primitives at the top. **The source of truth for spacing, colors, and exact styling.** |
| `shared.jsx` | iPhone frame chrome (`MiniPhone`, `MiniStatus`), tab bar (`MiniTabBar`), helpers (`Progress`, `FrameLabel`). The `MiniPhone` is just a presentation frame for the design canvas — discard for production. |
| `README.md` | This document. |

To run the reference: open `index.html` in a browser. (Requires an internet connection — it loads React and Babel from unpkg.)

---

## Suggested Implementation Order

1. **Tokens + primitives** — wire up the color palette, the three font families, then build `RisoText`, `RisoBorder`, halftone overlay component.
2. **Tasting · Play screen first** — it's the most-used screen and exercises every primitive. Get tile interaction feeling right.
3. **Score Readout** — small, validates the receipt + misreg pattern.
4. **Tab Landing** — exercises the hero illustration + tab bar + button system.
5. **Broth Select / Market / Run Summary** — variations on already-built primitives.

Once one screen feels good, the rest fall into place quickly.
