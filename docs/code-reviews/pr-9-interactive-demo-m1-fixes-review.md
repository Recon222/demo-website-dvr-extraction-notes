# PR #9 — Fix Delta Review

- **PR:** [#9](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/9) — `feat(demo): interactive demo — Milestone 1 (pure engine logic core)`
- **Branch:** `feat/interactive-demo` → `master`
- **Scope:** Fix delta only — re-review of the **8 commits** landed in response to the initial review (`pr-9-interactive-demo-m1-review.md`), range `585aa01..0207d87` (11 files, +166 / −49).
- **Reviewers (the same six resumed via `SendMessage`, original-finding context intact):** code-review · comment-accuracy · pr-test-analyzer · silent-failure-hunter · type-design-analyzer · code-simplifier
- **Date:** 2026-06-27

> **For the implementing instance:** This document is self-contained. You do not need to reread `pr-9-interactive-demo-m1-review.md`.

---

## Verdict

**REVISE.**

The fixes are strong: **all four Important findings are closed** with correct, adversarially-tested commits, and most advisories were addressed. But the re-review surfaced **three residuals the fix delta did not fully close** — one of them a HIGH-severity silent failure whose fix was applied asymmetrically. None is a current data-loss bug (Milestone 1 has no callers wiring these paths — verified), so this is **REVISE, not BLOCK**: a handful of cheap, mechanical follow-ups, the most important being ~3 lines.

---

## Pre-flight gates (re-verified on the fixed branch)

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ clean (exit 0) |
| `pnpm test` | ✅ 137 passed / 20 files (was 125 — **+12** new tests, count audited and traced per commit) |
| `next build` | ✅ green; no `/demo` route; existing site output unchanged |

---

## Disputed (surfaced per the conflict rule)

**H-2 — invalid `collectionDateTime` silently inverts the DST adjustment.**
- **silent-failure-hunter:** escalate (BLOCK) — the fix is incomplete.
- **code-reviewer:** the risk has no Milestone-1 caller; it's a Milestone-2 authoring concern.

**Resolution → REVISE.** Both are right about different things. The fail-loud guard added in `8060250` protects the *range-time* path (`applyTimeOffset` now throws on NaN), but `calculateDSTAdjustedTimeRange` reads `isInDST(collectionDateTime)` on a **separate** path that still returns `false` on unparseable input → `adjustmentApplied: +1` with no error. There is no M1 caller today, so it isn't a live bug — but the commit's stated intent was "fail loud," and leaving the collection-time path silent is an **asymmetric, incomplete fix** of exactly that intent. It's ~3 lines to make it symmetric, so close it now rather than ship a half-guarded function.

---

## Fix commit → original finding mapping

| Commit | Original finding | Lane(s) | Type | Verdict |
|---|---|---|---|---|
| `e098e0f` | #1 `ocrImageDataUrl` unescaped in `src` | code-review · silent-failure · tests | code + adversarial test | **Closed** |
| `8060250` | #2 `applyTimeOffset` emits `NaN-…` on invalid input | silent-failure (H-1) · code-review | code + tests | **Closed (range path)** |
| `8060250` | H-2 `isInDST` invalid `collectionDateTime` → wrong DST dir | silent-failure (H-2) | — | **Still open** (collection path unguarded) |
| `a8efb79` | #3 offset-direction quadrants + vacuous DST assertion | pr-test-analyzer | tests | **Closed** (arithmetic verified) |
| `eb40e5f` | #4 `SAMPLE_EXTRACTION` natural-language timestamps | code-review · comment | contract docs + test | **Closed** (Option-A sound for M1) |
| `ffbcd4c` | M-2 `timePeriodType` silent default; `getCurrentFormattedTime(0)` | silent-failure · type-design · tests | code + tests | **Closed** |
| `c2076c1` | type #1 `parseAiJson` lie · #4 `isSeed` · #5 GPS shapes | type-design · silent-failure | types | **#1/#5 closed; #4 partial; M-1 runtime still open** |
| `74574b6` | test gaps #5/#6/#8 + MODAL_NARRATION | pr-test-analyzer | tests | **Closed** |
| `0207d87` | "six formats" + "verbatim" comment claims | comment-accuracy | comments | **ocr.ts closed; narration.ts still open** |

---

## Reviewer verdicts at a glance (fix delta)

| Lane | Verdict | Residuals |
|---|---|---|
| code-review | **APPROVE** | none (2 advisories deferral-justified) |
| type-design | **APPROVE** | #4 `isSeed` partial (acceptable); #3/#6 deferred |
| pr-test-analyzer | **APPROVE** | #4 `isInDST` UTC-runner branch still open (deferred); #7 advisory residual |
| code-simplifier | **APPROVE** | 4 helper suggestions remain open (not adopted); **no new debt** |
| silent-failure-hunter | **REVISE/BLOCK** | **H-2 still open (HIGH)**; M-1 partial (MEDIUM) |
| comment-accuracy | **REVISE** | **narration.ts:220 "six" still open**; 2 advisory residuals |

---

## Closed findings — verification detail

- **#1 `ocrImageDataUrl` escaping** (`e098e0f`) — `pdf/time-offset.ts:115` now `src="${e(d.ocrImageDataUrl)}"`. The new test injects `data:image/png;base64,AA" onerror="alert(1)` and asserts `&quot;` present + `onerror="alert(1)` absent. Adversarial, non-vacuous. *(3 lanes concur.)*
- **#2 `applyTimeOffset` fail-loud** (`8060250`) — `time.ts:54` throws on `isNaN`, consistent with `calculateTimeDifference`. Both `calculateCorrectedTimeRange` and `calculateDSTAdjustedTimeRange` route range times through it; throw-tests added. *(silent-failure H-1 closed.)*
- **#3 offset-direction tests** (`a8efb79`) — all four `(isActualTime × isDvrAhead)` quadrants now carry pinned arithmetic; pr-test-analyzer independently re-derived every expected value (Q1 23:50:30 / Q2 23:40:00 / Q3 23:39:30 / Q4 23:50:00 — all correct). The vacuous `toContain([1,-1])` DST assertion is superseded by a signed-shift check on **both** endpoints (`delta === adjustmentApplied × 3.6e6`), which fails on a direction inversion or partial application.
- **#4 import-timestamp contract** (`eb40e5f`) — resolved by **Option A** (document the contract, not mutate the sample): `ImportTimeFrame` start/end are declared free-text "as extracted," normalised by the requested-scope screen before any time math, and the math now throws on un-parseable input. code-review verified by reading the barrel: **no M1 path** feeds an `ImportTimeFrame` time into the math, and a future M2 author who bypasses normalisation gets an immediate loud throw, not a corrupted document.
- **M-2 `timePeriodType`** (`ffbcd4c`) — `String(t.timePeriodType ?? 'Actual Time').trim().toLowerCase() !== 'dvr time'` handles null/undefined/whitespace/case. *(silent-failure + type-design concur; code-review noted this was a real correctness bug the initial pass under-weighted — non-canonical casing previously inverted the offset direction.)*
- **`getCurrentFormattedTime(0)`** (`ffbcd4c`) — `timestamp != null`; epoch test (`/^19(69|70)-/`) is zone-correct and non-vacuous.
- **Type honesty** (`c2076c1`) — `parseAiJson` → `Partial<ExtractedFields>` (call chain now consistently typed); `GpsCoordinates` extracted and composed via `& { source }` on `DemoLocation`; `readonly isSeed`.
- **Test-gap fills** (`74574b6`) — confidence boundaries `0.8/0.6/0.4/0.39`, `parseAiJson('{"k":[}')` throw, `roundTo5Min('not-a-date')` passthrough, `MODAL_NARRATION` completeness. All non-vacuous.
- **Comment softening** (`0207d87`) — `ocr.ts` docblock "six"→"several"; "verbatim"/"faithful reproduction" → "adapted"/"modelled on" across `time.ts`, `ocr.ts`, `pdf/case-notes.ts`, `pdf/time-offset.ts`.

---

## Still-open — must address for this REVISE

1. **H-2 (HIGH) — guard `collectionDateTime` in `calculateDSTAdjustedTimeRange`** (`time.ts:96-108`). The fail-loud fix is asymmetric: range times throw, the collection-time DST decision (`isInDST`, `time.ts:81`) silently returns `false` on invalid input → `+1h` applied in the wrong direction with `adjustmentApplied: 1` signalling false confidence. Pre-validate `collectionDateTime` (throw on NaN, matching the rest of the file) or have `isInDST` return `null`/throw on invalid input. ~3 lines.
2. **narration.ts:220 (visitor-facing) — "six timestamp formats" → "several"**. The `ocr.ts` docblock was softened but the demo narration copy — the instance comment-accuracy flagged as *more* serious — was missed. One word.
3. **M-1 (MEDIUM) — `parseAiJson`/`mapAiToForm` blank-vs-garbage signal.** The type is now honest (`Partial`), but the runtime swallow is unchanged: a malformed payload maps to an all-blank `MappedImport` indistinguishable from a legitimate "no data" result. Either add a signal (recognized-field count / validated flag / throw on zero known fields), **or** formally defer with a tracked note + un-defer trigger (when M2 wires a live model). Latent today (the demo never calls a live model).

---

## Deferral justifications — verification detail

All assessed against the rubric (specific rationale + concrete un-defer trigger):

- **H-4 DD-MM/MM-DD ambiguity** — *justified.* Deliberate North-American default (demo targets Canadian forensic officers). **Action:** add an inline comment at `ocr.ts:107` / `:115` documenting the MM-DD assumption so it isn't mistaken for a verified parse.
- **M-3 time-only OCR → today's date** — *justified, conditional.* **Un-defer trigger:** becomes a BLOCK if the M2 OCR chapter lets a user accept a time-only result without confirming the date. **Action:** `// TODO` at `ocr.ts:133`.
- **pr-test #4 `isInDST` DST-true branch dead under UTC CI** — *justified.* The signed-shift test verifies the direction is *consistently applied*, not that it's *correct* for a DST zone. **Un-defer trigger:** add a `TZ=America/Toronto` CI step or a fixed-offset fixture.
- **type #3 registry exhaustiveness** (`Record<ChapterId,number> satisfies …`) and **#6 `LocationForm.media` ↔ `MediaKind`** — *justified.* Unions are exhaustive/stable today; future-drift hazards, not active defects.
- **type #4 residual** — `readonly isSeed` closes the named persistence bug; seed-entity *field* mutability remains (Advisory).
- **4 simplification helpers** (`parseAsUtc`, `formatUtc`, `resolveDashParts`, `nowStamp` dup) — *open, optional.* Behavior-preserving cleanups, not adopted; no new debt introduced.

---

## New findings introduced / surfaced by the fixes

- **`ocr.test.ts:6` (Advisory)** — a stale copy of the old "six common formats" wording remains in the test-file comment; the softening missed it. Change to "several" for consistency.
- **`import.ts:4` (Advisory)** — the softened docblock still says the mapping logic runs "**unchanged**," a stronger fidelity claim than "adapted"/"modelled on" and still unverifiable against the app source. Soften or drop "unchanged."
- **No logic regressions** — code-simplifier confirmed the delta added no new duplication/complexity; the `GpsCoordinates` extraction is itself a clean de-dup; all 137 tests green.

---

## Architecture invariants — re-verified clean

- Pure-logic boundary intact: no `/demo` route, build output unchanged, barrel still exports only public symbols.
- The offset-direction math (the safety-critical core) now has full quadrant coverage with independently-verified arithmetic and a non-vacuous DST direction gate.
- Type honesty restored end-to-end on the AI-import path (`Partial` parse → `Partial` map).
- The "two prototype bugs fixed" claims (position-derived nav numbers; `isSeed`/now-`readonly` provenance) remain intact and are strengthened.

---

## Recommended next steps

One small **REVISE** commit (or two) closes this out — the PR is very close:
1. Guard `collectionDateTime` in `calculateDSTAdjustedTimeRange` (H-2) + a test that an invalid collection time throws.
2. `narration.ts:220` "six" → "several" (and the `ocr.test.ts:6` copy while you're there).
3. Decide M-1: add a blank-vs-garbage signal **or** a tracked deferral note with an M2 un-defer trigger.
4. Optional, cheap: inline comments for the H-4 / M-3 deferrals; drop "unchanged" in `import.ts:4`.

Everything else (type #3/#6, the four simplification helpers, the `TZ`-pinned DST CI step) is legitimately deferrable to the M2 work.

---

## Reviewer pipeline notes

- **Resume-via-SendMessage worked cleanly** — each reviewer referenced its own original finding wording verbatim and assessed only its lane, exactly as the fix-delta mode intends.
- **Cross-lane independent confirmation was the high-value signal twice:** silent-failure and the orchestrator both caught H-2's collection-time gap from the diff; comment-accuracy and the orchestrator both caught the missed `narration.ts:220`. Two lanes converging on the same residual is a strong "really open" signal.
- **The genuine dispute (H-2: silent-failure BLOCK vs code-review APPROVE) was productive, not noise** — code-review's "no M1 caller" finding is what kept this at REVISE rather than BLOCK, while silent-failure's read is what keeps it off APPROVE. Both were needed to land the right severity.
- **The fix delta corrected two bugs beyond the original findings** (`getCurrentFormattedTime(0)` epoch; non-canonical `timePeriodType` casing inverting the offset) — surfaced by the implementer, confirmed by the resumed lanes.
