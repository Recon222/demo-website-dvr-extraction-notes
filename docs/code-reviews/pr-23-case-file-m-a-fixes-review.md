# PR 23 — Case-File M-A — Fix-Delta Review (Round 1 fixes)

**PR:** #23 — Milestone A follow-ups
**Fix commit (single SHA):** `d85c571` — reviewed via `git show d85c571` (not a range, not the working tree)
**Prior review:** `docs/code-reviews/pr-23-case-file-m-a-review.md`
**Date:** 2026-07-07

> Self-contained — does not require re-reading the initial review.

## Verdict
**clean — milestone approved.** All 3 actioned round-1 findings verified closed; the 2 deferrals are justified. **M-A is closed.**

## Fix commit → finding
| Finding | Type | Status | Verification |
|---|---|---|---|
| L3 — CLAUDE.md stale claims | fix (widened) | **CLOSED** | new claims checked against tree at `d85c571` |
| M1 — layout/accent test half-pinned | fix | **CLOSED** | assertion added; mutation-reasoned |
| L1 — classLabel optional-but-mandatory | fix | **CLOSED** | `?` dropped; fixtures labelled |
| M2 — `**bold**` parser | defer | **JUSTIFIED** | concrete trigger (Slice 6/10) |
| L2 — `featureHeadline()` helper | defer | **JUSTIFIED** | concrete trigger (Slice 10) |

## Verification detail

- **L3 CLOSED (widening was correct).** The author fixed beyond the two flagged lines because their unpushed Slices 3–4 had staled more of the section. I verified every widened claim against the tree at `d85c571`:
  - `app/(default)/layout.tsx` has no `'use client'` → **Server Component** ✓ (doc now says so)
  - `aos` + `@types/aos` **gone** from `package.json` ✓ (AOS paragraph removed)
  - `app/css/additional-styles/theme.css` **deleted** ✓ (its bullet removed)
  - root `app/layout.tsx` renders `<body>` + `{children}` only, **no chrome** ✓ (doc now says root renders no chrome)
  - `lib/hooks/useReducedMotion` exists ✓ (doc moved hooks claim `utils/` → `lib/hooks/`)
  - phantom `app/(auth)` and `utils/` masonry hooks **removed** ✓ (the original L3)
  - the `@/utils/...` alias example corrected to `@/lib/...`; fonts list updated with `--font-stmono`/`--font-jbmono`; the no-demo-import + chrome-scope invariants added ✓
  No new inaccuracies found — the rewritten Architecture section matches reality at the fix SHA.

- **M1 CLOSED.** `features.test.ts` `else` branch now loops `f.rows` asserting `row.accent === undefined` for every non-`on-device` feature. Mutation check: adding `accent: 'gold'` to any normal feature row would now fail this test. The coupling is fully pinned.

- **L1 CLOSED.** `types.ts` `classLabel?: FeatureClass` → `classLabel: FeatureClass`. tsc then flushed two inline `Feature` fixtures — `components/__tests__/feature-page.test.tsx` (`MARQUEE`) and `components/home/__tests__/feature-grid.test.tsx` (`MARQUEE`, `CORE`) — all valid union members, no `as any`. (Author correctly counted **10** features; the initial review's "9" was a miscount — conclusion unchanged.)

- **M2 / L2 DEFERRED — justified.** Both were recommended for deferral in the initial review itself, and both are code with zero consumers today (YAGNI). Concrete un-defer triggers are tracked in the plan: M2 bold-span parser ships with the first `intro`/`tip.body` renderer (Slice 6/10); L2 `featureHeadline()` with the feature-page renderer (Slice 10).

## Gates
The fix commit is docs + test + type-only; each change is self-evidently correct on inspection, so verification was by diff-reading (the strongest signal here). Author reports `tsc --noEmit` clean and 670/97 green at `d85c571` — consistent with the diff (M1 adds assertions, L1 tightens a type + labels two fixtures).

## New findings introduced by the fix
None.
