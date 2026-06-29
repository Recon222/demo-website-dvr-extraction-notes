# Import Date Normalization (Slice A) — Implementation Plan

**Prerequisite:** [`01-date-normalization-architecture.md`](./01-date-normalization-architecture.md). Tests: [`03-date-normalization-test-spec.md`](./03-date-normalization-test-spec.md).

## Architecture decisions (recap)
| Decision | Choice |
|---|---|
| Port the 3 phone modules verbatim-in-logic | yes (pure, clock-injected) |
| Output | `"YYYY-MM-DD HH:MM[:SS]"` (demo canonical) |
| Clock | `currentTimeMs` param, default `Date.now()` in `runImport` |
| sourceText | live→`documentText`, SAMPLE→`SAMPLE_REQUEST_DOC` |

## Phase 1 — Port `date-disambiguation` (no deps)
**New `engine/logic/date-disambiguation.ts`** — port verbatim: `needsDisambiguation`, `isValidDateInterpretation`, `daysBetween`, `disambiguateDateFormat` + `DateDisambiguationResult` / `DisambiguationReason` (11 codes), `CONFIDENCE_THRESHOLD_DAYS=7`, `PROXIMITY_YEAR_LOOKBACK=1`, internal `formatDate`. Trim the OCR-autonomy header to a short note. No demo deps.
**Gate:** `date-disambiguation.test.ts` green; `tsc`.

## Phase 2 — Port `year-disambiguation` (no deps)
**New `engine/logic/year-disambiguation.ts`** — port verbatim: `disambiguateHallucinatedYear`, `inferYearByProximity`, `sourceContainsFullDate`, `findYearTokenNear` + `YearDisambiguationResult`/`YearDisambiguationReason` (4 codes), constants (`YEAR_GUARD_WINDOW_CHARS=150`, `FUTURE_GRACE_DAYS=1`), internal `windowContainsYear`/`daysBetweenAbs`/`parseAiDate`/`formatDate`.
**Gate:** `year-disambiguation.test.ts` green; `tsc`.

## Phase 3 — Port `datetime-normalize` (depends on Phase 1)
**New `engine/logic/datetime-normalize.ts`** — port `normalizeDateTime` + `DateTimeNormalizationResult` and all matchers (`tryIso`, `trySlashYmdMilitary`, `tryMonthNameFormat`, `tryMdySlashFormat`), helpers (`appendFutureDateWarning`, `parseMilitaryTime`, `formatDateTime`, `isValidDate`, `isValidTime`, `MONTH_MAP`). Imports `needsDisambiguation`/`disambiguateDateFormat` from `./date-disambiguation`.
**Gate:** `datetime-normalize.test.ts` green; `tsc`.

## Phase 4 — Wire into `import-normalize`
**Edit `engine/logic/import-normalize.ts`:**
- Add `interface NormalizeOptions { currentTimeMs?: number; sourceText?: string }`.
- `normalizeExtractedFields(ai, opts?: NormalizeOptions)`: default `currentTimeMs = Date.now()`, `sourceText = ''`. For each time frame, replace the raw-passthrough with the phone's per-frame logic (mirrors `normalize-peel-output.normalizeTimeFrames` + `applyYearDisambiguation`):
  1. `const s = normalizeDateTime(rawStart, currentTimeMs)` → push warning if `s.warning`.
  2. `const sy = disambiguateHallucinatedYear(s.normalized, sourceText, currentTimeMs)` → if `reason` is `ai_year_implausibly_old|future`, use `sy.chosenDate` + push a year-correction warning; else keep `s.normalized`. (Silent on `ai_year_plausible`/`unparseable_passthrough`.)
  3. Same for end. `timePeriodType`/`cameraDetails` unchanged.
- `parseNormalizeMap(rawText, opts?: NormalizeOptions)`: thread `opts` into `normalizeExtractedFields`.
- Keep an exported `ImportWarning` shape; add an optional `kind?: 'datetime' | 'year_correction'` discriminator (so Slice B can group them) — optional, low-cost.
**Gate:** updated `import-normalize.test.ts` green (the "free text" case now asserts canonical); `tsc`.

## Phase 5 — Thread through `run-import` + fix the comment
**Edit `ui/import/run-import.ts`:**
- Import `SAMPLE_REQUEST_DOC` from `engine/content/seed`.
- `runImport`: `const currentTimeMs = Date.now()`. Build `sourceText`: live-ok → `documentText`; SAMPLE (guided/`unavailable`/`error`) → `SAMPLE_REQUEST_DOC`. Call `parseNormalizeMap(rawText, { currentTimeMs, sourceText })`.
- `runPdfImport` unchanged (delegates to `runImport`, which now passes `documentText` as sourceText for the live branch).
**Edit `engine/logic/import.ts`:** rewrite the `ImportTimeFrame` JSDoc — remove the "requested-scope screen normalises these / free text" claim; state that the import pipeline now normalizes start/end to canonical `"YYYY-MM-DD HH:MM:SS"` (the scope screen only offers manual edit).
**Gate:** `run-import.test.ts` (dates not asserted there — still green); `tsc`.

## Phase 6 — Full verification
`pnpm test` · `tsc --noEmit` · `pnpm build` · `pnpm test:coverage` (≥80%; the 3 new engine modules are pure → easy ≥90%). Commit, push, PR.

## Appendix A — files
- **New:** `engine/logic/{date-disambiguation,year-disambiguation,datetime-normalize}.ts` + `__tests__/*`.
- **Edit:** `engine/logic/import-normalize.ts`, `ui/import/run-import.ts`, `engine/logic/import.ts`, `engine/logic/__tests__/import-normalize.test.ts`.
- No new dependencies.

## Appendix B — commit cadence
One commit per phase (1–3 = the three ports + their tests; 4 = wiring; 5 = run-import + comment; 6 = verification/coverage if anything trails). Keeps the PR reviewable module-by-module.
