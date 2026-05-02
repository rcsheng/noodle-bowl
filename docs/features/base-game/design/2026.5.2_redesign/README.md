# Noodle Bowl — Redesign Handoff

You will implement four redesigns across the home tab and the three live games. Read this whole document before starting. Each section below has the spec, the file(s) to edit, and acceptance criteria.

Do **not** invent new visual style. Reuse the existing tokens in `constants/colors.ts` and `constants/fonts.ts` (Fraunces, JetBrains Mono, the existing ink / paper / accent / gold / green palette). Match the masthead, button, and rule treatments already in the codebase.

Reference mocks (open in browser):
- `designs/redesign-2026-q2/Home Screen Evaluation.html` — home critique + Proposal A (the chosen one)
- `designs/redesign-2026-q2/Games Evaluation.html` — per-game critiques + chosen variants

> **Important:** the mocks were drawn at ~280×570. The real app is React Native sized to the device. Take the **layout, hierarchy, and interaction model** from the mocks — not the literal pixel sizes. Keep all text ≥ 14pt body / ≥ 11pt mono caps; hit targets ≥ 44pt.

---

## Folder structure

Drop the design package in the repo at:

```
noodle-bowl/
└── designs/
    └── redesign-2026-q2/
        ├── README.md                       ← this file
        ├── Home Screen Evaluation.html     ← reference mock
        ├── Games Evaluation.html           ← reference mock
        ├── 01-home-tab.md
        ├── 02-lede.md
        ├── 03-spread.md
        └── 04-sof.md
```

The four numbered briefs (`01-home-tab.md` … `04-sof.md`) hold the per-screen spec. Implement them in order; each is independently shippable.

---

## Suggested order of work

1. **Home tab** — visual change only, no game logic touched.
2. **Lede** — UI restructure; data shape unchanged.
3. **SoF** — UI + scoring change; data shape unchanged.
4. **Spread** — biggest change. Requires a new bisection algorithm and likely a new game state machine. Save for last.

For each game, also update the matching challenge / help screens under `app/games/challenge/` and `app/games/help/` so they stay consistent.

---

## Suggested instruction to give Claude Code

> Read `designs/redesign-2026-q2/README.md` and the four numbered briefs in that folder. Implement them one at a time in the order listed. After each brief, stop and let me review before moving on. Reuse existing color/font tokens from `constants/`; do not introduce new design primitives. Match the existing masthead, button, and rule treatments.
>
> For the Spread bisection round, treat the algorithm spec in `03-spread.md` as a hard requirement — write it as a pure function in `lib/` with unit tests before wiring it into the game screen.
>
> Keep the existing copy voice (italic Fraunces serif headlines, mono caps labels). Do not change wording unless the brief explicitly says so.

---

## What is **out of scope**

- The Quip and Wave games (still hidden via `VISIBLE_GAMES`).
- Auth, challenge sharing, push notifications.
- The reveal screens for Lede and SoF (only their *play* phase changes here). The Spread reveal does change — see `03-spread.md`.
- Any backend / Firestore changes. All four redesigns are client-only.
