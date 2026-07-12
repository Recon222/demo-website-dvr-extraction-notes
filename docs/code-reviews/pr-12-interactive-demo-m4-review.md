# PR #12 Review — interactive demo, Milestone 4 (the screens: full guided tour end-to-end)

- **PR:** [#12](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/12) — `feat(demo): interactive demo — Milestone 4 (the screens: full guided tour end-to-end)`
- **Branch:** `feat/interactive-demo-m4` → `master`
- **Reviewed:** 2026-06-27
- **Scope:** 6 commits, 30 files, **+2222 / −15** — the 17 screen components, the store/director bridge grown +459 lines (`DemoExperience.tsx`), `chrome/PdfPreview`, shared screen primitives (`_shared.tsx`), a `screenData` mapper, and a minimal `app/demo/page.tsx` route brought forward from M5. Additive on the merged M3 shell.
- **Method:** six specialised review passes (code-review · comment-accuracy · pr-test-analyzer · silent-failure · type-design · simplification) plus manual verification of every reported finding and all build/test claims. (One agent batch was canceled mid-run and re-dispatched; all six completed.)

## Topology & validation

M3 (PR #11) is merged into `master` (merge-base = `157b1d7 Merge pull request #11`); M4 is cleanly additive.

| Gate | PR claims | Verified |
|---|---|---|
| Vitest | 254 / 39 files (+41 across the screens) | ✅ 254 passed / 39 files |
| `tsc --noEmit` | clean | ✅ exit 0 |
| `next build` | green; `/demo` 1.25 kB / 107 kB | ✅ green; `/demo` static at **1.25 kB / 107 kB**; existing routes unchanged |

Findings are deduped across the six passes and filtered to **confidence ≥ 80**.

---

## 🔴 Critical

**None.** Callback isolation holds, the PDF generators escape all inputs (no live XSS — verified by two lanes), the guided showcase plays end-to-end, and the build is green.

---

## 🟠 Important

### 1. The import → silent scope-drop path is now *reachable* in the clickable sandbox — and the intermediate screens mislead
Cross-lane: **code-reviewer (Important) + silent-failure (Finding 1)**. This is the deferred §6 parity item, made live by M4's UI. In **sandbox** mode the path is:

1. `DemoExperience.runImport` → `applyImport(mapAiToForm(SAMPLE_EXTRACTION))` writes the AI's **natural-language** time strings (`'11:45 PM on March 8 2025'`, `'1:30 AM on March 9 2025'`) verbatim into `form.scopes`.
2. `RequestedScopeScreen`'s `DateTimeField` (`type="datetime-local"`) can't bind those strings → both date fields render **blank** — which looks like "not entered yet," not "imported but unparseable."
3. At `timeOffset`, clicking Calculate → `calcOffset()` → `generateExtractedScopes()` → the M2 per-scope `catch {}` **silently drops** the unparseable scopes. `TimeOffsetScreen` then shows **no** "Adjusted Time Ranges" section, and `ExtractedScopeScreen` shows the *actively wrong* message "Calculate the time offset first, then regenerate" — when the calculation already ran.

The PDF layer *does* warn (the M2 fix-delta added `extractedScopesPartial` → a red "one or more requested time ranges could not be converted" note), but **no wizard screen before the PDF** signals the problem — and the marquee (time-offset calibration) is the demo's centrepiece. The **guided tour is unaffected** (it uses canonical beat-set scopes); this only bites the *interactive* sandbox path.

→ **Fix:** §6's intended design — import pre-fills picker-backed staging fields, **not** the canonical `form.scopes` (then nothing ever drops). Interim, if that's deferred again: surface `extractedScopesPartial` as a visible banner on `TimeOffsetScreen` and `ExtractedScopeScreen` ("some imported ranges couldn't be converted — confirm the requested times"), and fix the misleading "Calculate first" copy.

### 2. The bridge grew +459 lines; its test grew +5 — the most-valuable code is essentially untested
**pr-test-analyzer.** The bridge's new orchestration has no integration coverage: the **marquee sandbox path** (`runOcrSample` → `confirmOcr` producing the `00:05:30` offset), `runImport` (field-count arithmetic, `lastLocId`, the no-case guard), the **PDF-preview pipeline** (`previewCaseNotes`/`previewTimeOffset` → `PdfPreview` mount), and the corrected-scope table are all untested. Every `TimeOffsetScreen` test passes `correctedScopes={[]}`, so the **payoff section never renders** in any test; `toCaseCards` (`screenData.ts`) is never called by any test. The existing integration test covers only the *guided* director path — the entire *sandbox* user-action surface and the "tour → PDF" vertical slice are **manual-only ("verified live in Chrome")**.

→ **Fix:** add bridge integration tests for the marquee sandbox path (assert `store…form.timeOffset.formattedDifference === '00:05:30'`), `runImport`, and the PDF preview; render `TimeOffsetScreen` with two populated corrected scopes; unit-test `toCaseCards`; cover the `OcrCaptureScreen` failed-parse (`ok:false`) branch and the list-screen `onRemove` paths (only rendered with >1 item, so currently never fired).

### 3. Type design — two loose result "unions" + one leaky key union
**type-design-analyzer.** `OcrResult` (`OcrCaptureScreen.tsx`) and `ImportResult` (`ImportModal.tsx`) are `{ ok: boolean }` + all-optional interfaces, **not discriminated unions** — so `{ ok: true }` with no `dvrTime`/`fieldCount` type-checks, and the consumers render `result.dvrTime` / `{result.fieldCount}` unguarded (would display `undefined`). And `ExportInfoScreen.onChange(field: keyof ExportInformation, value: string)` includes the **boolean** key `mediaPlayerIncluded` in its union, so the bridge's `updateField(\`form.export.${f}\`, v)` could write a `string` into a `boolean` store slot with no error.

→ **Fix:** make both proper discriminated unions (`{ ok: true; … } | { ok: false; … }`); constrain `onChange` to string-valued keys (`StringKeys<ExportInformation>`). The boolean is already handled correctly by the separate `onToggleMediaPlayer` callback.

---

## 🟡 Advisory

- **`PdfPreview` `<iframe srcDoc>` has no `sandbox`** (code-reviewer + silent-failure) — no live exploit (both PDF generators escape every field — verified), but add `sandbox=""` for defense-in-depth; the "Save as PDF" button is a stub (`setPdf(null)`), so no iframe capability is needed.
- **Accessibility on controls that became *active* in M4** (code-reviewer): `ModalShell` (the three now-openable modals — New Case / New Location / Import) has `role="dialog"` but no `aria-modal="true"` and no Escape-to-close; the **DST toggle** (on the marquee `TimeOffsetScreen`) and the media-player toggle (`ExportInfoScreen`) are bare `<div onClick>` with no `role="switch"`/`aria-checked`/`tabIndex`/keyboard handler. These were dormant in M3 (§7 deferred the drawer); they are live now.
- **`calcOffset` with empty datetimes silently no-ops** (silent-failure) — the new `TimeOffsetScreen` renders the Calculate button unconditionally; clicking it with empty fields produces no feedback. Ties to deferred §5, whose trigger ("the M3 time-offset screen") has now landed. Gate the button `disabled` on both `dvrDateTime` and `actualDateTime` being present (both are already props).
- **Comment/doc accuracy** (comment-analyzer): `OcrCaptureScreen` docblock claims "Real `getUserMedia` where available, with a … fallback" — **false**: there is no `getUserMedia` anywhere; both the capture button and the sample button run the hardcoded sample pipeline. `placeholder(view)` text "lands in a later M4 phase" is **stale** (this *is* M4 — say "fast-follow") and **dead code** (only the unreachable `mediaCapture`/`audioRecording` views hit the `default` case).
- **A deferral whose trigger has now fired:** `RailDot.active → activeDot` (deferred.md §7) was deferred to "Milestone 4 — screen prop-typing pass." That pass landed in this PR, but the refactor wasn't applied. Decide explicitly: do it, or re-defer with a new trigger.
- **Type (minor):** `SubmissionScreen.onChange` forwards its `keyof SubmissionFields` key as a raw `updateField` path (invisible coupling — rename-safe only by convention, and inconsistent with the `form.dvr.${f}` / `form.export.${f}` patterns); `ImportState.result` is nullable even when `stage === 'result'`, forcing the consumer's double-guard (`stage === 'result' && result`).
- **Simplification** (code-simplifier, behavior-preserving): `onChoosePdf`/`onChoosePaste` are byte-identical lambdas (extract one handler); the four list-edit blocks repeat the same `map`/`filter` shape → a module-level `listEditHandlers(list, write)` factory removes eight lambdas and unifies the `setScopes`/`setVisits`-vs-inlined-`updateField` inconsistency.

---

## Architecture invariants checked & confirmed

- **Callback isolation holds** — confirmed by three lanes (code-review, comment-accuracy, type-design): no `components/demo/screens/*` file imports the store; only `DemoExperience` touches it. The four list-editing screens share a single consistent, well-typed `onChange(i, patch)/onAdd/onRemove` shape, and there are **no `any` or widening `as` casts** in the screen/bridge layer.
- The M3 oscillation fix is preserved — beat-play is keyed on `currentChapter` (not `view`), so a `launch('ocr')` can't restart the beat; `runImport`→`applyImport` sequencing is correct (synchronous `currentLocationId`); `activeScreen()`/`activeModal()` are render-time functions with no hooks (no hook-order hazard).
- The `/demo` route is correct (`'use client'` + `dynamic(ssr:false)` + `<Suspense>`), resolving the M3-flagged `useSearchParams` Suspense requirement. The PDF generators escape all user content (no live XSS).
- PR claims are accurate: 254/39, +41 new tests, 17 components, `/demo` at 1.25 kB / 107 kB, `deferred.md §8` matches the stated media-screen deferrals, the `00:05:30` math, and "real algorithms throughout" (the bridge imports the real M1 `cleanOcrText`/`parseTimestampFromText`/`generateCaseNotesDoc`/etc.).

---

## Recommended next steps

**Decision: REVISE.** The guided showcase plays end-to-end and the architecture held cleanly across the largest PR in the series — but three things should land before this is merged or shown widely:

1. **The import→scope path** (#1) — the marquee fails confusingly on the *interactive* path. Do §6's import→staging fix, or at minimum surface `extractedScopesPartial` on the wizard screens and fix the wrong "Calculate first" copy.
2. **Bridge integration tests** (#2) — cover the marquee sandbox path, `runImport`, and the PDF preview; the most-grown code is currently manual-only.
3. **The discriminated unions + the `mediaPlayerIncluded` key constraint** (#3).

The a11y items on now-active controls (modal Escape/`aria-modal`, toggle `role="switch"`), the iframe `sandbox`, the Calculate guard, and the `OcrCaptureScreen` `getUserMedia` docblock fix are cheap and worth folding in. The `activeDot` deferral (§7) is now "due" — decide explicitly.

## Reviewer pipeline notes

- **Cross-lane convergence on the headline:** code-review and silent-failure independently reconstructed the same import→silent-drop path from different angles (UI-state correctness vs swallowed-error tracing), and both tied it to the pre-existing `deferred.md §6` parity item — strong "really reachable now" signal.
- **The biggest risk is invisibility, not a crash:** the bridge is the most-grown and least-tested code, and the marquee's payoff (the corrected-scope table) is the one component path never rendered in tests. Two lanes (pr-test, silent-failure) point at the same blind spot.
- **A deferral came "due" this milestone** (`RailDot.active → activeDot`, §7, triggered on the M4 prop-typing pass) and wasn't actioned — worth a standing check each milestone that fired triggers are either done or re-dated.
- **Cleared on inspection:** the `<iframe>` is not a live XSS (generators escape everything), `submitLocation`'s null-caseId guard is dead-but-harmless, and `handle.done.then()`'s missing `.catch()` is not a live rejection risk — each verified rather than assumed.
