# 03 · The Spread — Bisection Round

**File to edit:** `app/games/spread.tsx`
**New file:** `lib/spreadBisection.ts` (+ tests)
**Reference mock:** `Games Evaluation.html`, Spread · Proposal B
**Estimated effort:** large. New algorithm + new game state machine + reveal redesign.

---

## What changes

The Spread today asks one open-ended numeric question, then reveals. We are replacing that with a **3-round bisection game**: each round shows an anchor number and asks "more or fewer than X?". By the end of round 3, a player who answers truthfully every time should have the true answer cleanly bracketed.

This is the user's hard requirement:

> The bisection should be generated based on an algorithm off the actual answer, so that by the 3rd question the player has a way to get to the right answer.

That means **the anchors are not authored** — they are computed from the truth answer and the player's prior responses. Editorial only writes the question + truth + unit; the algorithm produces the rounds.

---

## The algorithm — `lib/spreadBisection.ts`

Build a pure module with this surface:

```ts
export interface BisectionRound {
  threshold: number;          // the "≥ X" number shown to the user
  truthDirection: 'more' | 'fewer';  // which side the truth is on
  bracketBefore: { lo: number; hi: number };
  bracketAfter:  { lo: number; hi: number };
}

export interface BisectionPlan {
  rounds: BisectionRound[];   // exactly 3 rounds
  initialBracket: { lo: number; hi: number };
}

export function planBisection(item: SpreadItem): BisectionPlan;
export function applyAnswer(
  bracket: { lo: number; hi: number },
  threshold: number,
  answer: 'more' | 'fewer'
): { lo: number; hi: number };
```

### Rules the algorithm must satisfy

1. **3 rounds, always.** No more, no fewer. Predictable pacing.
2. **Truthful play converges.** If the player answers every round honestly (i.e. according to where the truth actually sits), the final bracket `[lo, hi]` after round 3 must contain the truth and have a width ≤ 25% of the truth, OR (when the truth is small, e.g. ≤ 20) ± 2 of the truth — whichever is wider. Convergence is the whole point; this is the test that pins it down.
3. **Anchors must be human-readable.** Round-to-nice-numbers: 1, 2, 5, 10, 25, 50, 100, 250, 500, 1k, 2.5k, 5k, 10k … (use a "nice number" rounder — see below). A threshold of `1,847` is wrong; `2,000` is right.
4. **Round 1 anchor is wide.** Pick a threshold near the geometric midpoint of a plausible domain — typically half an order of magnitude below the truth, rounded to a nice number. The user should plausibly land "more" or "fewer" with similar frequency across questions.
5. **Round 2 narrows.** After round 1's truthful answer, the bracket halves (in log space if the range is wide). Round 2's threshold is the nice-number nearest the geometric midpoint of the new bracket.
6. **Round 3 closes in.** Round 3's threshold sits between the truth and the previous bracket boundary on the truth side — close enough that a truthful answer pins the truth tightly, but not so close that "more or fewer than the answer ± 1" is the question. Aim for a final bracket where the truth sits at roughly 30–70% of the bracket width.
7. **Initial bracket** is derived from the truth's order of magnitude:
   - truth ≤ 20 → `[1, 100]`
   - truth ≤ 200 → `[1, 1000]`
   - truth ≤ 2000 → `[10, 10000]`
   - …and so on. Keep this as a small lookup; do not fancy it up.
8. **Bracket update is monotonic.** If the user says "more than X", new `lo = max(lo, X)`. If "fewer", new `hi = min(hi, X)`. The threshold is exclusive of the chosen side (we say "≥ X" → "fewer than X" excludes X, "more than or equal to X" includes it; pick one convention, document it, stick with it).

### "Nice number" rounder

Implement `niceRound(n)` that returns the nearest value from `{1, 2, 2.5, 5} × 10^k`. This is the same idea as D3's `d3.ticks` rounding. Test it.

### Tests — `lib/__tests__/spreadBisection.test.ts`

