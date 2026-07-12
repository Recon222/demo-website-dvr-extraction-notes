# PR 18 — Aggregate Code Review

**PR:** [#18](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/18) — `fix(demo): pin phone overlays to the viewport — scroll-lift bug (full sweep)`
**Branch:** `fix/demo-overlay-viewport-portal` → `master` · **6 files, +120 / −10**
**Reviewers (fresh fan-out):** react-reviewer · pr-test-analyzer · silent-failure-hunter · code-simplifier
**Date:** 2026-06-29

## Verdict
**APPROVE (with comments).**

A small, surgical, correct fix. It extends the proven `PickerSheet` portal-into-`PhoneOverlayContext` pattern to `ModalShell`, `WizardDrawer`, and `PdfPreview`, killing a real scroll-chaining/scroll-lift bug. The React lane verified all six mechanics (hooks order, z-index, pointer-events, overscroll, fallback) and the silent-failure lane *proved* the inline fallback is unreachable in production. No CRITICAL/HIGH. The comments are test-debt (pre-existing dismiss handlers the new test files should cover) and one convergent advisory (extract a shared portal wrapper).

## Pre-flight gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `pnpm test` | ✅ **71 files / 513 passed** |
| Dependencies | None added |

## Reviewer lanes

Right-sized triage for a 120-line, 3-component portal fix: **React** (the core — portal correctness, layering, fallback), **tests** (the 7 new portal/fallback tests), **silent-failure** (the inline-fallback path), **simplifier** (4 overlays now share the boilerplate). **No security / type-design / comment lanes** — no surface (no new types, no API/secrets, no comment-heavy logic). Skipping them is right-sizing, not under-coverage.

## Reviewer verdicts at a glance

| Lane | C | H | M | L | Verdict |
|---|---|---|---|---|---|
| react-reviewer | 0 | 0 | 1* | 1 | APPROVE |
| pr-test-analyzer | 0 | 0 | 3† | 1 | gaps (test-debt) |
| silent-failure-hunter | 0 | 0 | 0 | 1 | APPROVE |
| code-simplifier | 0 | 0 | 0 | 0 | APPROVE (1 advisory) |

<sub>*The React MEDIUM (double-Escape) was downgraded to LOW on orchestrator verification — see M-DOWNGRADED below. †The test lane rated the Escape gaps "Critical" in the coverage sense; they cover **pre-existing, unchanged** behavior, so they aggregate to MEDIUM test-debt, not a runtime defect.</sub>

**Aggregate decision: APPROVE (with comments)** — 0 CRITICAL · 0 HIGH.

## Findings (deduped, ranked by severity)

### CRITICAL / HIGH
None.

### MEDIUM

**M1 — The new test files omit the components' primary dismiss behaviors.** _(pr-test)_ The three new test files cover the portal/inline-fallback branches well, but skip:
- **ModalShell Escape** (`_shared.tsx:35-41`) — `useEffect` document keydown → `onClose`; untested in `ModalShell.test.tsx` and `modals.test.tsx`.
- **WizardDrawer Escape** (`WizardDrawer.tsx:30-37`) — untested in the new file and `controls.test.tsx`.
- **ModalShell scrim click** (`_shared.tsx:44`) — the primary outside-click dismiss; untested (and the scrim has no `data-` attribute, unlike `WizardDrawer`'s `data-drawer-backdrop` / `PickerSheet`'s `data-sheet-scrim`).

These are **pre-existing, unchanged** behaviors (the Escape `useEffect`s predate this PR — commit `bb27a87`; portaling doesn't affect document-level listeners or React synthetic clicks through portals), so they're test-debt, not a regression. But the PR adds dedicated test files for exactly these components, so they're the right place to close the gaps. `PickerSheet.test.tsx` already models both (Escape + scrim) — mirror them. Consider adding `data-modal-scrim` to the ModalShell scrim for a stable selector.

### LOW

- **M-DOWNGRADED — Double-Escape dismiss (ModalShell + PickerSheet).** _(react — originally MEDIUM)_ The React lane flagged that a picker open inside a `ModalShell` modal would have Escape close both (two `document` listeners). **Orchestrator verification downgrades this to LOW:** (a) the ModalShell Escape listener is **pre-existing**, not introduced here, and portaling doesn't change document-level propagation; (b) it is **not currently reachable** — `grep` confirms none of the ModalShell-based modals (`NewCase`/`NewLocation`/`Import`) render a `DateTimeField`/`SelectField`/`Dropdown`/`PickerSheet` (the pickers live in the wizard screens, which aren't inside `ModalShell`). Keep as a **forward-looking constraint**: if a ModalShell modal ever gains a date/select field, add `e.stopImmediatePropagation()` to the picker's Escape (close top-most dialog only, per ARIA APG §6.6).
- **L1 — Inline-fallback no-warn, now across 4 surfaces.** _(silent-failure + simplifier, convergent)_ The `overlay ? createPortal(content, overlay) : content` fallback (`_shared.tsx:79`, `WizardDrawer.tsx:130`, `PdfPreview.tsx:38`, `PickerSheet.tsx:116`) silently renders inline — reintroducing the scroll-lift bug — if the context is ever null in production. Silent-failure **proved this is unreachable today** (three gates: initial all-closed state · overlay callback-ref populates before passive effects · no director beat opens an overlay). But with 4 surfaces now sharing it, PR #15's "not worth a warn for one surface" calculus is weaker: a future open-on-mount path (e.g. a `?modal=…` deep-link) would silently break all four with no signal. → Pairs naturally with the simplifier advisory below: put a `process.env.NODE_ENV !== 'production'` warn in the shared wrapper. Log in `deferred.md` if not done now.
- **L2 — z-index inversion if PickerSheet + WizardDrawer co-open.** _(react)_ WizardDrawer backdrop (z41) would obscure a PickerSheet panel (z32). Not reachable (WizardDrawer hosts no form controls that open a picker). Constraint to remember if the drawer ever gains a search/field.
- **L3 — PdfPreview has no Escape/backdrop dismiss (Close/Save buttons only).** _(silent-failure, informational)_ Pre-existing; the buttons work correctly post-portal (`pointerEvents:'auto'` on the container). UX inconsistency vs the other overlays, not introduced here.
- **L4 — PdfPreview `onClose`/`onSave` callbacks not exercised at the component level** (only mount is asserted in the sandbox). _(pr-test, nice-to-have)_

### Advisory

**A1 — Extract a shared `<PhoneOverlayPortal>` wrapper.** _(code-simplifier; reinforced by silent-failure L1)_ After this PR, **four** components carry the identical `useContext(PhoneOverlayContext)` + `overlay ? createPortal(content, overlay) : content` boilerplate. The pattern is now proven and stable across 4 sites — the inflection point for extraction. A `<PhoneOverlayPortal>{content}</PhoneOverlayPortal>` component (in `phone-overlay.tsx`; component form preferred over a hook — idiomatic JSX, unaffected by `WizardDrawer`'s early-return ordering) collapses each site to one line, is the natural home for the L1 dev-warn, and makes the **next** overlay correct-by-default (can't silently forget the portal and reintroduce this bug). Behavior-identical; ~5 files; tests untouched (`PhoneOverlayContext` stays exported). Safe refactor, ~90% confidence.

## Architecture invariants checked & confirmed

- **The fix is correct and faithful to `PickerSheet`:** all three surfaces portal into the z40 overlay root (outside the `data-phone-screen` scroller), so the inner-scroll no longer chains to the page scroller. ✅
- **Rules of Hooks:** `useContext`/`useEffect` are unconditional and ordered before `WizardDrawer`'s `if (!open) return null`. ✅
- **Z-index:** the z40 root forms one stacking context; within it, picker (31/32) > modal (22) holds for the only reachable nesting; drawer (41)/PdfPreview (43) are standalone and don't co-occur with pickers. Covering the dynamic island/status bar is intended (matches PickerSheet). ✅
- **pointer-events:** root is `none`; every scrim/backdrop/panel sets `auto` — full-coverage click-catch, no click-through to the screen behind. ✅
- **overscroll-behavior:'contain'** is on the right element (inner scroller) and load-bearing for touch/momentum environments (the portal alone handles the desktop wheel-chaining). ✅
- **Inline fallback unreachable in production** — proven by three independent gates; the close mechanisms (Escape, scrim, buttons) all work post-portal (document-level listeners + synthetic clicks through portals are position-independent). ✅
- **No existing test broken** by the move (the inline-rendering ones have no provider; sandbox queries use `screen`/document). ✅

## Recommended next steps

**Mergeable as-is.** Two cheap follow-ups, ideally one commit: **(1)** add the M1 dismiss tests (Escape ×2 + ModalShell scrim, mirroring `PickerSheet.test.tsx`); **(2)** the A1 `<PhoneOverlayPortal>` extraction with the L1 dev-warn folded in (kills the boilerplate *and* the silent-regression risk in one move). The LOW layering/dismiss constraints (M-DOWNGRADED, L2, L3) are forward-looking notes — record in `deferred.md` if not actioned.

## Agent IDs
<!-- Used by a fix-delta re-review to resume these reviewers via SendMessage. -->
- react-reviewer: `ad3132b484288804c`
- pr-test-analyzer: `ac7aa0522021dea49`
- silent-failure-hunter: `a291658cd44e5fd1a`
- code-simplifier: `a980771ee3c1f6878`
- typescript-reviewer: not dispatched (createPortal/context usage is trivial; React lane covered it)
- type-design / security / comment-analyzer: not dispatched (no surface)

## Reviewer pipeline notes

- **Orchestrator verification mattered:** the React lane's one MEDIUM (double-Escape) was over-attributed to this PR and over-rated for reachability — a quick `grep` confirmed the Escape listener is pre-existing and no ModalShell-based modal hosts a picker, downgrading it to a LOW forward-looking constraint. Worth catching before it inflated the verdict.
- **Two lanes converged on one lever:** silent-failure (L1, 4-surface no-warn fallback) and simplifier (A1, extract the wrapper) point at the same fix from different angles — the `<PhoneOverlayPortal>` extraction is the natural home for the dev-warn, addressing both. Strong signal to do it.
- **Right-sized fan-out:** 4 lanes for a 120-line fix, security/type-design/comment skipped for lack of surface — and the review still surfaced a real test-debt cluster and a high-value refactor. Skipping lanes with no surface is correct, not under-coverage.
- **Verified, not assumed:** both the React and silent-failure lanes independently confirmed the portal works and the fallback can't fire in prod — the fix does what it claims.
