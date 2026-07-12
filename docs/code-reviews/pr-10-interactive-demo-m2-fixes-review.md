# PR #10 — Fix Delta Review

- **PR:** [#10](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/10) — `feat(demo): interactive demo — Milestone 2 (headless engine: store + director)`
- **Branch:** `feat/interactive-demo-m2` → `master`
- **Scope:** Fix delta only — re-review of the **5 commits** landed in response to the initial review (`pr-10-interactive-demo-m2-review.md`), range `4a01099..96f2089` (11 files, +299 / −45).
- **Reviewers (the same six resumed via `SendMessage`, original-finding context intact):** code-review · comment-accuracy · pr-test-analyzer · silent-failure · type-design · simplification
- **Date:** 2026-06-27

> **For the implementing instance:** This document is self-contained. You do not need to reread `pr-10-interactive-demo-m2-review.md`.

---

## Verdict

**REVISE.**

A strong, disciplined fix delta: **four of the five Important findings are substantively closed** (cancel-mid-launch, `setPath`, the test holes, the `BeatStep.set` narrowing), the degraded-signal advisory is closed, the deferred type-safety items are logged in `deferred.md` with a concrete M3 trigger, and **+19 non-vacuous tests** landed. Build is green.

But the #1 fix **relocated** its silent failure rather than closing it — and **two lanes independently flagged the same root cause** (the empty `catch {}` in `generateExtractedScopes`). That, plus a still-silent `calculateOffset` empty-input path that isn't deferred, keeps this at REVISE. All remaining items are small (a `console.warn` + a surfaced flag, one deferral note, two doc edits).

---

## Pre-flight gates (re-verified on the fixed branch)

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ clean (exit 0) |
| `pnpm test` | ✅ 191 passed / 26 files (was 172/25 — **+19** tests, **+1** file `helpers.test.ts`) |
| `next build` | ✅ green; no `/demo` route; existing site output unchanged |

---

## Disputed → resolved

**Finding #1 — `applyImport` → un-normalised times → `generateExtractedScopes`.**
- **silent-failure:** RELOCATED / residual. **code-review:** partially closed (residual Advisory). **pr-test-analyzer:** the fix makes the `!timeOffset` guard test vacuous.

**Resolution → REVISE.** All three describe the same thing from different lenses. The fix (`c77d86c`) rewrote `generateExtractedScopes` from a `.map()` (one throw abandoned all scopes and escaped the action) to a `for` loop with a per-entry `try { … } catch {}`. That genuinely closes two sub-problems: the **uncaught throw** is gone, and the **stale-scope variant is gone** (the unconditional `set()` now writes `[]`, so output is silently *blank*, not silently *wrong*). What remains is a new failure mode: the `catch {}` is **empty** — no `console.warn`, no flag, no count — so a non-canonical scope is **silently dropped** from `extractedScopes`. Because the catch lives **inside** the store action, the new `degraded`/`warnings` signal (the #H2 fix) structurally **cannot see it**: a guided run that hits import-phase free-text scopes reports `degraded=false`, `warnings=[]`, and emits a forensic PDF whose "Adjusted Scope" section is silently absent while the requested-scope section still shows the raw natural-language string. Latent today (the guided beats use canonical datetimes; no beat composes `applyImport`→`generateExtractedScopes`), but it must be closed before sandbox mode is user-reachable in M3.

---

## Fix commit → original finding mapping

| Commit | Original finding | Lane(s) | Verdict |
|---|---|---|---|
| `c77d86c` | #1 `generateExtractedScopes` throw/discard-all | code-review · silent-failure · tests | **Partial** — throw + discard-all closed; empty-`catch {}` silent-drop residual |
| `c77d86c` | simplification #2 (drop `diff` intermediary) | simplification | **Closed** (passes `off` directly) |
| `c95b308` | #2 cancel mid-`launch` leaves `view` stuck | code-review · tests | **Closed** (`try/finally` + `break`) |
| `c95b308` | Advisory: director `done` no degraded signal | silent-failure · tests | **Closed** (`warnings[]` + `degraded`) |
| `61e439c` | #3 `setPath` misnomer + silent footgun | code-review · comments · silent-failure · type-design | **Closed** (comment + dev-warn) |
| `bf97e64` | #4 test holes (reset both-dir, offset-sign, guard branches) | pr-test-analyzer | **Closed** (non-vacuous) |
| `96f2089` | type-design #5 `BeatStep.set` too wide | type-design | **Closed** (`Pick<'auth'|'mode'>`) |
| `96f2089` | comment staleness (`index.ts`, `barrel.test.ts`) | comments | **Closed** |

---

## Reviewer verdicts at a glance (fix delta)

| Lane | Verdict | Residuals |
|---|---|---|
| code-review | **REVISE** | #1 empty-catch silent drop (Advisory residual) |
| silent-failure | **REVISE** | C1 relocated/residual; M1 `calculateOffset` empty-input path still silent + **not deferred** |
| pr-test-analyzer | **APPROVE w/ notes** | C1 guard test vacuous; I4 no-beat-launch test doesn't assert `degraded` |
| type-design | **APPROVE** | #5 closed; #1/#2 deferral-justified; `deferred.md` label nit |
| comment-accuracy | **APPROVE w/ note** | PR-body count still wrong (26/191, says 24/172) |
| code-simplifier | **APPROVE** | #1/#3/#4 open optional; **no new debt** |

---

## Closed findings — verification detail

- **#2 cancel mid-`launch`** (`c95b308`) — `runner.ts` `launch` case now `try { …loop with break… } finally { closeLaunch() }`; `break` (not `return`) lets `finally` run. The new test advances into the sub-beat's 500ms wait, cancels, and asserts `view === 'timeOffset'` (was `'ocr'`) — a genuine regression guard. The injectable `beats?: BeatMap` seam makes it deterministic and is cleanly typed (no `any`).
- **#3 `setPath`** (`61e439c`) — docblock corrected ("a stray path is NOT a no-op — it writes to the new key"; resilience correctly attributed to the runner's catch); dev-mode `console.warn` fires when the leaf key was previously absent; `helpers.test.ts` pins both the write and the warn condition (and covers the previously-uncovered array-intermediate branch).
- **#4 test holes** (`bf97e64`) — all non-vacuous: `reset()` both directions (user data survives + seed gone — fails if the filter cleared everything); `reset()` mode/view; the DVR-**behind** offset sign with arithmetic independently re-verified (`23:45:00 − 5:00 → 23:40:00`, `01:30:00 − 5:00 → 01:25:00`); the double-`launch` ternary; `applyImport` empty-`timeFrames` fallback.
- **#5 `BeatStep.set`** (`96f2089`) — narrowed to `Partial<Pick<DemoState, 'auth' | 'mode'>>`; the only live `set` usage (`{ auth: 'authorized' }`) still type-checks; structural state (`cases`/`locations`) is now unreachable from a beat, so the `isSeed` invariants can't be bypassed.
- **H2 degraded signal** (`c95b308`) — `BeatHandle.warnings: Error[]` + `degraded: boolean` (read-only getters); the runner's catch records each swallowed error; two tests pin the degraded path (`warnings.length===1`) and the clean path (`===0`). Per-scope isolation (#C2) confirmed: one bad scope no longer discards the good ones.
- **Comments** (`96f2089`/`61e439c`) — `index.ts` and `barrel.test.ts` "will" comments now present-tense (and the barrel test was extended to assert M2 exports); every new comment introduced by the fixes was verified accurate.
- **Simplification #2** (`c77d86c`) — `generateExtractedScopes` passes `off` directly (`TimeOffsetData` ⊃ `TimeDifference`); behavior preserved.

---

## Deferral justifications — verification detail

Assessed against the rubric (specific finding + rationale + concrete trigger). `docs/code-reviews/deferred.md` §5 logs all of them with an **M3** trigger:

- **type-design #1 (typed `updateField` path)** — *justified.* Interim runtime dev-warn is in place; the structural `FieldUpdate` union is logged with a clear M3 trigger. (Minor: the log entry is mislabeled "(review #3)" — should be "(review #1)".)
- **type-design #2 (arg-checked beat actions)** — *justified.* Verified latent: every current `call`/`tap` action is zero-arg, no beat passes `args`; the trigger ("M3 writes an arg-bearing beat") is exactly when it bites.
- **type-design #3 `NavState`, #4 `TimeOffsetInput`, and simplification #1/#3/#4** — *justified*, all logged, behavior-preserving, M3 trigger.

---

## Still-open — address for this REVISE

1. **The empty `catch {}` in `generateExtractedScopes`** (`store/create-store.ts`, the per-scope loop). Root cause behind **silent-failure C1-residual** *and* **pr-test-analyzer's vacuous guard test** — two lanes, same spot. Add a `console.warn` (match the director pattern) and surface the partial state so the PDF layer and/or the runner `degraded` signal can see a dropped scope. A `LocationForm.extractedScopesPartial: boolean` (or a sentinel row) lets `selectCaseNotesData` annotate the absent Adjusted Scope section instead of silently omitting it.
2. **`calculateOffset` empty-input path** (`store/create-store.ts:242`, `if (!dvrDateTime || !actualDateTime) return`). silent-failure: the malformed-string sub-path is now signaled via H2, but the **empty-string** sub-path returns silently and is **not** in `deferred.md`. Either surface a signal or add a deferral entry with a trigger.

## Housekeeping (cheap)

3. **PR body count** → "**26 files / 191 tests**" (currently "24 files / 172 tests" — wrong on both, per comment-accuracy).
4. **`deferred.md` §5** — relabel the typed-`updateField` entry "(review #3)" → "(review #1)".
5. *(Optional test hardening)* add `expect(h.degraded).toBe(false)` / `expect(h.warnings).toHaveLength(0)` to the "launch screen with no beat" test so the `if (sub)` guard becomes verifiable (today a missing guard would be swallowed and the test would still pass).

---

## New findings introduced by the fixes

- **Two new *advisory* test gaps, both rooted in the broad per-scope `catch {}`** (pr-test-analyzer): the `!timeOffset` guard test is vacuous (the catch absorbs the null-offset `TypeError`), and the no-beat-`launch` test doesn't assert `degraded`. Both close once the empty catch is given a signal (item #1 above) and the two `degraded` assertions are added.
- **No logic regressions** — simplification confirms the five commits add no new duplication/complexity; all 191 tests green; `tsc` clean.

---

## Architecture invariants — re-verified clean

- Cancel now restores `view` deterministically (`try/finally`); the director exposes an observable degraded signal; beats can no longer bypass the `isSeed` invariants via `set`.
- Per-scope isolation means a bad import scope no longer crashes the action or discards the good scopes — output is blank, not wrong.
- Zustand v5 usage, `structuredClone` seed isolation, and the real-M1-logic call chain remain intact; deferral hygiene (`deferred.md` §5) is exemplary.

## Reviewer pipeline notes

- **Cross-lane independent identification was the decisive signal:** silent-failure (silent drop) and pr-test-analyzer (vacuous guard test) reached the same empty `catch {}` from opposite directions — bug-hunting vs. test-quality. When two unrelated lenses land on one line, it's real.
- **The severity dispute resolved cleanly to REVISE:** code-review and silent-failure agreed the throw is gone (not BLOCK) but the silent-drop is a genuine forensic residual (not APPROVE). The "no live caller in the guided tour" fact kept it Advisory-residual rather than escalating.
- **silent-failure surfaced a finding the brief didn't pre-map** (M1 empty-input path not deferred) — exactly the kind of gap a resumed, context-preserving reviewer catches that a fresh one might not.
