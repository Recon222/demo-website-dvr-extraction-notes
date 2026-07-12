# PR 16 — Aggregate Code Review

**PR:** [#16](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/16) — `feat(demo): import date normalization — MM/DD + year disambiguation (parity Slice A)`
**Branch:** `feat/demo-import-date-normalization` → `master` · **16 files, +1145 / −50**
**Cut:** Slice A (data normalization). Slice B (the rich import-completion screen that renders these warnings) is a separate follow-up PR.
**Reviewers (fresh fan-out):** typescript-reviewer · silent-failure-hunter · type-design-analyzer · pr-test-analyzer · code-simplifier · comment-analyzer
**Date:** 2026-06-28

## Verdict
**REVISE.**

A well-built, faithfully-ported date-normalization pipeline that genuinely fixes the PR #15 free-text-date shortcut (verified: imported dates are now canonical, so pickers/offset/retention can consume them). The format parsing, AM/PM, leap-year, future-date, and disambiguation flows are correct, and the production path injects the clock properly. **One HIGH** holds it at REVISE: a substring false-positive in the year cold-case guard (`sourceContainsFullDate`) that can silently trust a hallucinated year — independently caught by three lanes. The fix is one boundary-guarded regex plus its regression test; the rest are MEDIUM/LOW polish.

## Pre-flight gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `pnpm test` | ✅ **65 files / 478 passed** |
| Coverage | ✅ ~97% (new modules ≥90%; gate ≥80%) |
| Dependencies | None added |

## Reviewer lanes

Diff-driven triage. This is a **pure-logic** PR (3 new `engine/logic/` date modules + wiring; no API route, no UI components, no deps) → TS/correctness · silent-failure · type-design · tests · simplifier · comments. **No security or React lanes** — nothing in the diff applies.

## Reviewer verdicts at a glance

| Lane | C | H | M | L | Verdict |
|---|---|---|---|---|---|
| typescript-reviewer | 0 | 0 | 2 | 2 | approve-with-caution |
| silent-failure-hunter | 0 | 1* | 0 | 2† | REVISE |
| type-design-analyzer | 0 | 0 | 1 | 2 | REVISE |
| pr-test-analyzer | 0 | 0 | — | — | not clean (gate) |
| code-simplifier | 0 | 0 | 0 | 1 | APPROVE (1 safe refactor) |
| comment-analyzer | 0 | 0 | 2 | 0 | conditional pass |

<sub>*silent-failure rated its `sourceContainsFullDate` finding MEDIUM; aggregated to HIGH on the 3-lane convergence + silent-wrong-data path. †two of silent-failure's findings are pre-existing code outside this PR's diff — see "Out of scope".</sub>

**Aggregate decision: REVISE** (0 CRITICAL · 1 HIGH).

## Findings (deduped, ranked by severity)

### CRITICAL
None.

### HIGH

**H1 — `sourceContainsFullDate` substring false-positive silently trusts a hallucinated year.** _(3-lane convergence: typescript MEDIUM-1 · silent-failure F1 · pr-test Gap-1)_ — `year-disambiguation.ts:52-72`.
The cold-case guard builds candidate date strings including the **unpadded** `${m}/${d}/${y}` / `${d}/${m}/${y}` forms and tests them with `sourceText.includes(candidate)` — **no word boundaries**. So `sourceContainsFullDate(src, 2024, 1, 5)` returns `true` for a source containing `"11/5/2024"` (November 5) because `"1/5/2024"` is a substring of `"11/5/2024"`. The guard reports the source "explicitly states this date" when it does not, so `disambiguateHallucinatedYear` returns `{ confidence:'high', reason:'ai_year_plausible' }` and **trusts the AI year, bypassing proximity correction — with no `ImportWarning`**. In a forensic tool that's a silently-wrong date wearing a high-confidence label. (`windowContainsYear` already does this correctly with `(?<![#\w/])${year}(?![/\w-])`; `sourceContainsFullDate` has no equivalent.) Not covered by any test.
→ **Fix:** boundary-guard each candidate (require non-digit/non-`-`/non-`/` on both sides), mirroring `windowContainsYear`; add the regression test (`expect(sourceContainsFullDate('11/5/2024 …', 2024, 1, 5)).toBe(false)`).

### MEDIUM

**M1 — `findYearTokenNear` inspects only the first occurrence.** _(typescript MEDIUM-2)_ — `year-disambiguation.ts:37-44`. `sourceText.indexOf(dateFragment)` returns the first match only; a document that mentions the date twice (first year-less, then with the correct year within ±150 chars) misses the guard → proximity wrongly "corrects" an already-correct year. → Scan all occurrences (loop `indexOf` from the last index, or `matchAll`) and return true if any window contains the year.

**M2 — `DateDisambiguationResult.chosenDate` can be an invalid calendar string; the JSDoc misdirects the guard.** _(type-design F1 · comment F2 · silent-failure Mode-2)_ — `date-disambiguation.ts:21-31, 121-131`. For `reason:'neither_interpretation_valid'`, `chosenDate` is a raw passthrough like `"2026-13-13"`, with the only protection a JSDoc "narrow on `reason` before using it." The actual caller (`datetime-normalize.ts:117-119`) guards via `isValidDate`, not a reason check — so the JSDoc prescribes the wrong guard. **Practically latent** (all three lanes confirmed the branch is unreachable through `needsDisambiguation`, which forces both values into 1..12 → both interpretations valid; and the caller re-validates), so no live bug — but it's a public-API footgun + misleading comment. → `chosenDate: string | null` (null on that arm), or correct the JSDoc to state the unreachability and the real `isValidDate` guard.

**M3 — Test-coverage holes in the date matrix.** _(pr-test)_ Beyond H1's missing regression guard: `mm_dd_closer_by_7plus` / `dd_mm_closer_by_7plus` assert `reason`/`chosenFormat` but **not `chosenDate`** (a month/day-swap bug would pass — false coverage); the `year_outside_proximity_window` boundary (2024 triggers / 2025 doesn't) is untested; the `sourceContainsFullDate` arm of the cold-case guard is never the trigger in the existing test (it fires via `findYearTokenNear`, so a broken `sourceContainsFullDate` passes); and `close_call` / `equidistant` are untested **and effectively dead** (ambiguous 1..12 interpretations always differ by ≥~28 days, so the 7-day threshold can't fire) — document the unreachability or add synthetic-input tests. → Add the named assertions/tests (each ≤10 lines).

### LOW

- **L1 — `Date.now()` default param + the determinism claim it contradicts.** _(typescript LOW-3 · comment F1 · type-design F4)_ `datetime-normalize.ts:27` `currentTimeMs = Date.now()` and `import-normalize.ts:205` `?? Date.now()` are call-time (not module-scope) and **never reached in production** (`run-import.ts:63` injects a single `Date.now()` at event scope and threads it through) — so the code is fine. But the module header's *"Pure + deterministic: the only clock input is the injected `currentTimeMs`"* is **false for `datetime-normalize`** (the identical claim in the other two modules is accurate — they have no default). → Correct that one header sentence; optionally drop the default or add a dev-only assertion.
- **L2 — `DateTimeNormalizationResult.normalized` carries three states behind an untagged string** (canonical / original-passthrough / `''`-blanked), with the `''` case undocumented. _(type-design F2)_ Optional `status: 'ok'|'passthrough'|'blanked'` discriminant removes the string-sniffing.
- **L3 — `YearDisambiguationResult.chosenYear: 0` magic sentinel** for `unparseable_passthrough` (never consumed today; `new Date(0,…)` hazard if a future caller reads it). _(type-design F3)_ `number | null`.
- **L4 — More coverage nice-to-haves:** month-name format with seconds; the MDY `first > 12` unambiguous branch; the ISO invalid-**time** branch. _(pr-test 6,7,11)_
- **L5 — Safe local dedup:** `year-disambiguation.ts:144-161` calls `daysBetweenAbs(aiDate, today)` twice in one return literal and reconstructs `today`/`aiDate` in both the guard branch and step 3 — hoist once. Behavior-identical, no parity cost. _(code-simplifier F1)_
- **L6 — DST edge in `inferYearByProximity`** (`year-disambiguation.ts:75-81`) uses raw-ms diff vs the UTC-midnight pattern used elsewhere; a date exactly 24–25h future during a 1h DST transition could pick the wrong year. Extremely narrow; note only. _(typescript LOW-4)_

## Out of scope (pre-existing, not introduced by this PR)

The silent-failure lane surfaced two items **outside this PR's diff** — flagged for the backlog, not counted against PR #16: `selectAdjustedScopes`'s empty `catch` lacks the dev-warn its sibling `generateExtractedScopes` has (`store/selectors.ts`); and `roundTo5Min` silently returns unparseable input unchanged, against `time.ts`'s own "fail loud" rule (`logic/time.ts`). Both are latent (current callers guard upstream).

## Architecture invariants checked & confirmed

- **The PR's premise holds:** imported time-frame dates are now normalized to canonical `"YYYY-MM-DD HH:MM[:SS]"` in `normalizeFrameTime` before `applyImport`; the `ImportTimeFrame` JSDoc correction is accurate.
- **No silently-wrong canonical date reaches `startDateTime`:** unparseable → original passthrough **with a `datetime` warning** (surfaced through `ImportWarning` → modal); invalid calendar dates are re-validated (`isValidDate`) before formatting; both-future → blank with warning. The one exception is H1 (year guard), which is why it's the blocker.
- **Determinism in production:** `run-import` reads `Date.now()` once at event scope and threads `currentTimeMs` + `sourceText` through `parseNormalizeMap`; tests inject a fixed `NOW`. No module/render-scope clock read.
- **Warnings don't get lost** across multiple time-frames (single shared array, append-only; future-warning concatenates).
- **Correctness spot-checks passed:** AM/PM 12h↔24h edges, leap-year validity (1900/2000/2024), the `mmddDate!`/`ddmmDate!` non-null assertions (only reached after Cases 1–4 return), OCC#-reference-number immunity (unit + e2e), and the `daysBetween`/`daysBetweenAbs` UTC-midnight day math.
- **Retired test assertions are correct** — the old free-text-date contracts in `import.test.ts` / `store-actions.test.ts` were properly inverted to the new canonical behavior; no coverage regression.

## Recommended next steps

One small commit clears the blocker and the cheap wins: **(1)** boundary-guard `sourceContainsFullDate` + add the false-positive test (H1); **(2)** scan all occurrences in `findYearTokenNear` (M1); **(3)** the M3 test additions (`chosenDate` assertions, the proximity-window boundary, the `sourceContainsFullDate` trigger arm, and an unreachability note for `close_call`/`equidistant`); **(4)** correct the `datetime-normalize` header determinism claim (L1). The type-honesty items (M2 `chosenDate: string\|null`, L2 `status`, L3 sentinel) and L5 dedup are good follow-ups; weigh M2/L2/L3 against verbatim-port parity (additive fields cost the least).

## Agent IDs
<!-- Used by a fix-delta re-review to resume these reviewers via SendMessage. -->
- typescript-reviewer: `a4e600c9f1bd73ca0`
- silent-failure-hunter: `a0dbb0956b7d34b8f`
- type-design-analyzer: `afbf6f7821eab938e`
- pr-test-analyzer: `a16e02db3e9190b49`
- code-simplifier: `a7543d08327a0f96c`
- comment-analyzer: `acede58a3ac4c2438`
- security-reviewer: not dispatched (no API/secret/network surface)
- react-reviewer: not dispatched (no UI components changed)

## Reviewer pipeline notes

- **Triple-lane convergence on H1** (typescript + silent-failure + pr-test independently found the `sourceContainsFullDate` substring match) is the strongest signal — a real silent-wrong-data path in the PR's headline feature, with a one-line fix the test lane had already written.
- **Code-vs-comment dedupe on the clock seam:** the correctness lanes rated the `Date.now()` default *latent/fine* (production injects), while the comment lane caught that the module header *claims* strict injection — the finding is the inaccurate comment, not the code. Clean cross-lane split.
- **"Latent, not live" is doing real work here:** M2 (`neither_interpretation_valid`) and the dead `close_call`/`equidistant` branches were confirmed unreachable through the intended interface by three lanes — kept as MEDIUM/LOW footguns, not escalated.
- **Verbatim-port parity respected:** the simplifier and type-design lanes flagged cross-module dedup/type-widening but explicitly weighed the parity-drift cost against the forensic source — only the zero-parity-cost local dedup (L5) is recommended outright.
