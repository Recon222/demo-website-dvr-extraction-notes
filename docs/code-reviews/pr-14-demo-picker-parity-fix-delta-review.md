# PR 14 — Fix Delta Review (round-2 fixes)

**PR:** [#14](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/14) — `feat(demo): custom date/time pickers + dropdown (phone-app parity)`
**Branch:** `feat/demo-picker-parity` → `master` · **HEAD:** `ae55f11`
**Scope:** Fix delta only — re-review of the **5 commits** landed in response to `pr-14-demo-picker-parity-fixes-review.md` (the round-2 review). Workflow per the phone app's `/react-native-code-review --fix-delta` (resume prior reviewers via `SendMessage`, scope each to their own findings).
**Reviewers (resumed via SendMessage, full transcript context):** code-reviewer · comment-analyzer · pr-test-analyzer · silent-failure-hunter · type-design-analyzer · code-simplifier
**Date:** 2026-06-28

> **For the implementing instance:** This document is self-contained. You do not need to reread the prior reviews.

## Verdict
**APPROVE (with comments).**

Every finding from the round-2 review is closed, deferral-justified, or accepted-by-design. The fixes are correct — verified by manual trace (the retention day-math, the write-back guard, the import-preservation path) and re-confirmed across multiple lanes. The only open items are **two MEDIUM regression-protection test gaps** introduced by `b3291ae` (the clear path and the import-preservation guard are correct but untested) plus two LOW residuals. None block merge; the two tests are a worthwhile sub-5-minute follow-up.

## Pre-flight gates (re-verified after fixes)

| Gate | Result |
|---|---|
| `pnpm test` | ✅ **56 files / 374 passed** (exit 0; was 370 → +4 from `494b9b6`) |
| `tsc --noEmit` | ✅ **0 errors** |
| `git diff 119f3fa..HEAD` | 11 files, **+156 / −41**, 5 commits |

*(No BUG-003 flaky-baseline filtering applies — that's a phone-app artifact; this repo's vitest suite is deterministic.)*

## Fix commit → original finding mapping

| Commit | Original finding(s) | Lane(s) | Type | Verdict |
|---|---|---|---|---|
| `b3291ae` | #1 Guided tour empty retention / blank PDF row · #2 Stale `totalDvrRetention` on clear/future | code-reviewer, silent-failure F1, type-design #3 | code | **Closed** (type-design notes a Low residual) |
| `a7456d9` | Malformed `scopeStart`→OVERWRITTEN · `RetentionView` union · drop `ScopeRetention.status` · `dayDiff` · single-parse `buildScopeEntry` · `dangerPill` | silent-failure F3, type-design #1/#2, code-simplifier | refactor | **Closed** |
| `494b9b6` | 4 test gaps (status edges · bridge · 0-day · portal) | pr-test-analyzer | tests | **Closed** |
| `8d26fb0` | Stale `PickerSheet` "(like ModalShell)" comment · dead `Dropdown.required` prop | comment-analyzer, code-simplifier | cleanup | **Closed** |
| `ae55f11` | Future-date = no-date signal | silent-failure F2 | deferral (`deferred.md #11`) | **Deferral justified** |

## Reviewer verdicts at a glance (fix delta)

| Lane | Closed | Deferral-justified | Accepted by-design | New / residual | Lane verdict |
|---|---|---|---|---|---|
| code-reviewer | 1 | 1 (#12) | — | double-run benign | APPROVE |
| comment-analyzer | 1 | — | — | 0 (all 5 new comments accurate) | APPROVE |
| pr-test-analyzer | 4 | — | — | **2 MEDIUM** + 1 nice-to-have | APPROVE w/ comments |
| silent-failure | 2 (F1, F3) | 1 (F2) | 1 (F4) | 0 | APPROVE |
| type-design | 2 (#1, #2) | — | — | #3 closed + **1 LOW** residual | APPROVE |
| code-simplifier | 4 | — | — | **1 LOW** (optionRow border) | APPROVE |

## Closed findings — verification detail

- **#1 Guided retention (code-reviewer) — CLOSED.** `DemoExperience.tsx:55` adds `GUIDED_NOW = () => new Date(2025,3,12)` (explicit-arg, deterministic; evaluated only inside the effect) vs `realNow` in sandbox; `beats.ts` `dvrInfo` seeds `firstRecordedDate: '2025-03-01 00:00:00'`. Trace: `2025-03-01 → 2025-04-12` = **42 days** (card renders, not the empty state); seed scope `2025-03-08 + 42 = 2025-04-19`, `2025-04-19 − 2025-04-12` = **7 days → WARNING**. `str = '42 days'` is written, so `case-notes.ts:178` emits the PDF row. Math independently re-derived by the comment-analyzer.
- **#2 / F1 Stale `totalDvrRetention` — CLOSED.** The split guard (`if (fr)` writes `str`, which is `''` for a future date; `else if (prevFirstRecorded.current && …)` clears on a set→empty transition) was traced through all three sub-cases by silent-failure: (a) clear-after-set clears the stored value, (b) future date clears it, (c) **import value is safe** — when `fr` was never set, `prevFirstRecorded.current` stays `''` so the clear branch never fires and the import-written `'35 days'` survives.
- **F3 Malformed `scopeStart` — CLOSED.** `buildScopeEntry` parses once and returns `null` for empty **or** malformed starts; `buildRetentionView` pushes only non-null entries. The "0 days / OVERWRITTEN / empty date" path is gone.
- **Type #1/#2 — CLOSED.** `RetentionView` is now a discriminated union (`null+[]` | `number+ScopeRetention[]`) — the null+non-empty state is unrepresentable. `ScopeRetention.status` removed; `DvrInfoScreen.tsx:65` derives it at render via `getRetentionStatus(daysUntilOverwritten)`. tsc-clean confirms all consumers + fixtures updated.
- **Simplifications — CLOSED.** `dayDiff(a,b)` replaces the duplicated `Math.floor(…/MS_PER_DAY)`; `buildScopeEntry` removes the double parse+addDays per scope (and now computes `today` once per call — a minor clock-skew improvement); `Dropdown.required` fully removed; `danger` const spread into `CRITICAL`/`OVERWRITTEN`.
- **Comment + 4 test gaps — CLOSED.** `PickerSheet` docstring now describes the portal accurately; the 4 added tests are genuine behavioral assertions (band edges would catch a `<=3`→`<3` off-by-one; the portal test fails if it falls back to inline; the 0-day test asserts both the "Already overwritten" text and the "Overwritten" badge).

## Deferral justifications — verification detail

Both pass the rubric (cited by ID · specific rationale · concrete un-defer trigger):

- **`deferred.md #11` — future-date input signal (silent-failure F2).** Rationale: do it once across the app, mirrored to the phone app, rather than a piecemeal `empty|future|ok` in the retention path alone. Safety case holds — with F1 fixed, a future date yields a blank panel **and** a cleared PDF field, never a wrong value. Trigger: when app-wide input-validation messaging is designed. **Justified.**
- **`deferred.md #12` — guided-flow overhaul (code-reviewer #1).** Rationale: focus is sandbox parity first; reworking the guided script now (and the `GUIDED_NOW` + seeded-date stopgap it calls out by name) would be redone once parity lands. Trigger: once sandbox parity is reached, design a single realistic start-to-finish walkthrough. **Justified.**

## New findings introduced by the fixes

**MEDIUM — two regression-protection test gaps in the `b3291ae` retention effect (pr-test-analyzer).** The underlying code is verified-correct (silent-failure traced both paths); these are missing tests, not defects:

1. **Set→empty CLEAR path untested.** Setting then clearing `firstRecordedDate` must clear the stored `totalDvrRetention` (else a stale value reaches the PDF). Suggested:
   ```ts
   it('retention bridge: clearing firstRecordedDate clears the derived totalDvrRetention', () => {
     const store = createDemoStore(); render(<DemoExperience store={store} />); setupLocation(store)
     act(() => store.getState().updateField('form.dvr.firstRecordedDate', '2025-03-01 00:00:00'))
     expect(currentLoc(store)?.form.dvr.totalDvrRetention).toMatch(/^\d+ days$/)
     act(() => store.getState().updateField('form.dvr.firstRecordedDate', ''))
     expect(currentLoc(store)?.form.dvr.totalDvrRetention).toBe('')
   })
   ```
2. **Import-value-preservation guard untested** — the *direct motivation* of `b3291ae`. A regression removing the `prevFirstRecorded` guard would silently clobber an import-written `totalDvrRetention`. Suggested:
   ```ts
   it('retention bridge: does not clear an import-provided totalDvrRetention when firstRecordedDate is empty', () => {
     const store = createDemoStore(); render(<DemoExperience store={store} />); setupLocation(store)
     act(() => store.getState().updateField('form.dvr.totalDvrRetention', '30 days'))
     expect(currentLoc(store)?.form.dvr.totalDvrRetention).toBe('30 days')
   })
   ```

**LOW (residuals, optional):**
- *Dual-origin `totalDvrRetention: string`* (type-design) — the field now holds either a derived `"N days"` or an import string in one untagged `string`; the `prevFirstRecorded` ref exists to manage a distinction the type doesn't express. Pre-existing trade-off the author consciously kept (Option A over "don't persist derived") to avoid the import/PDF cascade; no active parse-back hazard. Not actionable for this PR.
- *`Dropdown` `optionRow` `border: '1px solid transparent'`* (code-simplifier) — dead CSS, no visual effect; remove only if a future hover/focus state isn't planned.
- *Guided `GUIDED_NOW` bridge path* (pr-test-analyzer, nice-to-have) — untested, but doesn't fire in the normal guided flow (guided data doesn't set `firstRecordedDate` outside the new beat).

## Architecture invariants — re-verified clean

- **Determinism:** no `Date.now()` / `Math.random()`; `GUIDED_NOW`/`realNow` are explicit-arg/seam functions read only inside the effect.
- **Store-bridge:** the retention derive + write-back lives in `DemoExperience` (the one store-touching component); `DvrInfoScreen` and the inputs stay presentational.
- **Value contract & types:** tsc clean; `RetentionView` union + derived status remove two representable-invalid states.
- **Tests:** 56 files / 374 pass; the 4 prior gaps now have genuine assertions.

## Recommended next steps

**Ready for merge.** Optional single follow-up commit: add the two retention-bridge tests above (clear path + import-preservation) to lock the `b3291ae` behavior against regression. The two LOW residuals and the guided-clock test can ride along or be left.

## Reviewer pipeline notes

- **Resume (SendMessage) worked cleanly** — each agent referenced its own round-2 finding wording verbatim and rendered closed/deferral/residual verdicts without re-deriving context. Faster than a fresh fan-out.
- **Cross-lane confirmation on `b3291ae`** — code-reviewer (convergence), silent-failure (import value safe), pr-test-analyzer (untested), and comment-analyzer (comment accurate) all examined the same effect from different angles. The agreement that the code is *correct but under-tested* is a strong signal: it's why the two new gaps are MEDIUM (regression-protection) rather than HIGH (active defect).
- **Adapted from the phone-app command:** no BUG-003 baseline; pnpm/vitest instead of npm/jest; the artifact filename is `…-fix-delta-review.md` (the `…-fixes-review.md` slot was taken by the round-2 review).