Required cases:
- Truth = 16 → 3 rounds converge to a bracket of width ≤ 6 containing 16.
- Truth = 847 → 3 rounds converge to a bracket of width ≤ 215 containing 847.
- Truth = 12,400 → 3 rounds converge to a bracket of width ≤ 3,100 containing 12,400.
- Truth = 3 → 3 rounds converge to a bracket of width ≤ 4 containing 3 (small-truth carve-out).
- Every threshold returned is a "nice" number.
- `applyAnswer` is monotonic (new bracket is always inside old bracket).

---

## Game state machine

```
idle → round1 → round2 → round3 → reveal
```

Each round:
1. Show the question (always visible, top of screen).
2. Show "Round N of 3" progress dots.
3. Show the anchor: "Was it ≥ X houses?" with `X` very large.
4. Two buttons: **Fewer** (< X) and **More** (≥ X). Tapping advances.
5. After the tap, briefly (200ms) show ✓ or ✗ on the chosen button — but **do not reveal** whether the truth is in that direction. We only show truthfulness at the very end. (Decision flag: this is intentional. The player should commit to all three before learning anything.)

### Scoring

- Each correct directional call = 1 point (max 3).
- Bonus +2 if final bracket is the tightest possible given the algorithm (i.e. user was truthful all 3 rounds).
- Bonus +5 if user explicitly types the exact truth in the final "narrow it" step (see below).

### Optional final step

After round 3, before reveal, offer **one** optional fine-tune: a number input pre-filled with the bracket midpoint, with `+1 / -1 / +10 / -10` nudge buttons. Submitting locks in. Skipping reveals using the bracket midpoint as the implicit guess.

This is what gives pros a way to actually *win* the round outright — they bisect their way down, then commit a precise answer.

---

## Reveal redesign

```
┌──────────────────────────────────────────────┐
│  THE ANSWER                                  │
│                                              │
│              ┃     ┃                          │   ← number line
│   1 ──────── 8 ──── 24 ──────── 500          │
│              ↑      ↑                         │
│           your    truth                       │
│           range   (16)                        │
│                                              │
│   You bracketed 8–24. Truth: 16.              │
│   3 of 3 directional calls correct.          │
│   +5 BONUS · 8 PTS                            │
└──────────────────────────────────────────────┘
```

A horizontal number line on log scale (or linear if domain is small). Show:
- The initial bracket (faint).
- Each round's narrowing as a tick + thinner band.
- The user's final bracket (filled accent).
- The truth as an `↑` marker.
- The user's final precise guess (if they used the optional fine-tune step).

Score breakdown sits below in mono caps.

---

## Acceptance criteria

- [ ] `lib/spreadBisection.ts` exists with the surface above and passes all listed tests.
- [ ] Anchor numbers are always "nice" — never raw `1,847.32`.
- [ ] A truthful 3-round play **always** ends with the truth inside a tight final bracket (proven by tests).
- [ ] Question is visible above the bisection prompt at all times during play.
- [ ] Each round commits before the user sees correctness; reveal happens once at the end.
- [ ] Reveal screen shows the number-line visualization, not the old "Your Guess / The Answer" two-column block.
- [ ] Existing `SpreadItem` data shape is unchanged. The `others` array stays available for future "crowd distribution" features but is not used in this redesign.
- [ ] Compact masthead in use (same component built for Lede).
- [ ] "Ask a Friend" is a small text link below the primary CTA, matching Lede.

## Open questions for the team (flag in PR)

- Should "Ask a Friend" let the friend see the bracket so far, or start fresh? (Recommend: see-the-bracket.)
- Should the optional fine-tune step be required or skippable? (Recommend: skippable; reward in points if used and correct.)
- For very small truths (≤ 5), is a 3-round bisection still meaningful, or should we collapse to 1 round? (Recommend: keep 3 rounds; the small-truth carve-out in the algorithm makes it work.)

## Out of scope

- The challenge / help versions of Spread.
- Crowd-distribution histogram (Proposal C); we may revisit later.
- Any change to the question bank itself.
