# Live PDF Import (sandbox) — Architecture & Design

**Siblings:** [`02-demo-pdf-import-implementation-plan.md`](./02-demo-pdf-import-implementation-plan.md) · [`03-demo-pdf-import-test-spec.md`](./03-demo-pdf-import-test-spec.md)

## Purpose

Make the sandbox **"Pick a PDF"** import real. Today both "Pick a PDF" and "Paste text" dump the canned `SAMPLE_REQUEST_DOC` and run `mapAiToForm(SAMPLE_EXTRACTION)` — no file, no extraction, no model. This feature wires a genuine pipeline that mirrors the phone app's PDF-import sub-feature:

```
pick PDF(s) → extract text (pdf.js) → one model call (Ollama Cloud via server route)
            → parse → normalize → map → create a Location per file
```

It must stay true to the demo's invariants: **deterministic guided tour**, **deterministic tests**, **store-bridge isolation** (`DemoExperience` is the only store-touching component), and **no `Date.now()`/`Math.random()` at module/render scope**.

## What the phone app does (the contract we mirror)

The app's `pdf-import` runs five stages behind an `AiExtractionProvider` seam whose `extract()` returns **raw text only** — cleaning/parse/validation live *above* the provider. OCC#/`unit` are **never** model-extracted; they're injected from the selected case. Deterministic pure-function normalizers (null coercion, officer/badge split, phone, Yes/No + Actual/DVR-Time enums) turn a small model's loose output into usable fields, each transformation recorded as an auditable warning. Batches run sequentially with partial success.

The web demo reproduces this with web-native parts and one deliberate reduction (below).

## Design decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Where the model call happens | **Next.js Route Handler** `app/api/extract` (server), not a direct browser→Ollama call | Keeps `OLLAMA_API_KEY` server-side (never in the bundle) and sidesteps CORS. This route **is** the web realization of the app's `AiExtractionProvider` seam: it returns **raw text only**. |
| 2 | Model backend | **Ollama Cloud**, OpenAI-compatible chat endpoint, `Authorization: Bearer $OLLAMA_API_KEY` | User has an Ollama Cloud account; inference cost is negligible; no self-hosting. Model id is env-configurable (`OLLAMA_MODEL`, default `llama3.2:3b`) — matches the app's Phase-D target, on which the locked prompt is already validated. |
| 3 | PDF → text | **`pdfjs-dist`** (pdf.js) client-side | The web analog of the app's native `expo-pdf-text-extract`. Runs in the browser; no upload of the raw PDF to any server. A scanned/image-only PDF (text under a min length) fails with a readable error — no OCR in v1 (same as the app). |
| 4 | Pure vs IO split | Parse+normalize+map is a **pure engine** module; pdf.js + fetch live in **`ui/import/` services** | Preserves "engine = pure, no browser." The pure transform is unit-testable with a fixture raw string; the IO services are mocked in tests. |
| 5 | Date/time normalization | **Skip** the app's MM/DD + year-hallucination disambiguation in the import path | The demo deliberately carries time-frame times as **free text** (`ImportTimeFrame`) into the Requested-Scope screen, which normalizes them before any time math. Re-implementing date disambiguation here would duplicate downstream logic. We DO port null/officer/phone/enum normalizers (high value, pure). |
| 6 | OCC#/`unit` | Not mapped from the model (unchanged) | `mapAiToForm` already drops `occurrenceNumber`; the case's own number is authoritative. Preserves the app's anti-wrong-case rule. |
| 7 | Determinism + reach | **Live in sandbox when configured; deterministic `SAMPLE_EXTRACTION` fallback otherwise** | Guided tour + tests never hit the network (always SAMPLE). A deployed demo with no key still works (SAMPLE fallback + a notice). Only the sandbox, with a key configured, calls the model. |
| 8 | Store-bridge | File input + orchestration + `applyImport` stay in `DemoExperience`; `ImportModal` stays presentational | Matches the existing architecture; the modal receives callbacks + a progress/result view-model. |
| 9 | Batch | Multi-select, **sequential**, partial success, batch-size warning | Mirrors `ImportPickerModal`; one model call at a time; one Location created per successful file. |

## System diagram

