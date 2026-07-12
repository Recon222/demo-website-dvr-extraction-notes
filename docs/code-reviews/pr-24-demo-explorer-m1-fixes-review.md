# PR 24 — Fix Delta Review

**PR:** [#24](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/24) — Demo Explorer M1 — delete the guided tour: sandbox-only, hands-on demo
**Scope:** Fix delta only — re-review of the 4 commits landed in response to the initial review (`pr-24-demo-explorer-m1-review.md`).
**Reviewers (fresh synchronous dispatch — no teams; resumable agent IDs recorded below):** `typescript-reviewer`, `pr-test-analyzer`, `silent-failure-hunter`, `type-design-analyzer`
**Date:** 2026-07-10

> **For the implementing instance:** This document is self-contained. You do not need to reread `pr-24-demo-explorer-m1-review.md`.

## Verdict

**REVISE.**

Every one of the initial review's 9 findings (1 HIGH, 4 MEDIUM, 4 LOW) is **cleanly closed** — verified, in the two cases that mattered, by reverting the production code and watching the new tests go red for the right reason. The fix quality is high: the H1 token fix is correct, the M4 test now genuinely fails a leaky reset, the M2 exhaustive switch is a compile-time invariant, and the per-card sample badge is honestly attributed.

But pushing past the original H1 finding — as the initial review's own pipeline notes instructed ("reviewers verify findings; orchestrators should verify fixes") — surfaced **one new HIGH in the same code path**: the generation-token guard stops at the batch-loop boundary, and `applySuccess`'s own `await forwardGeocode(...)` is unguarded, so a cancel (or a concurrent run) landing during the geocode round-trip still writes to the store. It is the same "phantom location + cross-run contamination" failure class H1 named, reopened through a narrower door. The window is smaller than the 30s model window the fix closed, but the failure mode is identical and the fix is two lines mirroring a guard already used ten lines up.

One HIGH → REVISE. This is a single mechanical follow-up, not a re-architecture.

## Pre-flight gates (re-verified after fixes)

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit -p tsconfig.json` | **0 errors** |
| `pnpm exec vitest run` | **106 files / 721 tests pass** (was 715; +6 from the fix commits) |
| `pnpm lint` | Not runnable (no ESLint config; interactive prompt). Pre-existing. |

## Fix commit → original finding mapping

| Commit | Closes | Verified |
|---|---|---|
| `5ea3766` | **H1** — per-run `importGen` token, all 4 sites + regression test | ✅ closed (empirically — test goes red on the pre-fix code) |
| `a8db1f7` | **M4** — `reset()` test dirties + asserts `capture` & `modal` | ✅ closed (empirically — fails a `capture`-leak reset) |
| `49c2617` | **M1** per-card `isSample` badge · **M2** exhaustive `switch`+`never`, `'guided'`→`'sample'` · **M3** extract-client breadcrumbs · **L2** geocode breadcrumb | ✅ all closed |
| `f1bbe18` | **L1** 4 stale comments · **L4** test name | ✅ closed |
| *(none)* | **L3** — SplashScreen dead `authState` states | ⏸ deferral-justified |

## Reviewer verdicts at a glance (fix delta)

| Agent | Closed | New | Verdict |
|---|---|---|---|
| `silent-failure-hunter` | 5/5 (H1, M1, M2, M3, L2) | **1 HIGH** | REVISE |
| `pr-test-analyzer` | 1/1 (M4) + 2 new-test audits | 0 | APPROVE |
| `typescript-reviewer` | 2/2 (L1, L4) + M2 type-shape | 0 | APPROVE |
| `type-design-analyzer` | 1/1 (M2) + L3 deferral | 0 (L3 vestigial `live:boolean` stays LOW, acceptable) | APPROVE |
| **Aggregate** | **9/9** | **1 HIGH** | **REVISE** |

## New findings introduced by / left by the fixes

**H2 (new) — The H1 token guard is incomplete: `applySuccess` mutates the store after an unguarded `await`, so a cancel during geocode still writes a phantom (and can cross-contaminate concurrent runs).**
`features/demo/ui/DemoExperience.tsx:311-320` (`applySuccess`), reached from the guarded loop at `:377-378` and `:398-400`.

```js
const applySuccess = async (caseId, res) => {
  const query = buildGeocodeQuery(res.patch.streetAddress, res.patch.city, res.patch.businessName)
  const coords = query ? await forwardGeocode(query) : null   // ← network await, no token captured/re-checked
  const id = store.getState().addLocation(caseId, { ... })     // ← unconditional mutation
  store.getState().applyImport(res.patch)                      // ← writes onto get().currentLocationId
  return id
}
```

The batch checkpoint (`if (importGen.current !== myGen) return`) fires **before** `recordSuccess` → `applySuccess`, not inside it. Once `applySuccess` is entered, nothing re-checks the token across the geocode round-trip.

*Failure scenario (single run — the reachable one):* Visitor imports a PDF whose extracted patch has a street address + city (an ordinary successful extraction, not an edge case). Checkpoint at `:377` passes; `applySuccess` starts `await forwardGeocode(query)` — a live Mapbox call with no `AbortController` and no enforced timeout (`geocode.ts:32`). Mid-await, the visitor clicks Cancel (`:701`, `importGen.current++`) and the modal closes. When the geocode resolves, `applySuccess` writes `addLocation` + `applyImport` unconditionally. The visitor clicked Cancel, saw the modal close, believes nothing happened — a location card from the cancelled document appears in the case anyway (with a real map pin if the geocode succeeded).

*Escalation (two interleaved runs — verified against store internals, narrower):* `addLocation` (`create-store.ts:335`) sets `currentLocationId = id`; `applyImport` (`:329`) writes the patch onto `get().currentLocationId`. If a stale run A and a new run B are both past their geocode awaits: `A.addLocation`→`current=locA`, `B.addLocation`→`current=locB`, then `A.applyImport`→ writes **A's document fields (requester, business, DVR credentials) onto locB**. Cross-document contamination, not just a phantom.

*Why HIGH, not MEDIUM:* narrower window than the original H1 (only when `buildGeocodeQuery` returns non-null, only during the geocode call), but the failure mode is identical — a phantom/contaminated location with no user-visible signal — in a demo whose entire credibility premise is "it never fills itself." The `applyImport`-onto-shared-`currentLocationId` path is arguably worse than the original phantom. And the fix is trivial and already patterned in-file.

*Not covered by the H1 regression test.* `silent-failure-hunter` and the orchestrator both confirmed: the test's `okRun()` default has empty `streetAddress`/`city`, so `buildGeocodeQuery` returns `null`, `forwardGeocode` is never awaited, and this path is never exercised. The test correctly pins the loop-boundary race it targets; it does not reach the `applySuccess` interior.

*Fix (≈3 lines, mirrors the existing guard):*
```js
const applySuccess = async (caseId, res, myGen) => {
  const query = buildGeocodeQuery(...)
  const coords = query ? await forwardGeocode(query) : null
  if (importGen.current !== myGen) return null   // ← re-check after the await
  const id = store.getState().addLocation(...)
  store.getState().applyImport(res.patch)
  return id
}
```
Thread `myGen` from the caller; have `recordSuccess` skip the tally push when `applySuccess` returns `null`. Add a regression test whose mocked patch carries an address and whose `forwardGeocodeMock` is held open, landing the cancel inside the geocode await.

## Closed findings — verification detail

**H1 — per-run generation token — closed.** `importCancelled` boolean → `importGen` counter (`DemoExperience.tsx:181`). Each run captures `myGen = ++importGen.current`; both loop checkpoints compare `importGen.current !== myGen`; `onCancel` bumps (`:701`); `onRetry`'s untokened clear was **deleted**, not left as dead code. The counter re-invalidates unconditionally — a newer run's start bumps the same counter the stale run compares against, so the stale run fails its check no matter who bumped. `pr-test-analyzer` reverted to the pre-fix code and confirmed the regression test (`DemoExperience.sandbox.test.tsx`, "per-run token") goes red (`expected 1 to be +0`) for exactly the right reason, and is non-vacuous (run A genuinely in-flight on an unresolved mock promise at cancel time). *Scope caveat: closed for the loop-boundary race; see H2 for the residual `applySuccess` window.*

**M4 — `reset()` contract test — closed.** Dirtying block now adds `openModal('newCase')` + two `capture` writes; assertions add `expect(s.modal).toBeNull()` and `expect(s.capture).toEqual(blankCapture())` (`store.test.ts:29-52`). `pr-test-analyzer` empirically confirmed: patching `reset` to the exact leaky hypothetical from the initial finding — `set((s) => ({ ...initialState(), capture: s.capture }))` — now turns the test red at the `capture` assertion; a `modal`-leak variant fails at the `modal` assertion. All 9 mutable keys covered; `profile` correctly excluded (no setter).

**M1 — per-card sample attribution — closed.** `fallbackMode` threaded per-file (`res.fallbackMode` at `:341`) into `buildImportedLocationView`, which sets `isSample: fallbackMode !== 'none'` (`importResultData.ts:104`); `ImportResultAccordion.tsx:40-44` badges only when `view.isSample`. The mixed-batch test (live `real.pdf` + errored `fell-back.pdf`) asserts `getAllByText('Sample data').toHaveLength(1)` — the correct trap-avoidance assertion (an all-badged or zero-badged render fails it), and each result carries its own independent `fallbackMode`, not a shared flag.

**M2 — exhaustive `fallbackNotice` — closed.** `switch` over all four variants with `default: { const exhaustive: never = mode; return exhaustive }` (`DemoExperience.tsx:288-303`). Both `typescript-reviewer` and `type-design-analyzer` independently added a 5th synthetic `FallbackMode` variant to a scratch copy and confirmed `tsc` fails at `const exhaustive: never = mode` — a load-bearing compile-time invariant, not decoration. Only `'none'` renders no notice (correct). The `'guided'`→`'sample'` rename is total (grep: zero surviving `'guided'` `FallbackMode` literals; `run-import.test.ts` updated).

**M3 / L2 — operator breadcrumbs — closed.** `extract-client.ts` warns on unreachable (`:32`), non-503 HTTP (`:28`), and malformed-200 (`:21`); 503 stays silent by design. `geocode.ts:39-44` warns in the soft-fail catch, still returns `null` (non-blocking contract preserved).

**L1 / L4 — stale comments + test name — closed.** All four L1 sites corrected (`demo.css:1-5`, `useTypewriter.ts:3-6`, `seed.ts:28`, `run-import.ts` header + `FallbackMode` doc); `motion.test.ts:29` renamed `TOUR_CHAPTERS`→`CHAPTERS`. `typescript-reviewer` confirmed no new staleness introduced.

## Deferral justifications — verification detail

**L3 — SplashScreen `AuthState` three-state with two dead branches — deferral-justified.** No fix commit touched `SplashScreen.tsx` (confirmed via `git log`). The deferral is documented with a **specific, named trigger**: `01-demo-explorer-architecture.md:85` ("`splash` chapter + screen are kept but unreachable; boot stays at `cases` until then") and `02-demo-explorer-implementation-plan.md:130` ("unreachable until the deferred video entry"). Specific rationale + concrete un-defer trigger (the splash-video entry slice) → justified per the deferral rubric. Not re-opened.

## Standing LOW (unchanged from initial read, acceptable)

**`live: boolean` on `runImport`/`runPdfImport`** — still one production value (`true`), now honestly documented as a test seam (`run-import.ts:7-8`). `type-design-analyzer`'s call: honest-but-vestigial, LOW, no re-model needed — the `FallbackMode` union already carries the "why did we fall back" distinction that matters; the boolean is just a pure-orchestrator test-injection seam. Not blocking, optional cleanup.

## Recommended next steps

1. **H2 — one commit.** Add a token re-check after the `await forwardGeocode(...)` in `applySuccess` (~3 lines), thread `myGen` from the caller, skip the tally push on invalidation, and add the address-carrying + held-geocode regression test. This is the only merge blocker.
2. Everything else is **ready**. The `live: boolean` LOW is opportunistic.

After H2 lands, this is a clean merge — the delta demonstrates the fixes were done properly (tests-first, empirically red-verified), and H2 is the same reviewer discipline catching the last corner of the same bug rather than a new class of problem.

## Agent IDs
<!-- Fresh synchronous dispatch. These IDs are resumable via SendMessage for a further --fix-delta pass (no named/background "teams" needed — a plain Agent call returns a resumable ID). -->
- typescript-reviewer: `afbccd207396ff32d`
- pr-test-analyzer: `aabf3846d9cc21a99`
- silent-failure-hunter: `a87ae8761ffae268e`
- type-design-analyzer: `ac6f0d792ef524477`

## Reviewer pipeline notes

- **The orchestrator's pre-dispatch flag became the delta's only finding.** Before dispatching, the orchestrator noted the `applySuccess` post-await window as a residual to have the silent-failure lane rule on. The lane independently confirmed it as a HIGH, and the orchestrator then verified the cross-contamination escalation against the store internals (`addLocation` sets `currentLocationId`; `applyImport` reads it). Cross-checked from two directions, not single-sourced. *A fix to a HIGH deserves the same "push past the stated finding" discipline the initial review applied to the code.*
- **Empirical red-verification, not tracing.** `pr-test-analyzer` reverted the production code for both H1 and M4 and watched the tests fail for the claimed reason, then restored (`git diff` clean). This is the strongest form of the test-quality check and it caught nothing false — the regression tests are genuine. It also confirmed the H1 test's blind spot (empty-address `okRun` → geocode never awaited), which is precisely the gap H2 lives in.
- **The type-design lane, carried by the orchestrator in the initial review, ran independently here and agreed.** Its initial-review findings (M2, L3) were orchestrator-verified because the lane errored; on the fix delta it dispatched cleanly and reached the same conclusions (M2 closed at the type-system level; L3 deferral-justified; `live:boolean` LOW). The single-sourced initial findings are now independently corroborated.
- **Fresh synchronous dispatch, resumable IDs, no teams.** All four lanes ran as plain synchronous `Agent` calls (no `name:`, no background) and each returned a resumable `agentId`. This is the correct pattern for this harness: independent execution, results returned inline, and callable-back for a subsequent `--fix-delta` — the `## Agent IDs` section is populated without the named-teammate mechanism that caused a lane to silently stall in the initial run.
