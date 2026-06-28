# Import Date Normalization (Slice A) — Test Specification

**Prerequisites:** [`01-...-architecture.md`](./01-date-normalization-architecture.md) · [`02-...-implementation-plan.md`](./02-date-normalization-implementation-plan.md)

## Conventions
- Vitest + jsdom; co-located `__tests__/`. All three modules are pure → unit-tested with a **fixed `currentTimeMs`** (no real clock). Ported from the phone fixtures; cover every branch / reason-code, not every phone fixture verbatim.
- Reference "today" for most cases: **`2026-06-28`** (a fixed ms constant), with year-specific cases choosing their own.

## `date-disambiguation.test.ts`
- `needsDisambiguation`: both ≤12 → true; either >12 → false; zero/negative → false.
- `isValidDateInterpretation`: per-month limits; Feb 28/29 (leap 2024, non-leap 2025, century 1900/2000).
- `daysBetween`: order-independent; cross-year.
- `disambiguateDateFormat` — one case per reason code:
  - `only_mm_dd_valid` (e.g. 03/25), `only_dd_mm_valid` (e.g. 25/03)
  - `both_interpretations_identical` (05/05)
  - `neither_interpretation_valid` (13/13)
  - `future_interpretation_rejected` (one reading future → pick past, high conf)
  - `both_interpretations_future` (both future → low conf; caller blanks)
  - `year_outside_proximity_window` (year < currentYear-1 → MM/DD low conf)
  - `mm_dd_closer_by_7plus` / `dd_mm_closer_by_7plus` (≥7-day gap → high conf)
  - `close_call` / `equidistant` (defensive; document reachability)

## `year-disambiguation.test.ts`
- `sourceContainsFullDate`: dashed-ISO, MDY/DMY dash+slash, padded/unpadded true; missing-year/wrong-date/empty false.
- `findYearTokenNear`: year adjacent (true); outside ±150 window (false); among other tokens (true); **reference-number immunity** (`OCC#2024-44321` → false); phone-number digits → false; empty inputs → false.
- `inferYearByProximity`: past M/D → current year; future M/D (>1 day) → prior year; exact-today + 1-day grace; year-end boundary.
- `disambiguateHallucinatedYear`:
  - unparseable input → `unparseable_passthrough`.
  - source states the year (cold case) → `ai_year_plausible`, unchanged (even if old).
  - no source year, AI year == inferred → `ai_year_plausible`, silent.
  - AI year < inferred → `ai_year_implausibly_old`, corrected.
  - AI year > inferred → `ai_year_implausibly_future`, corrected.
  - OCC-number near date does NOT confirm a hallucinated year.

## `datetime-normalize.test.ts`
- Passthrough/precision: `"2026-01-04 13:00"` unchanged; `"...13:00:05"` seconds preserved; **T-separator** `"2026-02-05T13:00:05"` → space.
- Email/military: `"2026/01/04 1300hrs"`, `"...1300"`, 3-digit time, trailing `"to"`.
- Month-name: `"Jan 27, 2026 at 16:00"`, `"January 27, 2026 16:00"`, single-digit day, optional comma/"at", seconds.
- MDY slash + 12-hour: `"01/04/2026 1:00:30 PM"` → `"2026-01-04 13:00:30"`; midnight/noon edge (12 AM→00, 12 PM→12).
- Disambiguation passthrough: an ambiguous MDY (both ≤12) emits the disambiguation warning + chosen date (delegation works); both-future → blanked value + "enter manually" warning.
- Invalid values (Feb 30) → original + "Invalid date/time" warning. Unparseable → original + "Could not parse" warning. Empty → `''` + "Empty" warning.
- Future date (valid, after `currentTimeMs`) → appends "is in the future" warning.

## `import-normalize.test.ts` (updated)
- **Invert the prior "free text" assertion:** `normalizeExtractedFields(parseAiJson(RAW_MESSY), { currentTimeMs: <2025-04-12>, sourceText: SAMPLE-ish })` → `extractionStartTime === "2025-03-08 23:45"` (was the raw `"11:45 PM on March 8 2025"`); `timePeriodType === "DVR Time"` still holds.
- `parseNormalizeMap(RAW_MESSY, { currentTimeMs, sourceText })` → `patch._import.timeFrames[0].startDateTime === "2025-03-08 23:45"`; `timeFrameCount === 1`.
- Warnings include datetime/year entries when a transformation occurred (e.g. a hallucinated-year fixture → a `year_correction` warning); none when the value was already canonical.
- Existing officer/phone/enum/null + zero-field-signal cases unchanged.

## Coverage
- Three new engine modules ≥90% (pure, fixture-driven). Global gate ≥80% holds.
- No network, no real clock, no real model anywhere.

## Out of scope
UI/completion-screen tests (Slice B). `run-import.test.ts` continues to assert patch fields, not dates (date-normalization runs against the real clock there but the SAMPLE's cold-case guard keeps it deterministic).
