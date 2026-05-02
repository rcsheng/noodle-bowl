# 01 · Home Tab — Compact Index

**File to edit:** `app/(tabs)/index.tsx`
**Reference mock:** `Home Screen Evaluation.html`, Proposal A · Compact Index
**Estimated effort:** small. Visual only. No data shape changes.

---

## What changes

Replace the current vertically-stacked, double-bordered, full-width game cards with a tight **newspaper-index list**. All three games are visible above the fold. Each row is one tap target.

## Layout

```
┌─────────────────────────────────────────────┐
│   [existing masthead — UNCHANGED]           │
├─────────────────────────────────────────────┤
│   TODAY'S BOWL · TUE MAY 5                  │   ← mono caps section header
├─────────────────────────────────────────────┤
│  N° 01   The Lede                       →   │
│           Finish the headline               │
│           ~2 min · bluff round              │
├─────────────────────────────────────────────┤
│  N° 02   The Spread                  ✓ +84  │   ← played state
│           The number hunt                   │
│           ~2 min · numerical                │
├─────────────────────────────────────────────┤
│  N° 03   Science or Fiction             →   │
│           Two truths, one lie               │
│           ~3 min · cited sources            │
├─────────────────────────────────────────────┤
│   [existing footer/streak strip]            │
└─────────────────────────────────────────────┘
```

## Per-row spec

Each row is a `Pressable` that navigates via the existing routes (`/games/lede`, `/games/spread`, `/games/sof`). Inside:

| Element | Style |
|---|---|
| `N° 01` | `fontFamily: F.mono`, 11pt, letterSpacing 1.5, color `C.muted`, fixed-width gutter (~52pt) |
| Title | `fontFamily: F.frauncesBoldItalic`, 22pt, color `C.ink` |
| Section tagline | `fontFamily: F.fraunces`, 13pt, color `C.muted` |
| Meta strip | `fontFamily: F.mono`, 10pt caps, color `C.muted`, items joined by ` · ` |
| Trailing chevron `→` | `fontFamily: F.mono`, 16pt, color `C.ink` |

Pull the copy from `constants/data.ts → GAME_META` — do not duplicate strings.

## Played state

When a game has been completed today, replace the trailing chevron with the score in **gold** (`C.gold`):

- Unplayed: `→` (ink)
- Played: `✓ +84` (gold, mono, 12pt bold)

Use whatever existing "today's played" state already exists in `context/`. If there are multiple competing signals (a checkmark, a "Played" pill, a faded card), **collapse them all into this single trailing element**.

## Row chrome

- Each row is separated from the next by a **single 1px rule** in `C.rule` — top and bottom of the list, between rows.
- **No card backgrounds, no inset borders, no drop shadows.** This is intentional — the home tab should feel like a table of contents, not a product picker.
- Row vertical padding: 18pt top + 18pt bottom.
- Pressed state: row background tinted to `C.paperDark` (no scale/opacity animation).

## Section header

A new line of mono caps above the list:

```
TODAY'S BOWL · TUE MAY 5
```

Date format matches the masthead's existing date format. Reuse the helper from the masthead component.

## Acceptance criteria

- [ ] All three games visible without scrolling on a 5.5" iPhone (375×667 logical).
- [ ] Played and unplayed states use the **single** trailing element described above. No duplicate "played" indicators anywhere on the row.
- [ ] No card-style decoration on rows: no border, no shadow, no inset frame.
- [ ] Tapping anywhere on a row navigates to that game.
- [ ] Copy is read from `GAME_META`, not hard-coded.
- [ ] Existing footer (streak / share / etc.) below the list is untouched.

## Out of scope

- Animation between unplayed → played state.
- Reordering rows based on play status.
- Anything below the row list (footer stays as-is).
