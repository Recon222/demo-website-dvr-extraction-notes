# PR 17 — Aggregate Code Review

**PR:** [#17](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/17) — `feat(demo): rich import completion screen — single detail + batch accordions (parity Slice B)`
**Branch:** `feat/demo-import-completion` → `master` · **13 files, +716 / −105**
**Cut:** Slice B (the import-completion UI). Consumes Slice A (PR #16) normalized dates — dates rendered here are canonical.
**Reviewers (fresh fan-out):** react-reviewer · typescript-reviewer · type-design-analyzer · pr-test-analyzer · silent-failure-hunter · code-simplifier
**Date:** 2026-06-29

## Verdict
**REVISE.**

A clean, well-factored UI slice — the data was already in the `ImportRunResult`, and the PR just stops collapsing it. The store-bridge holds, the PR #15 cancel-guard is intact, the type chain is fully typed, warnings/notices/failures all surface, and the builder is reused by both the single-view and the accordion (no re-implementation). **One functional HIGH** holds it at REVISE: a stale single-open accordion index that mis-expands after Retry. A cluster of MEDIUMs (an a11y disclosure gap, a type-honesty smell on the result model, a cross-slice warning papercut now made visible, and three real test gaps) should ride along in the same pass.

## Pre-flight gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `pnpm test` | ✅ **68 files / 499 passed** |
| Dependencies | None added |

<sub>PR body states "69 files / 499 passing"; verified **68 files / 499 tests** — test total matches, file count is a minor miscount, immaterial.</sub>

## Reviewer lanes

Diff-driven triage. This is a React UI + a pure view-model builder (no API/secrets/network, no date math — Slice A did that) → React · TS · type-design · tests · silent-failure · simplifier. **No security/comment lanes** — nothing in the diff applies. Docs under `docs/planning/demo-import-parity/**` not code-reviewed.

## Reviewer verdicts at a glance

| Lane | C | H | M | L | Verdict |
|---|---|---|---|---|---|
| react-reviewer | 0 | 2* | 1 | 2 | BLOCK (its lane) |
| typescript-reviewer | 0 | 0 | 0 | 1 | APPROVE |
| type-design-analyzer | 0 | 1* | 1 | 1 | REVISE |
| pr-test-analyzer | 0 | 0 | 3 | 6 | incomplete |
| silent-failure-hunter | 0 | 0 | 1 | 1 | approve-with-notes |
| code-simplifier | 0 | 0 | 0 | 3 | APPROVE |

<sub>*Aggregation note: the react lane rated the missing `aria-controls` HIGH and type-design rated the empty-`locations` result HIGH; I've placed both at MEDIUM (rationale inline). The verdict is REVISE on the functional `openIndex` HIGH regardless, so the calibration doesn't move the gate.</sub>

**Aggregate decision: REVISE** (0 CRITICAL · 1 HIGH).

## Findings (deduped, ranked by severity)

### CRITICAL
None.

### HIGH

**H1 — Stale `openIndex` mis-expands the batch accordions after Retry.** _(react)_ — `ImportModal.tsx:64` (state), wired at the accordion map.
`openIndex` is local state initialized to `-1`, never reset when `result` changes. `onRetry` (`DemoExperience.tsx:688-690`) replaces `imp` **without** `closeModal()`, so `ImportModal` stays mounted and `openIndex` persists. Proven sequence: batch of 3 → user expands accordion #2 (`openIndex=1`) → Retry → new batch of 2 → accordion #2 (`i=1`) is **pre-expanded with no user action**; and a 1-accordion result with `openIndex=1` shows **nothing expanded** (the only panel is silently collapsed). (`onCancel`/`openImport` close the modal and reset, so only the Retry path bites.)
→ **Fix:** reset on new result — `useEffect(() => setOpenIndex(-1), [result])` inside `ImportModal`.

### MEDIUM

**M2 — Accordion toggle missing `aria-controls`; expanded panel has no `id`.** _(react — lane-rated HIGH)_ — `ImportResultAccordion.tsx:26-42`. The disclosure button exposes `aria-expanded` (so state *is* announced) but has no programmatic link to the region it controls, and the panel isn't in the DOM when collapsed. This is a real WCAG disclosure-pattern gap; I rate it MEDIUM (not HIGH) because `aria-expanded` already conveys open/closed — the missing piece is AT *navigation*, not state. → **Fix:** `const panelId = useId()` → `aria-controls={panelId}` on the button + `id={panelId}` on the expanded `<div>`.

**M3 — `ImportResult { ok:true; locations: [] }` is a representable-invalid state.** _(type-design — lane-rated HIGH; silent-failure confirmed no user-facing bug)_ — `ImportModal.tsx:18-26` + `DemoExperience.tsx:352-354`. `finishImport` always emits `ok:true`; an all-failures batch produces `{ ok:true, locations:[], failures:[…] }`, and the modal recovers failure via a *secondary* `locations.length===0` check. It renders correctly today (failures are shown), so no functional bug — but `ok` no longer means "success," and `{ok:true,[],[]}` would render a bare "Import failed." I rate it MEDIUM (type-honesty, no live defect). → **Fix (minimal):** in `finishImport`, emit `{ ok:false, error: … }` when `t.locations.length === 0` (the failure view already renders `result.error`; removes the `|| 'Import failed.'` dead path). Structural option: type `locations` as a non-empty tuple.

**M4 — Blank time-frame date surfaces a spurious "Empty datetime value" adjustment.** _(silent-failure — cross-slice)_ — root in `import-normalize.ts:188` / `datetime-normalize.ts:31` (PR #16 code), **made visible by this PR's prominent warnings rendering**. A live model legitimately returning `""` for an open-ended scope's end date → `normalizeDateTime("")` returns a warning → the completion screen shows "1 automatic adjustment: Empty datetime value" when nothing was adjusted (the scope already shows `'—'`). Sandbox/live only (guided uses canonical SAMPLE). → **Fix:** guard in `normalizeFrameTime` — `if (!raw.trim()) return ''` before calling `normalizeDateTime` (a blank is normal output, not a correction).

**M5 — `role="status" aria-live="polite"` wraps the whole batch result tree.** _(react)_ — `ImportModal.tsx:130`. On entering the result stage, the live region announces every accordion header (title + case# × N) + the failures summary — a run-on announcement for large batches. → **Fix:** scope the live region to a small summary line ("Imported 3 of 3 requests"); let the accordions be discovered by normal navigation.

**M6 — Three behavioral test gaps that would survive a regression.** _(pr-test)_
- **Single-open switching untested:** existing batch test expands one accordion but never (a) re-clicks to collapse, nor (b) opens a second to confirm the first collapses. Changing `openIndex === i ? -1 : i` to just `i` passes all current tests.
- **All-failed-batch modal-unit branch untested:** the `ok:true, locations:[]` → `failures.map(...).join('; ')` path is only hit by the sandbox integration test; the `ImportModal` unit test has no direct case (a typo in the map/join is caught only indirectly).
- **Open-location → submission navigation untested:** the callback arg is asserted, but no test clicks "Open location" and asserts `view === 'submission'` + `currentLocationId` set + modal closed. Dropping `setView('submission')` or the `if (locId)` guard would go uncaught.
→ Add the three (the analyzer supplied ready-to-paste tests).

### LOW

- **L1 — All-failed batch renders failures as a `join('; ')` string** (`ImportModal.tsx:135`), inconsistent with the row-per-failure card used in the partial-failure branch. No data loss; readability/consistency only. Reuse the failures-card loop for both. _(silent-failure)_
- **L2 — Body row `key={r.label}`** assumes per-section label uniqueness (true today; no structural enforcement). Use a compound/index key. _(react)_
- **L3 — Decorative status dot missing `aria-hidden`** (`ImportResultAccordion.tsx:32`). _(react)_
- **L4 — `ImportedLocationView.locId: string | null`** is never null in the production path (`addLocation` always returns an id); the null arm + `if (locId)` guard are dead. Narrow to `string`, or keep for the documented future "preview before persist" path. _(type-design)_
- **L5 — File-local dedup in `ImportModal.tsx`** _(simplifier)_: 3 repeated literal button-style objects (safe extraction, matches the existing `card` pattern); the notice banner 6/7-property match (judgment); and `MONO_LABELS` string-coupling to the builder's labels — moving an `isMono?: boolean` onto `DetailRow` would kill the brittle cross-file string match (judgment).
- **L6 — Async handlers carry no top-level `.catch()`** (`onFilesPicked`/`runPasteImport`). Latent only — the chain can't throw today (`requestExtraction`/`runPdfImport` are fully guarded, store `set` doesn't throw); worth a guard when live-model use widens. _(typescript)_
- **Nice-to-have coverage** _(pr-test)_: scope end-only range, both-blank `'—'`, the ACTUAL-TIME badge, cameras-omit, plural warnings label, the batch-branch notice.

## Architecture invariants checked & confirmed

- **Store-bridge intact:** `ImportResultBody`/`ImportResultAccordion`/`ImportModal` import nothing from `engine/store/*`; only `DemoExperience` mutates the store (`recordSuccess` → `applySuccess`). ✅
- **PR #15 H2 cancel-guard still holds:** `recordSuccess` (→ store write) sits after the `importCancelled.current` check with no intervening `await`. ✅
- **Type chain fully typed:** `patch._import` is required-non-optional; `isActualTime: boolean` flows end-to-end; the `ImportResult` discriminated union narrows correctly (incl. the short-circuit `!result.ok || result.locations.length===0`); `caseNumber … ?? '—'`. No `any`, no unchecked optional. ✅
- **No information loss in the happy path:** every warning reaches the per-location `<details>` (single + each accordion); `notice` renders in both single and batch; every failure reaches the failures card / error view. ✅
- **`deferred.md #13` correctly stays parked** — checked by **two lanes**: Slice B consumes only `warning.reason` (`{field, reason}`); neither `DateTimeNormalizationResult.normalized` nor `chosenYear` is read. The un-defer trigger ("revisit if Slice B needs the distinction") did **not** fire. ✅
- **Delegation design sound:** the single-view and the accordion both render through `ImportResultBody`; no section/scope logic is re-implemented. ✅

## Recommended next steps

One commit clears the gate and the cheap wins: **(1)** reset `openIndex` on result change (H1); **(2)** `useId()` + `aria-controls`/`id` on the accordion (M2); **(3)** make `finishImport` emit `ok:false` when no locations (M3); **(4)** guard the blank-date warning in `normalizeFrameTime` (M4); **(5)** the three M6 tests. Fold in M5 (scope the live region) and the LOW polish as convenient. The `locId` narrowing (L4) and `MONO_LABELS`→`isMono` (L5) are good follow-ups.

## Agent IDs
<!-- Used by a fix-delta re-review to resume these reviewers via SendMessage. -->
- react-reviewer: `a533033c733648585`
- typescript-reviewer: `a17df6db962c9de13`
- type-design-analyzer: `a16e789e24beb8555`
- pr-test-analyzer: `ad752c9c3783582e2`
- silent-failure-hunter: `a7fe73b419377d7cd`
- code-simplifier: `a4dfc0210349ac39e`
- security-reviewer: not dispatched (no API/secret/network surface)
- comment-analyzer: not dispatched (new demo-native UI, not comment-heavy ported logic)

## Reviewer pipeline notes

- **Transparent severity calibration:** two lanes self-rated HIGH (react `aria-controls`, type-design empty-`locations`) where I aggregated MEDIUM — both are real but neither is a functional break (state is exposed via `aria-expanded`; the failure view renders correctly). Surfaced rather than silently downgraded; the gate is REVISE on the `openIndex` functional HIGH regardless.
- **Cross-slice catch:** silent-failure found that Slice B's prominent warning rendering *exposes* a latent Slice A papercut (blank date → "Empty datetime value") — a consumer PR surfacing an upstream issue, worth fixing where the warning originates.
- **Deferral discipline paid off:** `deferred.md #13`'s trigger was "if Slice B needs the distinction" — two lanes independently confirmed Slice B reads only `warning.reason`, so it correctly stays parked. Exactly the check a fix-delta-style deferral is meant to force.
- **Clean factoring:** the simplifier and react lanes both confirmed no cross-component re-implementation; the only dedup is file-local to `ImportModal`.
