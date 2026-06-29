# Import Date Normalization (Slice A) — Architecture & Design

**Siblings:** [`02-date-normalization-implementation-plan.md`](./02-date-normalization-implementation-plan.md) · [`03-date-normalization-test-spec.md`](./03-date-normalization-test-spec.md)
**Part of:** the "import parity" line. Slice A = full date normalization (this doc). Slice B = the rich completion screen (separate PR, later).

## Problem

PR #15 ported the import pipeline but **skipped the date normalizers** with a flawed rationale ("the scope screen normalizes them"). Verified against the code, that's false and leaves imports broken:

- `normalizeExtractedFields` currently leaves time-frame `extractionStartTime`/`extractionEndTime` as **raw free text** (only `timePeriodType`/cameras are normalized).
- `create-store.applyImport` writes that free text **straight into `scope.startDateTime`**.
- Every downstream consumer expects the canonical **`"YYYY-MM-DD HH:MM:SS"`** (`parsePartsLoose`/`STORED_RE`): the date/time **pickers**, the **time-offset math**, and **retention**. A real model reply like `"11:45 PM on March 8 2025"` or `"03/08/2025 13:00"` therefore fails to parse → the picker silently reseeds from the clock (imported date lost) and time-math/retention can't use it.

The demo has **no** date normalization anywhere, so there was nothing to "duplicate." This slice ports the phone app's normalization so imported dates land canonical — true pipeline parity.

## What we port (the phone app's three pure modules)

All three are **pure, no external libs, clock-injected via `currentTimeMs`** — they slot into the demo engine exactly like `retention.ts`, fully deterministic. Crucially, `normalizeDateTime` outputs **`"YYYY-MM-DD HH:MM[:SS]"`**, which is the demo's canonical contract (`parsePartsLoose` accepts optional seconds), so normalized imports feed the pickers, offset, and retention directly.

| Module (phone) | Demo file | Responsibility |
|---|---|---|
| `normalize-datetime.ts` | `engine/logic/datetime-normalize.ts` | Parse ISO / `YYYY/MM/DD HHMMhrs` / month-name / `MM/DD/YYYY [h:mm AM/PM]` → canonical; future-date warning; blank-on-both-future |
| `date-disambiguation.ts` | `engine/logic/date-disambiguation.ts` | MM/DD vs DD/MM by proximity-to-today + import rules (no-future, recency window); 11 reason codes |
| `year-disambiguation.ts` | `engine/logic/year-disambiguation.ts` | Correct a hallucinated year by proximity; **cold-case guard** (trust an explicit year in the source; reference-number immunity) |

These are ported **verbatim in logic** (the algorithms are forensic-grade and reviewed); only the module headers/JSDoc are trimmed to the demo and the warning objects feed the demo's `ImportWarning` shape.

## How it wires in

```
run-import.runImport({ documentText, live, onStage })
  rawText  = live ? model reply : SAMPLE_EXTRACTION
  sourceText = live ? documentText : SAMPLE_REQUEST_DOC   // must match rawText's origin
  currentTimeMs = Date.now()   // read in the event-handler scope (allowed); tests inject
        │
        ▼
parseNormalizeMap(rawText, { currentTimeMs, sourceText })
        │  parseAiJson → normalizeExtractedFields(parsed, { currentTimeMs, sourceText }) → mapAiToForm
        ▼
normalizeExtractedFields: for each time frame —
  start = normalizeDateTime(raw, currentTimeMs)            → canonical "YYYY-MM-DD HH:MM[:SS]" (+ warning)
  start = disambiguateHallucinatedYear(start, sourceText, currentTimeMs)  → year-corrected (+ warning)
  (same for end) ; timePeriodType + cameras as today
  push every transformation as an ImportWarning
```

The result: `MappedImport._import.timeFrames[].startDateTime/endDateTime` are **canonical**, so `applyImport` stores parseable scope dates → pickers seed correctly, offset/retention compute, and Slice B's completion screen can show real dates + the disambiguation warnings.

## Design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Port vs re-derive | **Port the three modules' logic verbatim** | Forensic, heavily-reviewed algorithms (no-future rule, cold-case guard, reference-number immunity). Re-deriving risks subtle parity drift. |
| Output format | Keep the phone's `"YYYY-MM-DD HH:MM[:SS]"` | Already the demo's canonical contract; `parsePartsLoose` handles missing seconds (→ 0). |
| Clock | `currentTimeMs` param, default `Date.now()` read inside `runImport` (event scope) | Matches the phone's deterministic-test seam; no module/render-scope clock read (SSR-safe rule intact). |
| `sourceText` pairing | live → `documentText`; SAMPLE → `SAMPLE_REQUEST_DOC` | The year cold-case guard needs the document the reply came from. `SAMPLE_REQUEST_DOC` states "March 8 2025" inline, so the sample stays 2025 under any clock. |
| Guided mode | No special pin needed | The sample's explicit-year guard keeps its dates correct; real `now` is right for sandbox. |
| Scope of test port | Cover **every branch/reason-code**, not every phone fixture verbatim | Parity of behavior, proportionate test volume. |

## Integration points (files touched)
- **New:** `engine/logic/datetime-normalize.ts`, `engine/logic/date-disambiguation.ts`, `engine/logic/year-disambiguation.ts` (+ co-located tests).
- **Edit:** `engine/logic/import-normalize.ts` (`normalizeExtractedFields` + `parseNormalizeMap` take `{ currentTimeMs, sourceText }`, normalize the time-frame dates, emit warnings).
- **Edit:** `ui/import/run-import.ts` (thread `currentTimeMs` + `sourceText`).
- **Edit:** `engine/logic/import.ts` (correct the now-false `ImportTimeFrame` "scope screen normalises" comment).
- **Edit tests:** `import-normalize.test.ts` (the "free text" assertion **inverts** to "normalized").

## Out of scope (Slice A)
The rich completion screen (Slice B). No UI changes here — purely the data normalization. Behavior visible immediately: imported scopes now hold canonical dates that the existing pickers / offset / retention consume.

## Risks & mitigations
- **Regex lookbehind** in `year-disambiguation` (`(?<![#\w/])`) — supported in Node 20+/evergreen browsers (demo is `ssr:false`, client-only); fine in vitest/jsdom.
- **SAMPLE date drift** under real `now` — neutralized by the cold-case guard (year is inline in `SAMPLE_REQUEST_DOC`) + the live/SAMPLE `sourceText` pairing.
- **Determinism** — every module takes `currentTimeMs`; tests inject a fixed value; no `Date.now()` at module/render scope.
