# PR 25 — Fix Delta Review

**PR:** [#25](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/25) — Demo Explorer M2 — the exploration manifest: visited tracking + rail checklist
**Scope:** One commit — `1955e0f` (review fixes: M1 type tightening, M2 identity pin, L1 cast drop, L3 disjointness test). Re-review of the fixes to `pr-25-demo-explorer-m2-review.md`.
**Reviewers (fresh synchronous dispatch, scoped to the two lanes the commit touches):** `type-design-analyzer`, `pr-test-analyzer`
**Lanes skipped:** `typescript-reviewer` (change is type-only — casts *removed*, none added, consumer soundness confirmed by green `tsc`; orchestrator-verified inline) · `silent-failure-hunter` (no error-handling/control-flow surface changed; clean last pass)
**Date:** 2026-07-10

> **For the implementing instance:** This document is self-contained.

## Verdict

**APPROVE.**

Both MEDIUM findings from the initial review are cleanly closed, each verified by mutation (the reviewers reverted the production code / injected a typo and watched the guard fire). L1 and L3 closed; L2 correctly skipped per the review's own "land it if the manifest grows" rubric. The delta surfaced one **new LOW** — the identity-pin test exercises re-visits through `setView`/`openModal` but not `launch` — which is a contract-completeness gap with effectively nil runtime impact (traced below). Nothing blocks merge; the LOW is a one-line optional test.

## Pre-flight gates (re-verified after fix)

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit -p tsconfig.json` | **0 errors** |
| `pnpm exec vitest run` | **108 files / 743 tests pass** (was 740; +3) |
| `pnpm lint` | Not runnable (no ESLint config). Pre-existing. |

## Fix commit → finding mapping

| Commit | Closes | Verified |
|---|---|---|
| `1955e0f` | **M1** `covers`/`visited`/`visit()` → `AppView \| ModalId` · **M2** `visit()` identity pinned by `toBe` + both-ways companion · **L1** redundant cast dropped · **L3** covers-disjointness test | ✅ all closed (mutation-verified) |
| *(skipped)* | **L2** completion-color branch test | ⏸ deferred per rubric ("decorative, land if the manifest grows") |

## Reviewer verdicts at a glance

| Agent | Original closed | New | Verdict |
|---|---|---|---|
| `type-design-analyzer` | M1 | 0 | APPROVE |
| `pr-test-analyzer` | M2, L3 | 1 LOW | APPROVE w/ comments |
| **Aggregate** | **M1, M2, L1, L3** | **1 LOW** | **APPROVE** |

## Closed findings — verification detail

**M1 — `covers`/`visited`/`visit()` tightened from bare `string` to `AppView | ModalId` — closed.**
`explore.ts:26` (`covers: readonly (AppView | ModalId)[]`), `create-store.ts:94` (`visited: Readonly<Partial<Record<AppView | ModalId, true>>>`), `:142-145` (`visit(id: AppView | ModalId)`). `type-design-analyzer` verified by direct scratch edit:
- **Typo now compile-errors:** `covers: ['immport']` → `error TS2820: Type '"immport"' is not assignable to type 'AppView | ModalId'. Did you mean '"import"'?` (reverted).
- **Lead/lag survives:** a real not-yet-built `LaunchableId` (`covers: ['mediaCapture']`) still compiles at 0 errors — listing a built-but-unscreened id is still legal, as the design requires.
- **Union is exact:** `LaunchableId ⊆ AppView`, so `AppView | ModalId` is precisely what `setView`/`launch`/`openModal` can write — no gap, no dead member.
- **`Partial<Record>` sound:** `v[id] ? …` and `selectExploreStatus`'s `visited[c] === true` read `true | undefined` correctly; no consumer assumed a total record.
- **No new casts:** the commit only *removed* the `as AppView`/`as const` casts (L1); none were added back to satisfy the stricter types. `ExploreItem.id` correctly left `string` (a display/key slug, not a membership key).

**M2 — `visit()` identity-stability pinned by reference — closed.**
`store.test.ts:83-102`. `pr-test-analyzer` verified by mutation:
- Asserts `toBe` (reference), not `toEqual`, on a re-visit of a genuinely already-visited id (`'dashboard'`/`'import'` recorded immediately before capture — non-vacuous).
- Has the both-ways companion (`.not.toBe` on a new id `'ocr'`) — proving the guard does real work in both directions.
- **Red on the exact regression:** temp-rewriting `visit` to the unconditional-spread form (`({...v,[id]:true})`, guard dropped) turns exactly and only the new identity test red (`1 failed | 30 passed`). Reverted, tree clean. The shared-helper contract is now genuinely mutation-proof — no longer false coverage.

**L1 — redundant `as AppView` cast dropped** (`explore.ts:38`) — closed; orchestrator-confirmed inline (cast removed, `tsc` green).

**L3 — covers-disjointness test — closed.**
`explore.test.ts:29-34`. `pr-test-analyzer` verified it's a real cross-item check distinct from id-uniqueness: adding `'dashboard'` to the `map` item's `covers` (cross-item overlap, all `id`s still unique) turns only the disjointness test red (`expected 14 to be 15`) while the id-uniqueness test still passes. This keeps "exactly one active row" sound against a future copy/paste registry mistake.

## New finding introduced by the fixes

**LOW — the identity-pin test doesn't exercise `launch`'s re-visit branch.**
`store.test.ts:83-102` (re-visit half covers `setView`/`openModal` only) · `create-store.ts:240` (`launch`).

`pr-test-analyzer` proved the gap: inlining `launch`'s visit to bypass the shared helper (`visited: {...s.visited, [screen]: true}`, leaving `setView`/`openModal`/`visit()` untouched) leaves **all 743 tests green**. So a future caller-specific refactor of `launch` that dropped the shared `visit()` call would silently regress the render-economy contract for launch-only screens (ocr/mediaCapture/audioRecording) with no test catching it. The commit message's "pinned across all three actions" is inaccurate for the re-visit branch.

**Why LOW, not the MEDIUM the lane proposed.** `pr-test-analyzer` filed it MEDIUM, explicitly anchoring to the orchestrator's earlier re-rank of M2. Applying the same impact logic consistently pushes it lower still: `launch` *always* sets `view: screen` (`create-store.ts:240`), and `view` is a dependency of the `selectExploreStatus` memo (`DemoExperience.tsx:199-203`). So the memo recomputes on every `launch` regardless of whether `visited` keeps its reference — the identity guard saves **nothing** on the launch path (unlike `openModal`, which changes `modal`, *not* a memo dep, where the guard genuinely skips a recompute). The launch identity contract has no render-economy value to protect, so the coverage gap protects nothing observable. It's a contract-uniformity nit, not a MEDIUM.

*Fix (optional, one line):* `store.getState().launch('ocr'); const b = store.getState().visited; store.getState().launch('ocr'); expect(store.getState().visited).toBe(b)`.

## Architecture invariants — re-verified clean

- **The typo-catching guarantee moved from runtime to compile time.** The `explore.test.ts` cross-registry backstop still exists, but a bad `covers` id is now a `tsc` error *before* the test even runs — the stronger of the two.
- **Lead/lag design preserved** — the tightening constrains ids to the *recordable* union, not to *built* screens, so listing an unscreened `LaunchableId` remains legal.
- **The shared `visit()` render-economy contract is now mutation-proof** for the helper itself; only the `launch` caller-bypass path is unpinned (the new LOW).
- **`selectExploreStatus`, `ExploreChecklist`, and `DemoExperience` consumers unchanged and still typecheck** against the tightened `visited` — no downstream breakage from the `Partial<Record>`.

## Recommended next steps

**Ready for merge.** Every finding from the initial review (2 MEDIUM, 3 LOW) is closed or justifiably deferred, and the one new item is an optional one-line test with no runtime stakes. If the implementer wants a spotless record, fold the `launch` re-visit line and the deferred L2 fixture into a single trivial test commit — but neither blocks.

## Full-arc summary

| Review | Findings | Verdict |
|---|---|---|
| Initial (`pr-25-demo-explorer-m2-review.md`) | 0 HIGH · 2 MEDIUM · 3 LOW | APPROVE w/ comments |
| Fix delta (this doc) | M1/M2/L1/L3 closed · L2 deferred · 1 new LOW | **APPROVE** |

The M2 cut was sound from the initial review (no HIGH); this delta confirms the polish landed correctly and by mutation-verified proof rather than trust.

## Agent IDs
<!-- Fresh synchronous dispatch; resumable via SendMessage. -->
- type-design-analyzer: `a18aed17de984f836`
- pr-test-analyzer: `a4476b8c8de5279e8`
- typescript-reviewer: not dispatched (type-only change, casts removed, orchestrator-verified)
- silent-failure-hunter: not dispatched (no error-handling surface changed)

## Reviewer pipeline notes

- **Both lanes verified by mutation, not inspection.** `type-design-analyzer` injected a typo to confirm the compile error; `pr-test-analyzer` reverted `visit()` to confirm the identity test goes red, then went further and injected a `launch`-specific bypass to surface the residual gap. Mutation-verification is the strongest close available and it earned its keep here — the new LOW would be invisible to inspection.
- **Consistent severity calibration across the arc.** This is the third finding in the M2 line about the same render-economy optimization. The rule I've applied throughout: false-coverage of a *micro-optimization* is bounded below HIGH, and here — where `launch` always moves `view` (a memo dep) so the guard saves literally nothing — it drops to LOW. The test lane self-limited to MEDIUM citing that precedent; the orchestrator carried it one step further with the memo-dep trace the lane didn't run. Same discipline as the M4 (#24) and M2 (#25 initial) re-ranks: severity follows traced impact, and the re-rank is always surfaced with its reasoning, never silent.
- **Lane scoping, again.** A type-only + test-only commit didn't warrant four lanes. Two covered the substance; the TS-consumer soundness (casts removed, `tsc` green) and L1 were self-evident from the diff and verified inline. Skipping is correct, not under-coverage.
