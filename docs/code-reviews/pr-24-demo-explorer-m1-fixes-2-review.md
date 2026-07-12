# PR 24 — Fix Delta Review #2

**PR:** [#24](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/24) — Demo Explorer M1 — delete the guided tour: sandbox-only, hands-on demo
**Scope:** One commit — `0945fd8`, the fix for the HIGH (H2) raised in the first fix-delta (`pr-24-demo-explorer-m1-fixes-review.md`).
**Reviewers (fresh synchronous dispatch, scoped to the two lanes the commit touches):** `silent-failure-hunter`, `pr-test-analyzer`
**Lanes skipped:** `typescript-reviewer`, `type-design-analyzer` — the only type change is `applySuccess: Promise<string>` → `Promise<string | null>` + a `myGen: number` param; verified by the orchestrator (all call sites handle it, `tsc` clean) rather than spending two lanes on a trivial signature change.
**Date:** 2026-07-10

> **For the implementing instance:** This document is self-contained.

## Verdict

**APPROVE.**

The one open finding from the first delta — H2, the unguarded `await forwardGeocode(...)` inside `applySuccess` — is cleanly closed, and no new window was opened. Both lanes verified empirically: `pr-test-analyzer` reverted the production code and confirmed the new regression test goes red for exactly the right reason; `silent-failure-hunter` walked every `await` boundary in the touched functions and found no remaining unguarded store mutation. The PR is ready to merge.

## Pre-flight gates (re-verified after fix)

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit -p tsconfig.json` | **0 errors** |
| `pnpm exec vitest run` | **106 files / 722 tests pass** (was 721; +1 = the H2 regression test) |
| `pnpm lint` | Not runnable (no ESLint config). Pre-existing. |

## Fix commit → finding mapping

| Commit | Closes | Verified |
|---|---|---|
| `0945fd8` | **H2** — token re-check after the geocode await in `applySuccess`; both runners re-check before `finishImport` | ✅ closed (empirically red-verified against pre-fix code) |

## Closed finding — verification detail

**H2 — cancel/interleave during `applySuccess`'s geocode await no longer writes to the store.**
`features/demo/ui/DemoExperience.tsx:313-327` (`applySuccess`), `:337` (`recordSuccess` null-bail), `:389` / `:411` (runner pre-`finishImport` re-checks).

The fix threads the run's `myGen` into `applySuccess` and re-checks `if (importGen.current !== myGen) return null` immediately after `await forwardGeocode(...)`, before any store write. `recordSuccess` bails on the `null` return (tally untouched). Both runners re-check the token after the loop/await, before `finishImport`, so an invalidated run can't overwrite a newer run's result screen.

`silent-failure-hunter` confirmed, point by point:
1. **Single-run phantom closed** — a cancel during the geocode await returns `null`; nothing reaches `addLocation`/`applyImport`. `onCancel` bumps `importGen` synchronously before the modal closes, so the guard is live the instant cancel fires.
2. **Two-interleaved-runs contamination closed** — `addLocation` (`create-store.ts:194`) sets `currentLocationId` synchronously and is immediately followed by `applyImport` (`:329` reads it) with **no await between them**, so a stale run's `applyImport` can't land on a concurrent run's location: the stale run's `:320` re-check fails before its `addLocation` even runs. `importGen` only increments (never resets/reuses), so no token-aliasing.
3. **`finishImport` guarded** — both runners' pre-`finishImport` re-checks (`:389`, `:411`) are immediately followed by `finishImport` with no intervening await; an invalidated run can't reach `setImp(... stage:'result' ...)`.
4. **No new window** — every `await` boundary in `applySuccess` / `recordSuccess` / both runners was walked; each is immediately followed by either a token re-check or a purely synchronous / run-local operation. No unguarded gap remains.

**Regression test — genuinely pins the H2 window** (`DemoExperience.sandbox.test.tsx`, "a cancel landing during the geocode round-trip still discards the run"). `pr-test-analyzer` confirmed:
- The patch carries a real address (`streetAddress`/`city`), so `buildGeocodeQuery` (real, unmocked) returns non-null and `applySuccess` genuinely reaches `await forwardGeocode(query)`; `forwardGeocodeMock` is a held, externally-resolved promise, so the await truly parks.
- The `await act(async () => {})` flush parks execution *inside* the geocode await (there's no other await between `runPdfImport` resolving and `forwardGeocode` being called), and only then does Close fire `onCancel` → `importGen.current++`. Not a no-op-before-start pass, not a trivially-true-after-write pass.
- It exercises a **different branch** than the H1 test: H1's empty-address `okRun()` makes `buildGeocodeQuery` null and is caught by the pre-geocode loop checkpoint (`:385`); H2's real-address patch reaches the new post-await check (`:320`).
- **Empirically red against pre-fix code:** temp-reverting `applySuccess` to `0945fd8^` yields `AssertionError: expected 1 to be +0` at the assertion; restored byte-identical afterward (`git status` clean), full file re-ran 29/29 green.

## Reviewer verdicts at a glance

| Agent | Open findings | Verdict |
|---|---|---|
| `silent-failure-hunter` | 0 | APPROVE |
| `pr-test-analyzer` | 0 | APPROVE |
| **Aggregate** | **0** | **APPROVE** |

## Recommended next steps

**Ready for merge.** All initial-review findings (1 HIGH, 4 MEDIUM, 4 LOW), the first-delta residual HIGH (H2), and one justified deferral (L3) are resolved or closed. The only standing item is the optional `live: boolean` LOW (honest-but-vestigial test seam) — cleanup, not a blocker.

## Full-arc summary (three reviews)

| Review | Findings | Verdict |
|---|---|---|
| Initial (`pr-24-demo-explorer-m1-review.md`) | 1 HIGH · 4 MEDIUM · 4 LOW | REVISE |
| Fix delta #1 (`pr-24-demo-explorer-m1-fixes-review.md`) | 9/9 closed · 1 new HIGH (H2) · 1 deferral-justified | REVISE |
| Fix delta #2 (this doc) | H2 closed · 0 open | **APPROVE** |

The teardown was clean from the start; every finding across the arc was a corner of the import surface's async/attribution behavior — the one genuinely stateful part of an otherwise deletion-heavy PR. The pipeline converged in two fix cycles with no thrash: each REVISE named a concrete, cheap fix, and each fix was empirically verified rather than trusted.

## Agent IDs
<!-- Fresh synchronous dispatch; resumable via SendMessage for any further --fix-delta. -->
- silent-failure-hunter: `a8bf8554cd5454896`
- pr-test-analyzer: `a4e028e1bdda3f821`
- typescript-reviewer: not dispatched (trivial signature change, orchestrator-verified)
- type-design-analyzer: not dispatched (no type-design surface changed)

## Reviewer pipeline notes

- **Lane scoping paid off.** A one-commit, one-finding delta doesn't warrant a four-lane fan-out. Two lanes covered the entire risk surface (async correctness + does the new test catch the regression); the type change was small enough to verify inline. Auto-skipping the two type lanes is the same discipline as skipping `typescript-reviewer` when no production TS changes — skipping is correct, not under-coverage.
- **Both lanes red-verified rather than traced.** `pr-test-analyzer` temp-reverted `applySuccess` and observed the exact failure (`expected 1 to be +0`); `silent-failure-hunter` walked every await boundary rather than trusting the commit message. This is the strongest close available: the fix is proven to be what stands between green and red.
- **The "push past the stated fix" discipline found nothing this time — and that's the right outcome.** The same instruction that surfaced H2 in delta #1 was applied again here; the honest result is a clean bill, not a manufactured finding. Zero new findings after an adversarial pass is a valid, meaningful APPROVE.
