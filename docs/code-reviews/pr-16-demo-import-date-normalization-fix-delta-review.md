# PR 16 — Fix Delta Review

**PR:** [#16](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/16) — `feat(demo): import date normalization — MM/DD + year disambiguation (parity Slice A)`
**Branch:** `feat/demo-import-date-normalization` → `master` · **HEAD:** `d54a593`
**Scope:** Fix delta only — re-review of the **8 commits** landed in response to the initial review (`pr-16-demo-import-date-normalization-review.md`, verdict REVISE / 1 HIGH).
**Reviewers (resumed via SendMessage, full transcript context):** typescript-reviewer · silent-failure-hunter · type-design-analyzer · pr-test-analyzer · code-simplifier · comment-analyzer
**Date:** 2026-06-29

> **For the implementing instance:** This document is self-contained. You do not need to reread the initial review.

## Verdict
**APPROVE (with comments).**

The HIGH blocker is closed and verified at the source by three lanes independently (the boundary-guard regex was hex-inspected for correct escaping, walked across legit/false-positive/ref-number inputs, and confirmed to introduce no new silent-failure path). All MEDIUM and actionable LOW items are closed; the deferrals meet the rubric. One narrow, non-blocking residual remains: a composition test where `sourceContainsFullDate` is the *sole* cold-case-guard trigger. Notably the author also logged H1/M1 as upstream phone-app bugs (`phone-app-debug.md`) — the demo fix is now ahead of its forensic source.

## Pre-flight gates (re-verified after fixes)

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `pnpm test` | ✅ **65 files / 484 passed** (was 478 → +6) |
| Coverage | ✅ ~97% |

<sub>The fix comment states "66 files / 484 passing"; the verified count is **65 files / 484 tests** — the test total matches, the file count is a minor miscount, immaterial.</sub>

## Fix commit → original finding mapping

| Commit | Finding(s) | Lane(s) | Verdict |
|---|---|---|---|
| `271f5ec` boundary-guard `sourceContainsFullDate` | H1 (+ test Gap1/Gap5) | typescript, silent-failure, pr-test | **Closed** |
| `f65f6e6` scan all occurrences in `findYearTokenNear` | M1 | typescript, silent-failure | **Closed** |
| `ad490da` correct date-module comments | M2, L1 | type-design, comment, typescript | **Closed** (M2 doc-resolved) |
| `aeb2392` tighten date-disambiguation coverage + note dead branches | M3, Gap2/3/4 | pr-test, comment | **Closed** (Gap5 residual) |
| `76679f2` month-name secs / day-first MDY / ISO invalid-time | L4 | pr-test | **Closed** |
| `d54a593` hoist `today`/`aiDate`/`aiDistance` | L5 | code-simplifier, typescript | **Closed** (behavior-identical) |
| `6550462` / `864f952` log deferrals + phone-app bugs | L2/L3/L6, F2/F3 | type-design, silent-failure, typescript | **Deferrals justified** |

## Reviewer verdicts at a glance (fix delta)

| Lane | Closed | Deferral-justified | Residual / note | Lane verdict |
|---|---|---|---|---|
| typescript-reviewer | MEDIUM-1, MEDIUM-2, L5 | LOW-4 (DST) | LOW-3 accepted; 1 note (`OCC2024-06-15` letter-prefix) | APPROVE |
| silent-failure-hunter | F1 | F2, F3 (pre-existing) | none (no new silent failure) | APPROVE |
| type-design-analyzer | F1 (doc-resolved) | F2, F3 | 1 LOW informational (caller-coupling) | APPROVE |
| pr-test-analyzer | Gap1,2,3,4,6,7,L4, M1 | — | **Gap5** (narrow, Important) | APPROVE-with-note |
| code-simplifier | L5 | — | none | APPROVE |
| comment-analyzer | F1, F2 + new comments | — | none (sub-threshold "~28d" nit) | PASS |

**Aggregate decision: APPROVE (with comments)** — the original HIGH is closed; no remaining or newly-introduced HIGH; only MEDIUM/LOW residuals.

## Closed findings — verification detail

- **H1 `sourceContainsFullDate` substring false-positive — CLOSED (3-lane verified).** `year-disambiguation.ts:81` now `candidates.some(c => new RegExp(`(?<![\d/-])${c}(?![\d/-])`).test(sourceText))`.
  - *typescript* hex-inspected the `\\d` → `\d` escaping and walked it: `"11/5/2024"` vs `(1,5,2024)` → `false` (preceding `1` is a digit, lookbehind blocks); legit `"on 2024-06-15."` → `true`; ref `"2024-06-15-44321"` → `false`. No ReDoS (fixed-width assertions, numeric candidates, no quantifiers/alternation).
  - *silent-failure* confirmed the fix introduces **no new silent failure**: the only false-negative it can cause (adjacent `/`/`-`, e.g. a URL path) falls through to proximity, which either agrees (no warning) or disagrees (emits an `ImportWarning`) — worst case is a *surfaced* warning, never silent wrong data.
  - *pr-test* confirmed two genuine regression guards (unit `=== false` + e2e `chosenYear === 2026 / ai_year_implausibly_old`) that both fail if reverted to `.includes`.
- **M1 `findYearTokenNear` first-occurrence-only — CLOSED.** `while` loop over `indexOf(fragment, idx+1)` scans all occurrences; termination proven (index strictly advances). Tested via the year-less-first / year-bearing-second case.
- **M2 `chosenDate` invalid-string footgun — DOC-RESOLVED.** JSDoc now states the invalid passthrough, the unreachability through `needsDisambiguation` (1..12 → both interpretations valid), and the caller's `isValidDate` re-validation. Type kept for verbatim-port parity. Comment + type-design lanes both verified accuracy.
- **M3 test-matrix holes — CLOSED.** `*_closer_by_7plus` now assert exact `chosenDate` (a month/day swap would fail); `year_outside_proximity_window` boundary asserted both sides (2024 triggers / 2025 doesn't); `close_call`/`equidistant` documented as unreachable.
- **L1 determinism comment — CLOSED.** `datetime-normalize` header now discloses the `Date.now()` default and scopes the determinism claim to the always-injecting production path (verified against `run-import.ts:63-66`).
- **L4 coverage / L5 hoist — CLOSED.** Month-name+seconds, MDY day-first (`first>12`), ISO invalid-time tests added; the hoist is behavior-identical (single `daysBetweenAbs`, early return preserved).

## Deferral justifications — verification detail

All meet the rubric (cited by ID · specific rationale · concrete un-defer trigger):
- **`deferred.md #13`** — L2 (`normalized` 3-state) + L3 (`chosenYear:0` sentinel): YAGNI, no consumer branches on the distinction today; trigger = Slice B (import-completion screen) needing it. *(type-design notes F3 should be addressed before F2 when that lands.)*
- **`deferred.md #14`** — L6 (DST edge in `inferYearByProximity`): ~1h window twice a year on the grace boundary; trigger = align to the UTC-midnight `daysBetweenAbs` pattern in both demo and phone source.
- **`deferred.md #15`** — F2/F3 (`selectAdjustedScopes` empty catch, `roundTo5Min` passthrough): **pre-existing, outside this PR's diff**; latent (callers guard upstream); trigger = next time `selectors.ts`/`time.ts` are touched. Silent-failure confirmed neither is worsened by the date-normalization wiring.

## Comments / residuals (non-blocking)

- **Gap5 (pr-test, Important, narrow) — the one open item.** No integration test exercises the cold-case guard firing *via `sourceContainsFullDate`* — every `disambiguateHallucinatedYear` test triggers it via `findYearTokenNear`. So removing `sourceContainsFullDate` from the `||` guard would not fail any test, and a document with only a numeric date (`"seized 2024-02-05 footage"`, no prose month) would silently lose cold-case protection. The function is unit-tested and the false-positive direction is guarded end-to-end; this is a composition gap. One-liner closes it:
  ```ts
  it('cold-case guard fires via sourceContainsFullDate (numeric-only source)', () => {
    const r = disambiguateHallucinatedYear('2024-02-05T13:00', 'seized 2024-02-05 footage', NOW)
    expect(r.reason).toBe('ai_year_plausible')
    expect(r.chosenDate).toBe('2024-02-05T13:00')
  })
  ```
- **typescript LOW note** — a literal reference like `OCC2024-06-15` (letter prefix, nothing after) still passes the lookbehind (letters aren't in `[\d/-]`); the lookahead blocks the `-44321` suffix form. Far narrower than the original substring bug and arguably indistinguishable from a real date citation — acceptable.
- **type-design LOW (informational)** — the corrected `chosenDate` JSDoc leans on "the one caller re-validates"; that's a snapshot, not a permanent contract. A future direct caller without the `isValidDate` guard would silently invalidate the claim. `chosenDate: string | null` would eliminate it; deferred for parity.
- **comment nit (sub-threshold)** — "~28+ days" is really a 27-day minimum (Feb 3 vs Mar 2); the `~` covers it and the conclusion (≫ 7-day threshold) is unaffected.

## Architecture invariants — re-verified clean

- The cold-case guard now reports only dates the source **actually contains** (boundary-guarded both flavors); the false-positive that silently trusted a hallucinated year is gone, and the fix can't silently misfire the other way.
- Determinism unchanged: production injects a single event-scope `currentTimeMs`; tests inject fixed `NOW`; the comment no longer overstates it.
- No new types, no new deps; `tsc` clean; 484 tests pass.
- Forensic discipline: H1 and M1 logged as upstream phone-app bugs in `phone-app-debug.md` to port back — the demo is now ahead of source.

## Recommended next steps

**Ready for merge.** Optional one-line follow-up: add the Gap5 numeric-only-source test to lock the `sourceContainsFullDate` trigger arm. The type-honesty deferrals (`#13`) are correctly parked until Slice B; the DST edge (`#14`) and the pre-existing backlog (`#15`) are tracked.

## Reviewer pipeline notes

- **Triple-lane verification of the HIGH fix** — typescript (regex escaping + input walk), silent-failure (no-new-silent-failure direction check), and pr-test (revert-would-fail regression guards) each closed H1 from a different angle. The strongest possible signal that a security-of-correctness fix actually holds.
- **The fix that begets a residual:** boundary-guarding `sourceContainsFullDate` (H1) made the test lane realize that arm was never the sole guard trigger (Gap5) — a pre-existing composition gap surfaced *by* the fix, not introduced by it. Correctly Important-not-blocking.
- **Clean REVISE → APPROVE transition** with no regressions and every deferral rubric-checked; the author's upstream-bug log (`phone-app-debug.md`) is exemplary forensic provenance for a ported module.
