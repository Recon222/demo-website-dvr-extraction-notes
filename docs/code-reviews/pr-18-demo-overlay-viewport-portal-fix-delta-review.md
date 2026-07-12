# PR 18 — Fix Delta Review

**PR:** [#18](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/18) — `fix(demo): pin phone overlays to the viewport — scroll-lift bug (full sweep)`
**Branch:** `fix/demo-overlay-viewport-portal` → `master` · **HEAD:** `8c57349`
**Scope:** Fix delta only — re-review of the **3 commits** landed in response to the initial review (`pr-18-demo-overlay-viewport-portal-review.md`, verdict APPROVE-with-comments). The branch was rebased; delta computed as `git diff a7f9c836c..HEAD` (reviewed tip → current).
**Reviewers (resumed via SendMessage, full transcript context):** react-reviewer · pr-test-analyzer · silent-failure-hunter · code-simplifier
**Date:** 2026-06-29

> **For the implementing instance:** This document is self-contained. You do not need to reread the initial review.

## Verdict
**APPROVE.** Ready for merge.

Every comment from the initial review was addressed cleanly. The advisory `<PhoneOverlayPortal>` extraction is behavior-identical and verified by all four lanes; the inline-fallback dev-warn is correctly placed and gated; the test-debt (Escape / scrim / PdfPreview callbacks) is closed with genuine assertions; and the three forward-looking constraints are deferred with rubric-compliant, independently-re-verified triggers. No regressions, no new substantive findings.

## Pre-flight gates (re-verified after fixes)

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `pnpm test` | ✅ **72 files / 522 passed** (was 71 / 513 → +9) |
| Dependencies | None added |

## Fix commit → original finding mapping

| Commit | Finding(s) | Lane(s) | Verdict |
|---|---|---|---|
| `65d094b` extract `<PhoneOverlayPortal>` + dev-warn | A1 (extract wrapper) · L1 (4-surface no-warn fallback) | simplifier, silent-failure, react | **Closed** |
| `7a80512` dismiss + callback tests | M1 (ModalShell/WizardDrawer Escape + ModalShell scrim) · L4 (PdfPreview onClose/onSave) | pr-test | **Closed** |
| `8c57349` log deferrals | M-DOWNGRADED (#19) · L2 (#20) · L3 (#21) | react, silent-failure | **Deferrals justified** |

## Reviewer verdicts at a glance (fix delta)

| Lane | Closed | Deferral-justified | Residual | Lane verdict |
|---|---|---|---|---|
| code-simplifier | A1 | — | — | APPROVE |
| silent-failure | L1 | L3 (#21) | — | APPROVE |
| pr-test | M1 (Gap1-3), L4 | — | 1 nice-to-have (WizardDrawer Escape-when-closed guard) | APPROVE |
| react | M-DOWNGRADED, L2 | #19, #20 | — | APPROVE |

**Aggregate decision: APPROVE** — 0 CRITICAL · 0 HIGH · 0 MEDIUM open. One narrow LOW nice-to-have residual.

## Closed findings — verification detail

- **A1 — `<PhoneOverlayPortal>` extraction (`65d094b`) — CLOSED.** `phone-overlay.ts`→`.tsx` now exports `PhoneOverlayPortal({children})` (component form, as recommended) → `useContext` + dev-warn `useEffect` + `overlay ? createPortal(children, overlay) : <>{children}</>`. All four sites (`ModalShell` in `_shared.tsx`, `WizardDrawer`, `PdfPreview`, `PickerSheet`) collapsed to `return <PhoneOverlayPortal>{content}</PhoneOverlayPortal>` and dropped their `useContext`/`createPortal` imports — no leftover boilerplate (simplifier). The `.ts`→`.tsx` rename left the 9 extension-free import paths intact (tsc clean).
- **L1 — inline-fallback dev-warn (`65d094b`) — CLOSED.** Both silent-failure and react independently confirmed the warn is in a `useEffect([overlay])`, **not** render-time — load-bearing, because a render-time warn would false-positive on `PhoneFrame`'s first-render null flash (the callback ref populates `overlay` on the second render). Gated `=== 'development'`: dev warns, production is dead-code-eliminated by Next, **test stays silent** (so the inline-fallback tests don't need to suppress it). The effect is stateless (no re-render). The `<>{children}</>` fallback drops nothing vs the old bare `content` (fragments flatten; no DOM/keying change) — confirmed by simplifier, silent-failure, and react.
- **M1 — dismiss tests (`7a80512`) — CLOSED (genuine assertions).** ModalShell Escape (`keyDown(document,'Escape')` → `onClose`); ModalShell scrim (a `data-modal-scrim` attribute was added for a stable selector — matches the `data-sheet-scrim`/`data-drawer-backdrop` pattern); WizardDrawer Escape-when-open + backdrop click. Each would fail if its handler were removed/rekeyed.
- **L4 — PdfPreview callbacks (`7a80512`) — CLOSED.** Header Close + footer Close → `onClose` ×2; Save → `onSave`.
- **New `phone-overlay.test.tsx` — both arms + both warn paths covered.** Portal branch (asserts content lands in the provided overlay node — fails if `createPortal` removed); inline+warn branch (`vi.stubEnv('NODE_ENV','development')` + spy → warn fires); silence branch (default `test` env → warn not called; `vi.unstubAllEnvs` cleanup prevents bleed). The dev-warn branch is no longer dark.
- **Refactor caused no existing-test breakage** — all four sites read the same `PhoneOverlayContext`, so the existing portal/inline tests pass unchanged (pr-test).

## Deferral justifications — verification detail

All three meet the rubric (cited by ID · specific rationale · concrete un-defer trigger), and reachability was independently re-verified:
- **`#19` — double-Escape (ModalShell + picker).** Trigger: a ModalShell modal gains a date/select field → `stopImmediatePropagation` on the picker's Escape. React lane **re-ran the grep** and read all three modal files: `NewCaseModal`/`NewLocationModal` use only plain `Field` text inputs, `ImportModal` has no field components — no picker is hosted by any ModalShell modal today. (Orchestrator had verified the same in the initial pass.) Not reachable.
- **`#20` — z-index inversion (drawer z41 over picker z32).** Trigger: the drawer gains a picker-opening field. React confirmed the drawer renders only `<button>` nav rows. Not reachable.
- **`#21` — PdfPreview has no Escape/backdrop dismiss.** Pre-existing; not introduced or worsened by the wrapper refactor (silent-failure). Trigger: next time overlay dismissal is standardized.

## New findings introduced by the fixes
None. The refactor is behavior-identical (verified by all four lanes); the dev-warn is additive and production-dead; no content dropped; no close mechanism altered; no existing test invalidated.

## Residual (non-blocking)
- **LOW / nice-to-have (pr-test):** the WizardDrawer "Escape-when-closed → `onClose` not called" path (the `if (!open) return` guard inside the effect) isn't explicitly tested. Low regression risk — the closed-state render test already exists and the guard is trivial. Add `render(open=false)` + fire Escape + assert not-called if convenient.

## Architecture invariants — re-verified clean
- **The scroll-lift fix is intact and now centralized:** all overlays portal through one `<PhoneOverlayPortal>` into the z40 root; the next overlay is correct-by-default and a missing portal now warns in dev.
- **Rules of Hooks:** `PhoneOverlayPortal`'s `useContext`+`useEffect` are unconditional; every parent that used `useContext` directly now delegates cleanly without changing its own hook order; `WizardDrawer`'s `if (!open) return null` correctly prevents the portal (and the warn) from mounting when closed.
- **Layering preserved:** z-index, `pointerEvents:'auto'` surfaces, and `overscrollBehavior:'contain'` all live on `content` — the wrapper adds no styling; same portal target (z40, `pointerEvents:none` root).

## Recommended next steps
**Merge.** Optional one-liner: the WizardDrawer Escape-when-closed test (residual above). The three deferrals are tracked in `deferred.md #19/#20/#21` with actionable triggers.

## Reviewer pipeline notes
- **Cleanest delta in the series:** the initial review was already APPROVE-with-comments, and every comment was closed or deferral-justified with zero regressions — a tidy APPROVE-with-comments → APPROVE transition.
- **Cross-lane confirmation on the subtle bit:** silent-failure and react independently identified that the dev-warn *must* be in a `useEffect` (not render) to avoid the first-render null-flash false positive — convergent reasoning raising confidence that the warn won't cry wolf in correct usage.
- **Deferral reachability triple-checked:** the `#19` "no picker inside a ModalShell modal" claim was verified by the orchestrator (initial review) and re-verified by the React lane here via grep + reading the modal files — exactly the discipline a deferral's reachability claim should get before it's trusted.
- **`<>{children}</>` no-op confirmed three ways** (simplifier, silent-failure, react) — fragments flatten, no DOM/keying change vs the old bare `content`.
