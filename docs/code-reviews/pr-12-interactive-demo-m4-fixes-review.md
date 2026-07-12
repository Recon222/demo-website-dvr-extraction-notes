# PR #12 — Fix Delta Review

- **PR:** [#12](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/12) — `feat(demo): interactive demo — Milestone 4 (the screens: full guided tour end-to-end)`
- **Branch:** `feat/interactive-demo-m4` → `master`
- **Scope:** Fix delta only — re-review of the **9 commits** landed in response to the initial review (`pr-12-interactive-demo-m4-review.md`), range `9b50922..809788f` (17 files, +364 / −54).
- **Reviewers (the same six resumed via `SendMessage`, original-finding context intact):** code-review · comment-accuracy · pr-test-analyzer · silent-failure · type-design · simplification
- **Date:** 2026-06-27

> **For the implementing instance:** This document is self-contained. You do not need to reread `pr-12-interactive-demo-m4-review.md`.

---

## Verdict

**APPROVE.**

All three original Important findings are resolved — #1 (import→scope) **deferred with a legitimate, narrowed rationale** (endorsed by two lanes), #2 (bridge coverage) **substantially closed** (the highest-value paths now have real, un-mocked tests — including the strongest test in the PR), and #3 (type design) **closed** save one small Advisory. Every original Advisory is closed or closed-as-documented. The fix work introduced **no new defects** and *reduced* net complexity (the list-edit factory). What remains is Advisory polish: one open type-tightening (`ImportState`), a handful of secondary test gaps, and two tiny dedup/churn nits.

This is the second clean APPROVE in the fix-delta series.

---

## Pre-flight gates (re-verified on the fixed branch)

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ clean (exit 0) |
| `pnpm test` | ✅ 269 passed / 42 files (was 254/39 — **+15** tests, **+3** files: `DemoExperience.sandbox.test.tsx`, `a11y.test.tsx`, `screenData.test.ts`) |
| `next build` | ✅ green; `/demo` unchanged at 1.25 kB / 107 kB |

---

## Fix commit → original finding mapping

| Commit | Original finding | Lane(s) | Verdict |
|---|---|---|---|
| — | 🟠 #1 import → silent scope-drop (reachable in sandbox) | code-review · silent-failure | **Deferred — justified** (form-logic parity rework) |
| `809788f` | 🟠 #2 bridge +459 / test +5 — most-valuable code untested | pr-test | **Substantially closed** (6 paths verified non-vacuous; minor residual gaps) |
| `72e4748` | 🟠 #3 loose `OcrResult`/`ImportResult` + leaky `mediaPlayerIncluded` key | type-design | **Closed** |
| `56af7e6` | 🟡 Calculate silently no-ops on empty datetimes | silent-failure | **Closed** (button gated) |
| `ef69bd9` | 🟡 `PdfPreview` `<iframe>` no `sandbox` | code-review · silent-failure | **Closed** (`sandbox=""`) |
| `1ea16e2` | 🟡 DST + media-player toggles are bare `<div onClick>` | code-review | **Closed** (`role="switch"` + keyboard) |
| `36afb41` | 🟡 `ModalShell` no `aria-modal`/Escape (+ drawer) | code-review | **Closed** |
| `b0a6a49` | 🟡 false `getUserMedia` docblock + stale `placeholder` copy | comment | **Closed** |
| `de92db7` | 🟡 `RailDot.active → activeDot` (§7 deferral, trigger fired) | type-design | **Closed** (structural) |
| `72e4748` | 🟡 `SubmissionScreen` raw-path coupling | type-design | **Closed-as-documented** |
| `ee5a15b` | 🟡 four list-edit handler trios → one factory | simplification | **Adopted** |

---

## Reviewer verdicts at a glance (fix delta)

| Lane | Verdict | Residuals |
|---|---|---|
| code-review | **APPROVE** | one new trivial advisory (`useEffect([onClose])` re-subscribe churn) |
| silent-failure | **APPROVE** | none new; deferral endorsed |
| comment-accuracy | **APPROVE** | none; the 4 new comments verified accurate |
| type-design | **APPROVE w/ 1 open advisory** | **#6 `ImportState.result` still open**; #5 closed-as-documented |
| pr-test-analyzer | **APPROVE w/ residual gaps** | Cameras/ArrivalDeparture `onRemove`, modal-submit lifecycle, `previewTimeOffset`, no single e2e |
| simplification | **APPROVE** | wants a parity comment on `onChoosePdf/onChoosePaste`; one new minor dup (`switchKeyDown`) |

---

## Closed findings — verification detail

- **#2 bridge coverage (`809788f`)** — the new **un-mocked** `DemoExperience.sandbox.test.tsx` drives the real store (in sandbox the director never runs): the **marquee path** (Capture → Use sample → confirm) asserts both `form.timeOffset.formattedDifference === '00:05:30'` and that `00:05:30` renders — "the strongest test in the PR"; the **import pipeline** (paste → Extract & import) asserts a location is created; the **PDF-preview mount** (Completion → Preview) asserts the `Case Notes — PDF` iframe mounts. Plus: `toCaseCards` unit-tested (incl. the `caseId` filter + pluralisation), `TimeOffsetScreen` rendered with **two corrected scopes** asserting specific adjusted values (the payoff table every prior test passed empty), the `OcrCaptureScreen` `ok:false` branch, and a `RequestedScopeScreen` `onRemove` index assertion. All non-vacuous (pr-test verified each).
- **#3 type unions (`72e4748`)** — `OcrResult`/`ImportResult` are now proper discriminated unions; the consumer's `confidence?.color ?? …` fallback was removed (the type now guarantees it). `ExportInfoScreen.onChange` takes `StringKeys<ExportInformation>`, which resolves to the four string keys and makes passing `'mediaPlayerIncluded'` a compile error (the boolean stays on `onToggleMediaPlayer`). tsc-enforced; no new `as`/`any`.
- **a11y (`1ea16e2`/`36afb41`)** — the shared `Toggle` and the inline DST toggle are now `role="switch"` + `aria-checked` + `tabIndex` + Enter/Space `onKeyDown`; `ModalShell` and `WizardDrawer` have `aria-modal="true"` + a `useEffect` document-keydown Escape handler with correct cleanup and stable hook order. The DST switch is now asserted in `a11y.test.tsx` via `getByRole('switch', { name: 'DVR Applies DST' })`.
- **`sandbox=""` (`ef69bd9`)**, **Calculate gate (`56af7e6`)**, **`activeDot` (`de92db7`, now structural)**, and the **comment fixes (`b0a6a49`)** all verified correct by their lanes; the four *new* comments (sandbox rationale, `StringKeys`, `activeDot`, placeholder) were checked and are accurate.
- **list-edit factory (`ee5a15b`)** — adopted cleanly across all four list cases and is *better* than the original sketch (the `add(item)` method keeps the blank-factory visible at the call site); the `setScopes`/`setVisits` inconsistency dissolved into it. Behavior identical.

---

## Deferral justification — verification detail

**#1 import → silent scope-drop — deferred, justified.** Endorsed independently by code-review and silent-failure, with a **correction to the original framing** worth recording for the author:

- The initial "a blank field hides leftover prose the user might skip" framing was **overstated**: a blank field and a genuinely-empty field behave **identically** — both produce a non-canonical datetime that the same calculation drops, and the picker already discards the prose visually, so the visitor perceives an empty field either way. The blank-vs-prose distinction is a distinction without a difference.
- The real residual is the **pre-existing** one (`deferred.md §6`): any incomplete scope (empty *or* unconvertible) drops silently at calculation, with the only signal in the PDF's `adjustedScopesPartial` annotation (which **always fires** — the forensic document is never silently *wrong*, only the in-wizard surfacing is missing).
- The deferral has a **specific owner** (the form-logic parity rework that ports the real app's import→picker conversion), a **concrete signal home** (the completion/review screens the real app has and the demo hasn't built — today a checkbox-only completion), and the interim "Calculate first" copy fix + banner travel *with* that work. Folding it in now would be a bolt-on that the parity rework would undo. Justified — no re-escalation.

---

## Still-open / residual (all Advisory — fold into the next pass)

1. **Type — `ImportState.result` nullable when `stage === 'result'`** (type-design #6, still open). The flat `interface ImportState { stage; result: ImportResult | null }` is unchanged, so the `{ stage:'result', result:null }` state is still representable and the consumer keeps a double-guard. Either make `ImportState` a discriminated union over `stage`, or record it as an explicit deferral.
2. **Test gaps** (pr-test, residual): `CamerasScreen`/`ArrivalDepartureScreen` `onRemove` with a multi-item list (index argument unasserted); the bridge `submitCase`/`submitLocation` modal-submit lifecycle; the `previewTimeOffset` path (distinct data assembly from `previewCaseNotes`); and there's still no single end-to-end "guided tour → PDF" test (the split sandbox coverage is "adequate for regression protection").
3. **Simplification nits:** add a one-line parity comment on the deliberately-identical `onChoosePdf`/`onChoosePaste` lambdas (so the skip's rationale is visible to readers); optionally extract a `switchKeyDown(fn)` behavior util — the Enter/Space handler is now duplicated in the shared `Toggle` and the inline DST toggle (style-divergence is a fair reason the DST toggle can't reuse `Toggle`, but the *handler* is pure behavior).
4. **React churn (not a bug):** the modal/drawer Escape `useEffect([onClose])` re-subscribes on every parent render (inline `onClose` lambdas). Harmless; a ref or `useCallback` removes the churn if the modals get heavier.

---

## Architecture invariants — re-verified clean

- Callback isolation still holds; the M3 oscillation fix is intact; no new `as`/`any` or hook-order issues.
- The type surface is tighter than before the review (discriminated result unions, string-key-constrained form `onChange`, structural `activeDot`), and the most-grown code (the bridge) now has real integration tests on its marquee/import/PDF paths.
- PR claims accurate: 269/42, +15, `/demo` unchanged at 1.25 kB / 107 kB.

## Reviewer pipeline notes

- **The deferral was handled the right way:** the author worked the review through the receiving-code-review discipline, narrowed finding #1 honestly (rather than bolting on a band-aid), and the resumed silent-failure lane *independently* reached the same de-escalation — a strong sign the deferral is principled, not convenient.
- **Cross-check caught two "claimed-but-not-done" items** before the agents reported: #5 (`SubmissionScreen`) was "folded into 72e4748" only as a *comment* (the call site is mechanically unchanged — acceptable for an Advisory, but worth stating precisely), and #6 (`ImportState`) wasn't addressed and wasn't in the fix comment. The fix-delta surfaced both honestly.
- **The biggest original risk (untested bridge) is now genuinely de-risked** on the paths that matter — the marquee `00:05:30` assertion runs the real OCR→offset arithmetic end-to-end through the store. The residual gaps are secondary screens and a nice-to-have full-tour test.
