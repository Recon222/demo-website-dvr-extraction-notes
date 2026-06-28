# Live PDF Import (sandbox) — Test Specification

**Prerequisites:** [`01-demo-pdf-import-architecture.md`](./01-demo-pdf-import-architecture.md) · [`02-demo-pdf-import-implementation-plan.md`](./02-demo-pdf-import-implementation-plan.md)

## Conventions

- Runner: Vitest + jsdom + Testing Library (existing config). Co-located `__tests__/`.
- **Layered mocking:** pure engine tests mock nothing; the orchestrator mocks the IO services (`extract-client`, `pdf-extract`); the route test mocks global `fetch`; component/bridge tests mock the orchestrator and `next/navigation`.
- **No network, no real model, no real pdf.js** in any test. The live round-trip is verified manually (Appendix C of the plan).
- Determinism: any "today" comes from an injected/fixed clock; never real `Date`.

## Shared fixtures

`features/demo/engine/logic/__tests__/import-fixtures.ts` (new):
- `RAW_CLEAN` — a model reply (JSON string, no fences) with already-clean fields.
- `RAW_MESSY` — JSON wrapped in ```json fences + chatter; officer `"Det. Naplioni #2015"`, badge `""`, phone `"(416) 487-7387"`, `hasVideoMonitor: "true"`, a time frame with `timePeriodType: "recorder time"` and free-text times.
- `RAW_NULLS` — fields set to `"N/A"`, `"none"`, `"-"`, `""`.
- `RAW_NO_JSON` — `"the model said no"` (no object).

---

## Phase 1 — `import-normalize.test.ts`

**`coerceField` / `isNullValue`**
- it coerces `"N/A"`, `"none"`, `"-"`, `"  "`, `"unknown"` → `''`; trims real values; keeps `"35 days"`.

**`normalizePhoneNumber`**
- it formats `"(416) 487-7387"`, `"4164877387"`, `"+1 416-487-7387"`, `"1-416-487-7387"` → `"416-487-7387"`; returns trimmed original for non-10-digit (`"123"` → `"123"`); `""`/`"  "` → `''`.

**`normalizeYesNo`**
- it maps `"true"/"y"/"YES"` → `"Yes"`, `"false"/"n"/"NO"` → `"No"`, `"unknown"/""` → `''`.

**`normalizeTimePeriodType`**
- it maps `"recorder time"/"dvr"/"system time"` → `"DVR Time"`, `"real time"/"live"/"actual"` → `"Actual Time"`, unknown → `"Actual Time"` (safe default).

**`normalizeOfficerFields`**
- it extracts badge from `"Det. Naplioni #2015"` (badge empty) → name `"Det. Naplioni"`, badge `"2015"`, with two warnings (badge extracted + name cleaned).
- it extracts badge from a numeric email local-part `"2015@yrp.ca"` when name has none.
- it keeps the AI-provided badge when the name carries a different one (+ a divergence warning).

**`normalizeExtractedFields`**
- it coerces all null indicators to `''` (`RAW_NULLS` parsed → all-blank fields, no throw).
- it leaves time-frame `extractionStartTime`/`extractionEndTime` **as free text** (e.g. `"11:45 PM on March 8 2025"` unchanged) while normalizing `timePeriodType` and coercing `cameraDetails`.
- it returns warnings for officer/phone/enum transformations.

**`parseNormalizeMap`**
- it parses `RAW_MESSY` (fences + chatter) → a `MappedImport` with `requesterName: "Det. Naplioni"`, `requesterBadgeNumber: "2015"`, formatted phone, `_import.hasVideoMonitor: "Yes"`, one time frame with `isActualTime: false` (DVR time) and free-text start/end.
- it does **not** map `occurrenceNumber` (no requester OCC# leaks into the patch).
- it reports a `fieldCount` > 0 for `RAW_CLEAN` and `fieldCount === 0` for an all-null payload (the blank-vs-garbage signal).
- it throws on `RAW_NO_JSON`.

---

## Phase 2 — `app/api/extract/__tests__/route.test.ts`

Mock global `fetch`; set/unset `process.env.OLLAMA_API_KEY` per test (restore in `afterEach`).

- it returns `400 BAD_REQUEST` for an empty/missing `documentText`.
- it returns `503 NOT_CONFIGURED` when `OLLAMA_API_KEY` is unset (and does **not** call `fetch`).
- it calls Ollama with `Authorization: Bearer <key>`, the system+user messages, `stream:false`, and returns `200 { rawText }` from `choices[0].message.content` (assert `fetch` called once with the right URL/headers/body shape).
- it truncates `documentText` longer than `MAX_DOCUMENT_CHARS` (assert the forwarded user content length is capped and ends with `[TRUNCATED]`).
- it returns `502 UPSTREAM_ERROR` when `fetch` resolves non-OK or rejects/aborts.

---

## Phase 3 — orchestrator + client

**`extract-client.test.ts`** (mock global `fetch`)
- `200` → `{ ok:true, rawText }`.
- `503` → `{ ok:false, notConfigured:true }`.
- `500` / network throw → `{ ok:false, notConfigured:false }`.

**`run-import.test.ts`** (mock `./extract-client` and `./pdf-extract`)
- `runImport({ live:false })` → uses SAMPLE, `usedFallback:true`, `ok:true`, a `patch` with `requesterName` from `SAMPLE_EXTRACTION`, emits stages `reading_model → normalizing → done`.
- `runImport({ live:true })` with `requestExtraction` → `{ ok:true, rawText: RAW_MESSY }` → `usedFallback:false`, mapped patch, no fallback warning.
- `runImport({ live:true })` with `requestExtraction` → `{ ok:false, notConfigured:true }` → falls back to SAMPLE, `usedFallback:true`, includes a "Live model unavailable" warning.
- `runImport({ live:true })` where `parseNormalizeMap` throws (mock `requestExtraction` → `{ ok:true, rawText: RAW_NO_JSON }`) → `{ ok:false, error }`, stage `error`.
- `runPdfImport(file)` happy path → `extractPdfText` mocked to return text → delegates to `runImport`, result carries `filename`; emits `extracting_text` first.
- `runPdfImport(file)` when `extractPdfText` throws `PdfExtractionError` → `{ ok:false, error }`, no model call.

---

## Phase 4 — UI + bridge

**`ImportModal.test.tsx`** (presentational; pass props directly)
- picker stage renders "Pick a PDF" + "Paste text"; clicking "Pick a PDF" calls `onPickPdf`.
- progress stage renders the active stage label + `Importing 2 of 3…` when `batch` is given.
- result stage renders the location name + field count; expands `warnings` (shows a `reason`); shows the `usedFallback` notice when true; lists failures.

**`DemoExperience.sandbox.test.tsx`** (extend; mock `next/navigation` to `mode=sandbox`; mock `@/features/demo/ui/import/run-import`)
- import (PDF): stub `runPdfImport` → `{ ok:true, patch, fieldCount, warnings:[], usedFallback:false, filename }`; simulate a file `change` on the hidden input → asserts a new Location is created (`store` locations grew) and the result stage shows success.
- import batch: stub `runPdfImport` to resolve twice → two Locations created; result reports 2 succeeded.
- import (PDF) failure: stub `runPdfImport` → `{ ok:false, error }` → no Location created; failure shown.
- guided determinism: with `mode` unset (guided), the paste/import path passes `live:false` to the orchestrator (assert the stub received `live:false`) — no network even if a key existed.

**Guided import chapter** (existing test): unchanged — still resolves deterministically via SAMPLE; assert it stays green (regression guard).

---

## Coverage

- Engine `import-normalize.ts` ≥ 90% (pure, fixture-driven).
- `run-import.ts`, `extract-client.ts`, route handler ≥ 80% via the branch tests above (fallback, not-configured, upstream-error, parse-throw, pdf-error).
- Global gate stays ≥ 80%. pdf.js internals are **not** counted (mocked); `extractPdfText`'s own branch (min-length throw) is covered by mocking `pdfjs-dist`'s `getDocument` to yield short vs sufficient text.

## Out of scope for tests
The live Ollama round-trip and real pdf.js worker execution (jsdom has no worker/PDF engine) — verified manually per plan Appendix C.
