# PR 23 — Case-File M-D — Fix-Delta Review (Round 1 fixes)

**Fix commit (single SHA):** `aeae248` — reviewed via `git show aeae248`.
**Prior review:** `docs/code-reviews/pr-23-case-file-m-d-review.md`
**Date:** 2026-07-07

## Verdict
**clean — milestone approved. M-D is closed.** All 7 findings (H1, H2, M1–M4, L1) verified closed; no new findings. Notably, the author **corrected the reviewer's fix prescription** for H1 with sound reasoning.

## Fix → finding
- **H1 + L1 CLOSED (improved fix).** The reviewer prescribed a bare `-z-10`; the author correctly rejected it — because `bg-ink-900` sits on the `(default)` wrapper `<div>` (not `<body>`), a negative-z child *without a new stacking context* paints behind that background (App E: negative-z step 2 precedes in-flow block backgrounds step 3) → invisible glow. The landed fix adds `isolate` (isolation:isolate → new stacking context) to both the layout wrapper and the page wrapper, plus `-z-10` on the glow and `before:-z-10` on the grid. Verified: glow/grid now paint above `bg-ink-900` but behind content. This is more correct than the reviewed prescription.
- **M1 CLOSED.** The glow is recentered to `top-0` with an explicit-size radial `550px 260px at 50% 0%` (the design ellipse's visible lower half); the `-top-[260px]` overhang — and thus the `<main overflow-hidden>` clip — is gone.
- **H2 CLOSED.** `hero.test.tsx` now asserts `getByText('10 min → <5').toHaveClass('text-gold')` plus `.not.toHaveClass('text-gold')` on the other two cells — the gold treatment is genuinely pinned (deleting `cell.gold` now fails).
- **M2 CLOSED.** Roadmap guard widened to `/gold|#ffd93d|255,\s*217,\s*61/i` (rgba-aware, with a comment naming the beta-cta precedent).
- **M3 CLOSED.** Marquee test asserts `bg-gold/[0.04]` + `shadow-[inset_3px_0_0_#ffd93d]` + `within(marqueeRow).getByText('06').toHaveClass('text-gold')`, plus normal-row negatives (`not.toHaveClass('bg-gold/[0.04]')`, number is `text-cyan`).
- **M4 CLOSED.** `beta-cta.test.tsx` asserts `queryByRole('textbox')` and `queryByRole('button')` are null — the static-intake / no-a11y-trap contract is now explicit.
- **Meta-note adopted** — the design-invariant guards now assert class/structure, not copy.

## Gates
714/714 (106 files) · tsc clean at `aeae248`. The test changes are committed **in** `aeae248` (self-consistent commit — a good contrast with the M-E situation where the test fix was left uncommitted).

## New findings
None.