```
┌─ DemoExperience (the only store-touching component) ───────────────────────────┐
│  hidden <input type="file" accept="application/pdf" multiple>                   │
│  onPickPdf → for each file (sequential):                                        │
│     runPdfImport(file, { live, now })  ── ui/import/run-import.ts ──────────┐   │
│  onRunPaste(text) → runImport({ documentText: text, live, now })           │   │
│  result(s) → store.applyImport(patch) per file; setImp(progress/result)    │   │
├────────────────────────────────────────────────────────────────────────────┤   │
│  ImportModal (presentational): picker | progress | result(+warnings)        │   │
└──────────────────────────────────────────────────────────────────────────────┘
        │ documentText                          ▲ ImportRunResult
        ▼                                       │
  ui/import/pdf-extract.ts (pdf.js)       ui/import/run-import.ts (orchestrator)
        │ text                                  │  1 text  2 rawText  3 pure transform
        ▼                                       ▼
  ui/import/extract-client.ts ──POST /api/extract──► app/api/extract/route.ts
        │ { rawText } | { notConfigured }            │  build prompt (engine), truncate,
        │                                            │  Ollama Cloud chat, return rawText
        ▼ (rawText, or SAMPLE on fallback)          ▼
  engine/logic/import-normalize.ts: parseNormalizeMap(rawText)
     parseAiJson → normalizeExtractedFields (null/officer/phone/enum, +warnings) → mapAiToForm
        │ { patch: MappedImport, warnings, fieldCount }
        ▼
  DemoExperience → store.addLocation + store.applyImport(patch)
```

## Data contracts

### Server route — `POST /api/extract`

Request body: `{ documentText: string }`

Responses:
- `200 { rawText: string }` — model reply text (uncleaned; the client parses).
- `503 { error: string, code: 'NOT_CONFIGURED' }` — no `OLLAMA_API_KEY` set → client falls back to SAMPLE.
- `502 { error, code: 'UPSTREAM_ERROR' }` — Ollama call failed/timed out → client falls back to SAMPLE.
- `400 { error, code: 'BAD_REQUEST' }` — empty/oversized body.

Server behavior: trims + truncates `documentText` to `MAX_DOCUMENT_CHARS` (8000, appending `\n[TRUNCATED]`); builds messages from the engine's `EXTRACT_FIELDS_SYSTEM_PROMPT` + `buildExtractFieldsUserPrompt`; calls `${OLLAMA_BASE_URL}/chat/completions` with `{ model, messages, stream:false, temperature:0 }` under an `AbortController` timeout (`OLLAMA_TIMEOUT_MS`, default 30000); returns `choices[0].message.content`.

Env (server-only): `OLLAMA_API_KEY` (secret), `OLLAMA_MODEL` (default `llama3.2:3b`), `OLLAMA_BASE_URL` (default `https://ollama.com/v1`), `OLLAMA_TIMEOUT_MS` (default `30000`).

### Pure transform — `parseNormalizeMap(rawText): ImportTransform`

```ts
interface ImportWarning { field: string; originalValue: string; normalizedValue: string; reason: string }
interface ImportTransform { patch: MappedImport; warnings: ImportWarning[]; fieldCount: number }
```
`fieldCount` = count of non-empty mapped fields (the recognized-field signal — also closes deferred M-1: a blank-vs-garbage distinction now exists). Throws only if `parseAiJson` finds no JSON object (caller treats as a failed file).

### Orchestrator — `ui/import/run-import.ts`

```ts
type ImportStageId = 'extracting_text' | 'reading_model' | 'normalizing' | 'done' | 'error'
interface ImportRunResult {
  ok: boolean
  patch?: MappedImport
  warnings: ImportWarning[]
  fieldCount?: number
  usedFallback: boolean         // true when SAMPLE was used (not configured / offline / error)
  error?: string
  filename?: string
}
runImport(input: { documentText: string; live: boolean; onStage?: (s: ImportStageId) => void }): Promise<ImportRunResult>
runPdfImport(file: File, opts): Promise<ImportRunResult>   // = extract text → runImport
```

`live=false` (guided mode, or no live model) → skip the route, use `SAMPLE_EXTRACTION` directly, `usedFallback=true`. `live=true` → call the route; on `NOT_CONFIGURED`/`UPSTREAM_ERROR`/network throw → fall back to SAMPLE with `usedFallback=true` and a warning.

## Security & privacy

- The API key lives only in server env; the browser never sees it.
- The raw PDF never leaves the browser — only extracted text is POSTed to our own route, which forwards to Ollama. (Document this in the UI copy; it already says "parsed in your browser, then read by the model.")
- The route truncates and envelope-sanitizes input (`sanitizeInputText`) — anti-prompt-injection, same as the app.
- No PII logging in the route beyond a generic error code.

## Integration points (existing files touched)

- `features/demo/ui/screens/ImportModal.tsx` — replace the fake PDF choice with a real picker trigger; add progress stages + a warnings list on the result.
- `features/demo/ui/DemoExperience.tsx` — hidden file input, mode-aware `live` flag, per-file sequential orchestration, `applyImport` per file, progress/result wiring.
- `features/demo/engine/logic/import.ts` — reused as-is (prompt, `parseAiJson`, `mapAiToForm`, `SAMPLE_EXTRACTION`, `MAX_DOCUMENT_CHARS` added).
- `package.json` — add `pdfjs-dist`.
- `.env.example` — document the Ollama env vars.

## Non-goals (v1)

OCR for scanned PDFs (readable error instead); per-field review/edit modal before apply (the wizard already lets the user edit); the full MM/DD + year disambiguation (downstream scope screen owns it); persisting model responses; streaming.
