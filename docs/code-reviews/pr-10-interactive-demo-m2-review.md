# PR #10 Review — interactive demo, Milestone 2 (headless engine: store + director)

- **PR:** [#10](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/10) — `feat(demo): interactive demo — Milestone 2 (headless engine: store + director)`
- **Branch:** `feat/interactive-demo-m2` → `master`
- **Reviewed:** 2026-06-27
- **Scope:** 4 commits, 16 files, **+1334 / −4** — adds `lib/demo/store/**`, `lib/demo/director/**`, the barrel exports, one selector, and the `zustand@^5` dependency. Additive on the merged M1 logic core. No UI, no `/demo` route (those are M3–M5).
- **Method:** six specialised review passes (code-review · comment-accuracy · pr-test-analyzer · silent-failure · type-design · simplification) plus manual verification of every reported finding and all build/test claims.

## Topology & validation

M1 (PR #9) is merged into `master` (merge-base = `eac34bc Merge pull request #9`); M2 is cleanly additive on top — the diff is purely the store + director.

| Gate | PR claims | Verified |
|---|---|---|
| Vitest | 172 pass / **24** files | ✅ 172 passed / **25 files** (claim off by one) |
| `tsc --noEmit` | clean | ✅ exit 0 |
| `next build` | green, output unchanged | ✅ green; no `/demo` route; existing site output identical |
| Coverage gate (`lib/**`) | stmts 97 / branches 82 / fns 98 / lines 99 | plausible; real branch holes noted below |

Findings are deduped across the six passes and filtered to **confidence ≥ 80**.

---

## 🔴 Critical

**None** — consistent with the milestone calibration used across this series: the store has **no live consumer yet** (no UI/route; the guided beats bypass the risky path). But the **disputed** finding directly below is a latent Critical and the single highest-priority item in the PR.

### ⚖️ Disputed — the `applyImport` → time-math chain

- **silent-failure-hunter:** CRITICAL. **code-reviewer:** IMPORTANT. Both are correct about different aspects; aggregated as **Important (top priority)**, surfaced here per the conflict rule.

`applyImport` writes import time-frames **verbatim** into `form.scopes` (`store/create-store.ts:356-364`). Per M1's contract those strings are **natural language** (`SAMPLE_EXTRACTION` carries `'11:45 PM on March 8 2025'`), to be normalised *before* any time math — but the store performs no normalisation. `generateExtractedScopes` (`store/create-store.ts:275-288`) then feeds each scope to `calculateCorrectedTimeRange` → `applyTimeOffset`, which **M1 made throw** on un-parseable input (`logic/time.ts:54`). Consequences:

- **Sandbox / direct store use** (shipped public API via the barrel): `applyImport()` then `generateExtractedScopes()` → **uncaught throw** out of the Zustand action.
- **Director path** (when M3 adds an import-chapter beat): the runner's `try/catch` (`director/runner.ts:102-105`) **swallows** it → `form.extractedScopes` stays empty, or **stale** from a prior run → `selectCaseNotesData` → `generateCaseNotesDoc` silently omits the "Adjusted Scope (Calculated Times)" section, with no error annotation.

It is latent **today** only because the `requestedScope` beat sets **canonical** scopes directly via a `field` step (`director/beats.ts:31-48`), bypassing `applyImport`, and no test composes the two actions. This **breaks M1's normalisation contract at the store boundary** and must be closed before M3 wires an import beat.

**Fix:** normalise import datetimes to canonical `YYYY-MM-DD HH:MM:SS` inside `applyImport` (add a `parseImportDateTime` helper in `logic/import.ts`), **or** guard per-entry in `generateExtractedScopes` (wrap each `calculateCorrectedTimeRange` in try/catch; skip/mark bad entries rather than letting `.map()` abort — this also fixes the related "one bad scope discards all already-computed results" sub-finding, since the throw currently abandons the whole accumulated array before `set()` fires).

---

## 🟠 Important

1. **(above) `applyImport` natural-language times break the normalisation contract** — top priority; see Disputed.

2. **Cancel mid-`launch` leaves `view` stuck on the launch screen.** `director/runner.ts:83-94` — the inner sub-beat loop does `if (cancelled) return`, which exits `applyStep` **before** `closeLaunch()` runs. After a cancel during an OCR launch beat, `store.getState().view === 'ocr'` and `launchReturnView` is stale; any UI reading `view` after cancel sees the wrong screen. Latent until a "stop/skip tour" affordance is wired to `BeatHandle.cancel()` (M3+), but it is a real state-corruption bug.
   - **Fix:** `store.getState().launch(...)`, then `try { …inner loop with `break` (not `return`)… } finally { store.getState().closeLaunch() }`. Add a cancel-mid-launch test (sub-beat with a `wait`, cancel, assert `view` restored).

3. **`setPath` "tolerant no-op" is a misnomer *and* a silent footgun** (`store/helpers.ts:3-24`; cross-lane: comments + silent-failure + type-design). It does **not** no-op a stray path — it **writes a junk key**: `updateField('form.scpoes', v)` creates `form.scpoes` and leaves `form.scopes` untouched, with no error or warning. Every beat path flows through the untyped `updateField(path: string)`, so a single-character typo silently writes forensic form data to an orphaned property the PDF mapper never reads. The docblock also misattributes resilience — the real safety net is the runner's `catch`, not `setPath` (which never throws but also never suppresses the write).
   - **Fix:** correct the comment ("writes to the stray key" — not "no-op"); add a dev-mode `console.warn` in `setPath` when it creates a previously-absent leaf key; consider a typed-path union (Important type-design item below).

4. **Real branch-coverage holes behind the 82% gate** (pr-test-analyzer):
   - **`reset()` is tested only one direction.** The test starts from seed-only data, so `filter((c) => !c.isSeed)` empties the arrays regardless of correctness — **user-data preservation is never asserted**. The "seed and user data never mix" guard is the PR's headline claim; a regression that cleared everything would still pass. Add: seed + create a user case/location (`isSeed:false`), `reset()`, assert the user records survive.
   - **`generateExtractedScopes` offset-sign:** only the `(isActualTime=true, DVR-ahead)` quadrant is tested in the store; the DVR-**behind** direction (where the sign matters most for forensic timestamps) is untested.
   - **Untested guard branches:** `generateExtractedScopes` `!loc.form.timeOffset` (every fixture has a timeOffset); `applyImport` empty-`timeFrames` fallback (every fixture has one frame); `reset()` `mode`/`view` fields unasserted.
   - **Director:** cancel-mid-`type` and cancel-mid-`launch` (ties to #2); the `if (sub)` false branch (`mediaCapture`/`audioRecording` have no beat); the double-`launch` ternary (`launchReturnView` preserved when already on a launchable).

5. **Type design — two loosely-typed boundaries** (type-design):
   - `updateField(path: string, value: unknown)` has no structural link to `DemoLocation`/`CaptureState` (root cause of #3). A typed `FieldUpdate` discriminated union (path → value type) turns beat-path typos into compile errors; `setPath` can stay string-based internally behind one marked cast.
   - **`call`/`tap` step args are unchecked.** `callAction` casts to `(...a: unknown[]) => unknown`, so `{ kind: 'call', action: 'createCase', args: [42] }` type-checks. Distribute the step type over `DemoActions` with `Parameters<DemoActions[K]>` so beat authors get arg-type checking at the definition site. Contained today (only zero-arg actions are invoked this way), latent for any future arg-bearing beat.

---

## 🟡 Advisory

- **Director `done` never rejects / no degraded signal** (silent-failure H2). `resolveDone()` is called unconditionally (`runner.ts:113`) regardless of how many steps threw and were swallowed; `BeatHandle.done: Promise<void>` carries no failure/`skippedCount`. A beat that silently skipped `calculateOffset`/`generateExtractedScopes`/`generateNotes` is indistinguishable from a clean run to an `await done` orchestrator — this is what makes Finding 1's failure invisible. Expose a `degraded: boolean` / `warnings: Error[]` on the handle.
- **Resilience test doesn't confirm the catch fired** (`director/__tests__/runner.test.ts`). The skip-on-throw test is structurally valid (the M1 math really throws), but without a `vi.spyOn(console, 'warn')` assertion a future change that swallows differently still passes.
- **Type design (Advisory):** `view`/`launchReturnView` correlated invariant is unmodeled — `{ view: 'ocr', launchReturnView: null }` is representable and the `?? 'submission'` fallback masks it; model a discriminated `NavState`. `CaptureState` hand-duplicates the input fields of `TimeOffsetData` (`calculateOffset` copies field-by-field, with a `method`/`captureMethod` rename trap); extract a shared `TimeOffsetInput`. `BeatStep.set: Partial<DemoState>` is too wide (admits `cases`/`locations` mutations that bypass the `isSeed` invariants); narrow to `Pick<DemoState, 'auth' | 'mode'>`.
- **Simplification (behavior-preserving):** extract `patchCurrentLocation(updater)` to remove the `get id → if(!id) return → set(map)` boilerplate repeated across 6 actions; drop the hand-built `diff` object in `generateExtractedScopes` (`TimeOffsetData` is structurally a `TimeDifference` superset — pass `off` directly); merge the redundant `waiters`/`cancels` Sets in the runner; extract `formatAddress(loc)` (duplicated in `generateNotes` and `selectCaseNotesData`).
- **Comment / PR accuracy:** PR body **"24 files" → 25**; `lib/demo/index.ts` docblock "Milestone 2 **will** add the store…" is now present-tense; `lib/demo/__tests__/barrel.test.ts` "what Milestone 2 **will** consume" is stale.

---

## Architecture invariants checked & confirmed

- **The headless engine works end-to-end:** the `engine-flow` integration test plays the whole guided tour under fake timers and asserts **real output** — the generated Case Notes PDF actually contains the occurrence number `PR25-0098213` and "Extraction Scope" — not merely that functions ran. Strongest test in the suite.
- **Zustand v5 vanilla used correctly:** single producer per `set`, no in-place mutation, `structuredClone` on the seed constants so the shared seed cannot be corrupted. `switchLocation` unknown-id guard is tested and asserts no state change.
- The seed/user separation **logic** is correct (`seedGuided` loads `isSeed` seed; `reset` filters `!isSeed`) — it is only under-tested in one direction (Important #4).
- Beats are correctly declarative (no runtime store imports); the runner's "never throws into React" claim holds; `zustand@^5` is properly declared in `dependencies`; the offset/scope/notes assembly calls the real M1 `logic/time` functions.

---

## Recommended next steps

**Decision: REVISE.** Strong, well-tested engine with a green build — but a handful of foundational issues to close before M3 builds UI on top, in priority order:

1. **Normalise import times** (Finding 1) + add per-entry isolation in `generateExtractedScopes`. This is the integration bomb and the one that breaks M1's contract — do it first.
2. **`try/finally` the launch sub-beat** (Finding 2) so cancel restores `view`.
3. **Fix the `setPath` comment + add a dev-mode warn** (Finding 3).
4. **Close the test holes** — `reset()` both directions, the DVR-behind offset sign, and the untested guard branches.

The type-safety hardening (typed `updateField` paths, `Parameters<>`-checked beat args, the `NavState`/`TimeOffsetInput` models) and the four simplifications are worth folding in as M3 lands but do not block this merge.

## Reviewer pipeline notes

- **Cross-lane independent identification was the strongest signal:** four lanes (code-review, silent-failure, pr-test-analyzer, type-design) converged on the `applyImport` → unnormalised-times → throwing-math chain from different angles (integration contract, swallowed error, untested composition, stringly-typed boundary). That convergence is why it leads the report despite no live caller today.
- **The genuine severity dispute (Critical vs Important on Finding 1) was productive:** silent-failure's "swallowed → silent/stale forensic PDF" and code-review's "no current beat composes them" together place it correctly — a latent Critical, ranked Important now, with a hard gate before M3.
- **`setPath`'s comment was caught by the comments lane while its behavior was caught by silent-failure and type-design** — same root, three lenses; merged into one Important finding.
