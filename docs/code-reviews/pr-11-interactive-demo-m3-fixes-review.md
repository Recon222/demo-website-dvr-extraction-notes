# PR #11 — Fix Delta Review

- **PR:** [#11](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/11) — `feat(demo): interactive demo — Milestone 3 (UI shell, primitives & bridge)`
- **Branch:** `feat/interactive-demo-m3` → `master`
- **Scope:** Fix delta only — re-review of the **6 commits** landed in response to the initial review (`pr-11-interactive-demo-m3-review.md`), range `722ac52..6b51604` (15 files, +296 / −80).
- **Reviewers (the same six resumed via `SendMessage`, original-finding context intact):** code-review · comment-accuracy · pr-test-analyzer · silent-failure · type-design · simplification
- **Date:** 2026-06-27

> **For the implementing instance:** This document is self-contained. You do not need to reread `pr-11-interactive-demo-m3-review.md`.

---

## Verdict

**APPROVE.**

The **Critical view-oscillation loop is closed with a structurally-sound data-model fix** (not a band-aid guard), backed by a real **un-mocked** regression test. Both Important findings are closed, every Advisory is resolved or justifiably deferred to M4, and the rework **reduced** net complexity (`launchReturnView` + its casts + the double-launch ternary + the `?? 'submission'` fallback are all gone). +11 tests, all verified non-vacuous. The only residuals are three trivial, non-blocking polish items.

This is the first unanimous-APPROVE fix delta in the series — all six lanes returned closed/justified.

---

## Pre-flight gates (re-verified on the fixed branch)

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ clean (exit 0) |
| `pnpm test` | ✅ 226 passed / 33 files (was 215/32 — **+11** tests, **+1** file: the un-mocked integration test) |
| `next build` | ✅ green; existing site output unchanged |
| Coverage (`lib/**`) | stmts 97.7 / branches 84.2 / fns 98 / lines 98.4 — gate holds |

---

## The Critical fix — verification detail

**Original (CRITICAL):** the beat-play effect was keyed on `view`; the `timeOffset` beat's `launch('ocr')` step changed `view`, which re-ran the effect → cancelled the running beat → its `finally { closeLaunch() }` (the M2 fix) restored `view` → effect restarted the beat → infinite oscillation, deadlocking the marquee chapter. Masked because the bridge test mocked `runBeat`.

**Fix (`2efee32`) — the correct data-model decoupling I recommended:**
- New store field **`currentChapter: ChapterId`**, mutated only by `setView` (`isChapterId(view) ? { view, currentChapter: view } : { view }`), `seedGuided`, and `reset` — **never** by `launch`/`closeLaunch`. `launch` is now `set({ view: screen })`; `closeLaunch` is `set((s) => ({ view: s.currentChapter }))`; `launchReturnView` is retired.
- The bridge subscribes to `currentChapter` (not `view`) and keys beat-play on it (deps `[store, currentMode, currentChapter]`, `BEATS[currentChapter]`, no cast).
- **Trace (confirmed by silent-failure + code-review + orchestrator):** `launch('ocr')` moves `view` but leaves `currentChapter` at `'timeOffset'` → the effect dep is unchanged → no cancel, no re-run → the beat runs uninterrupted through `closeLaunch` (a no-op `view` write back to `currentChapter`) to the `calculateOffset` tap. The oscillation is **structurally impossible** under the new model.
- **Edge cases verified clean:** navigating mid-launch updates `currentChapter` via `setView` *before* the cancelled runner's `finally`, so `closeLaunch` becomes a no-op dispatch (no stale chapter); the render-time `applyUrlState` seed is safe one-time lazy-ref init (runs once even under Strict Mode); the `lastUrl` ref guard correctly prevents a double-seed on mount while still re-seeding on a real URL change.

**Regression test (`DemoExperience.integration.test.tsx`) — genuine, not mock-backed:** `runBeat` is **not** mocked; the test drives the real `timeOffset` beat under fake timers via `vi.runAllTimersAsync()` and asserts `form.timeOffset.formattedDifference` is truthy (the marquee payoff ran) and `view` settled to `'timeOffset'` (not stuck on `'ocr'`). On the old code this would either throw `RangeError: too many recursive timer callbacks` (the oscillation schedules timers faster than the runner can settle) or fail the `calculateOffset` assertion. Either path fails — a real guard.

---

## Fix commit → original finding mapping

| Commit | Original finding | Lane(s) | Verdict |
|---|---|---|---|
| `2efee32` | 🔴 Critical view-oscillation loop | silent-failure · (orchestrator) | **Closed** (structural fix + un-mocked test) |
| `2efee32` | 🟠 #1 pulse `setTimeout` leak | code-review · silent-failure | **Closed** (`useRef<Set>` tracked + cleared) |
| `2efee32` | 🟡 `view as ChapterId` cast · `LaunchableId→splash` narration · `degraded` unread · `params?.` · invalid-`?step` silent | code-review · type-design · silent-failure · simplifier | **Closed** (all folded into the `currentChapter` rework) |
| `8170fe9` | 🟠 #2 `aria-disabled` on a `<div>` Back | code-review · pr-test | **Closed** (real `<button disabled>`) |
| `7cf87c7` | 🟠 #3 drawer `id: string` → `WizardScreenId`; #5 `status` `null` | type-design | **Closed** |
| `d80dc78` + `2efee32` | 🟠 #4 bridge behaviors untested | pr-test | **Closed** (un-mocked integration + sandbox-guard + cancel + real `?step` title) |
| `4407814` + `2efee32` | 🟡 comment accuracy (`demo.css`/`useTypewriter`/"store once") | comment | **Closed** |
| `6b51604` | 🟡 `&&`-for-side-effect; advisory test gaps (usePhoneScale cap/resize, StoryRail callbacks, drawer backdrop, useTypewriter unmount) | simplifier · pr-test | **Closed** (all non-vacuous) |

---

## Reviewer verdicts at a glance (fix delta)

| Lane | Verdict | Notes |
|---|---|---|
| silent-failure | **APPROVE** | Critical closed, "structurally sound, not a band-aid"; no new silent failures |
| code-review | **APPROVE** | both Important closed; bridge rework React-correct; "ready to merge" |
| pr-test-analyzer | **APPROVE** | all fixed findings non-vacuous; integration test is a genuine regression guard |
| type-design | **APPROVE** | all closed / `#4` deferral-justified; `currentChapter` a strict improvement |
| simplification | **APPROVE** | both suggestions adopted; net complexity **reduced** |
| comment-accuracy | **APPROVE w/ trivial note** | 4 closed; 1 new Advisory (docblock completeness) |

---

## Deferral justifications — verification detail

`docs/code-reviews/deferred.md §7` logs both M4 deferrals with specific descriptions and a concrete trigger ("Milestone 4 — screen prop-typing + drawer trigger wiring"); type-design and code-review both assessed them **justified**:
- **`RailDot.active` → `activeDot` invariant** (Advisory) — touches the StoryRail props API + DemoExperience + the StoryRail test; the violation can only be introduced at the single co-located call site, so drift risk before M4 is low. Folds naturally into the M4 screen prop-typing pass.
- **`WizardDrawer` dialog a11y** (Escape/focus-trap/return) — the drawer has **no trigger** in M3 (`drawerOpen` is never set; `open` is never `true`), so the keyboard contract is literally unreachable. Lands with the M4 hamburger wiring.

---

## Minor, non-blocking follow-ups (optional polish — none gate the merge)

1. **`currentChapter` docblock is slightly incomplete** (`create-store.ts`) — comment-accuracy: it says "set only by chapter navigation (`setView`)," but `seedGuided`/`reset` also write it. The invariant that matters (`launch`/`closeLaunch` can't touch it) is correct; reword to "...and by store resets (`seedGuided`/`reset`)."
2. **`handle.done.then(...)` has no `.catch()`** (`DemoExperience.tsx`) — code-review: not a crash path (the runner always resolves `done`), but worth a `.catch()` guard if a future runner implementation can reject.
3. **Three low-severity test gaps remain open** (pr-test, explicitly *not* claimed as fixed): TabBar `Cases`/`Map` tabs aren't click-tested; the WizardDrawer status-badge render isn't asserted; `useTypewriter`'s `active → inactive` mid-animation transition isn't exercised. Fold into the M4 test pass.

---

## New findings introduced by the fixes

- **One trivial Advisory** (the `currentChapter` docblock completeness, above). **No logic regressions, no new complexity** — simplification confirmed the delta is net-simpler, and all 226 tests are green with `tsc` clean.

---

## Architecture invariants — re-verified clean

- Callback isolation still holds (no presentational component imports the store; only `DemoExperience` does).
- The store/director contract is now stronger: `currentChapter` (always a valid `ChapterId`) replaces the nullable `launchReturnView`, removing the `?? 'submission'` fallback and a class of representable-invalid states.
- The director's `degraded` signal (added in M2) is now actually consumed (dev `console.error`); unknown `?step` slugs warn; the pulse-timer lifecycle is leak-free (verified by `vi.getTimerCount() === 0` after mid-beat unmount).

## Reviewer pipeline notes

- **Cross-lane agreement was total and independently derived:** silent-failure traced the data-model fix, code-review validated the React mechanics (render-time seed, `lastUrl` guard, effect deps), pr-test confirmed the regression test genuinely fails on the old loop, type-design confirmed `currentChapter` is a strict type improvement, and simplification confirmed the net complexity *dropped*. Five lanes reaching APPROVE from five different angles is the strongest possible "really fixed" signal.
- **The fix matched the recommended direction exactly** — "key beat-play on a stable active-chapter signal, not raw `view`" — and went further by retiring `launchReturnView` entirely, which also closed three of the original Advisory items as a side effect.
- **The earlier resilience work paid off in reverse here:** the M2 `closeLaunch`-on-cancel fix was *half* the original oscillation; this delta resolves the interaction cleanly at the store layer rather than papering over it in the component, so M4 inherits a correct model.
