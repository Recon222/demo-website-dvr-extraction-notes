# Live PDF Import (sandbox) — Implementation Plan

**Prerequisite:** Read [`01-demo-pdf-import-architecture.md`](./01-demo-pdf-import-architecture.md) for the design decisions, data contracts, and system diagram. Tests are specified in [`03-demo-pdf-import-test-spec.md`](./03-demo-pdf-import-test-spec.md).

## Architecture decisions (recap)

| Decision | Choice | Rationale |
|---|---|---|
| Model call site | Server route `app/api/extract` | Key stays server-side; no CORS; provider seam (raw text only). |
| Backend | Ollama Cloud (OpenAI-compatible), env-configurable model | No hosting; negligible cost; locked prompt validated on Llama. |
| PDF→text | `pdfjs-dist` client-side | Web analog of native extraction; raw PDF never uploaded. |
| Pure/IO split | `engine/logic/import-normalize.ts` (pure) + `ui/import/*` (IO) | Engine stays browser-free + unit-testable; IO mocked in tests. |
| Determinism | Live in sandbox-when-configured; SAMPLE fallback otherwise | Guided + tests deterministic; deployed demo still works keyless. |
| Date normalization | Skipped here (scope screen owns it) | Demo keeps free-text times by contract. |

## Module layout

```
app/api/extract/route.ts                         # NEW — Ollama Cloud proxy (server)
features/demo/engine/logic/
├── import.ts                                     # EDIT — add MAX_DOCUMENT_CHARS export
├── import-normalize.ts                           # NEW — pure normalizers + parseNormalizeMap
└── __tests__/import-normalize.test.ts            # NEW
features/demo/ui/import/                           # NEW — client IO services
├── pdf-extract.ts                                # NEW — pdf.js text extraction
├── extract-client.ts                             # NEW — fetch POST /api/extract
├── run-import.ts                                 # NEW — orchestrator (+ SAMPLE fallback)
└── __tests__/{extract-client,run-import}.test.ts # NEW
features/demo/ui/screens/ImportModal.tsx          # EDIT — real picker + progress + warnings
features/demo/ui/DemoExperience.tsx               # EDIT — file input + wiring + batch
.env.example                                      # NEW/EDIT — Ollama env
package.json                                      # EDIT — pdfjs-dist
```

---

## Phase 1 — Pure normalization + transform (engine)

**Goal:** A pure, tested `parseNormalizeMap(rawText)` that turns a raw model reply into a `MappedImport` + warnings + field count.

**`features/demo/engine/logic/import.ts`** — add:
```ts
export const MAX_DOCUMENT_CHARS = 8000
```

**`features/demo/engine/logic/import-normalize.ts`** (new, pure — no React/DOM/fetch):
Port the app's deterministic normalizers (verbatim logic, demo types):
```ts
export interface ImportWarning { field: string; originalValue: string; normalizedValue: string; reason: string }

// ported from normalize-null.ts
export function isNullValue(value: string): boolean
export function coerceField(value: string): string
// ported from normalize-phone.ts
export function normalizePhoneNumber(value: string): string
// ported from normalize-enums.ts
export function normalizeYesNo(value: string): 'Yes' | 'No' | ''        // '' = not provided (demo uses string)
export function normalizeTimePeriodType(value: string): 'Actual Time' | 'DVR Time'
// ported from normalize-officer.ts
export function normalizeOfficerFields(rName: string, badge: string, email: string):
  { rName: string; badge: string; warnings: ImportWarning[] }

/** Clean a Partial<ExtractedFields> into a full ExtractedFields, collecting warnings.
 *  Coerces null indicators on every string; splits officer/badge; formats phones;
 *  maps Yes/No + Actual/DVR-Time. Time-frame START/END times are LEFT AS FREE TEXT
 *  (the Requested-Scope screen normalizes them); only timePeriodType + cameraDetails
 *  are normalized/coerced. */
export function normalizeExtractedFields(ai: Partial<ExtractedFields>):
  { fields: ExtractedFields; warnings: ImportWarning[] }

/** parseAiJson → normalizeExtractedFields → mapAiToForm. Pure. Throws only if no JSON object. */
export interface ImportTransform { patch: MappedImport; warnings: ImportWarning[]; fieldCount: number }
export function parseNormalizeMap(rawText: string): ImportTransform
```
`fieldCount` = number of non-empty values across the flat `MappedImport` (excluding `_import.timeFrames` array length, which is reported separately). `parseNormalizeMap` reuses the existing `parseAiJson` and `mapAiToForm` from `import.ts`.

**Barrel:** export the new symbols from the demo engine barrel (wherever `import.ts` is re-exported).

**Gate:** `import-normalize.test.ts` green; `tsc` clean. Commit.

---

## Phase 2 — Server route (Ollama Cloud proxy)

**`app/api/extract/route.ts`** (new):
```ts
export async function POST(req: Request): Promise<Response>
```
- Parse `{ documentText }`; `400 BAD_REQUEST` if missing/empty.
- If `!process.env.OLLAMA_API_KEY` → `503 { code:'NOT_CONFIGURED' }`.
- Truncate `documentText` to `MAX_DOCUMENT_CHARS` (+`\n[TRUNCATED]`).
- `messages = [{role:'system', content: EXTRACT_FIELDS_SYSTEM_PROMPT}, {role:'user', content: buildExtractFieldsUserPrompt(documentText)}]` (imported from the engine).
- `fetch(`${BASE}/chat/completions`, { method:'POST', headers:{Authorization:`Bearer ${KEY}`, 'Content-Type':'application/json'}, body: JSON.stringify({ model, messages, stream:false, temperature:0 }), signal })` under an `AbortController` timeout.
- Success → `200 { rawText: data.choices[0].message.content }`. Upstream non-OK / throw / timeout → `502 { code:'UPSTREAM_ERROR' }`.
- `export const runtime = 'nodejs'` (env + fetch); no caching.

Read env at call time (`process.env.*`) so tests can set/unset it.

**Gate:** route test green (mock global `fetch`); `tsc`. Commit.

---

## Phase 3 — Client IO services + orchestrator

**`features/demo/ui/import/pdf-extract.ts`** (new, client):
```ts
export const MIN_NATIVE_EXTRACTION_LENGTH = 50
export class PdfExtractionError extends Error {}
export async function extractPdfText(file: File): Promise<string>
```
- Lazy-load pdf.js: `const pdfjs = await import('pdfjs-dist')` and set `pdfjs.GlobalWorkerOptions.workerSrc` to the bundled worker URL (`new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`).
- `file.arrayBuffer()` → `getDocument({ data })` → for each page `getTextContent()` → join `items.map(i => i.str)`.
- Trim; if `< MIN_NATIVE_EXTRACTION_LENGTH` → throw `PdfExtractionError('This PDF looks scanned/image-only…')`.

**`features/demo/ui/import/extract-client.ts`** (new, client):
```ts
type ExtractClientResult = { ok: true; rawText: string } | { ok: false; notConfigured: boolean }
export async function requestExtraction(documentText: string): Promise<ExtractClientResult>
```
- `POST /api/extract`. `200` → `{ ok:true, rawText }`. `503` → `{ ok:false, notConfigured:true }`. Any other status / network throw → `{ ok:false, notConfigured:false }`.

**`features/demo/ui/import/run-import.ts`** (new, client orchestrator):
```ts
export type ImportStageId = 'extracting_text' | 'reading_model' | 'normalizing' | 'done' | 'error'
export interface ImportRunResult { ok: boolean; patch?: MappedImport; warnings: ImportWarning[]
  fieldCount?: number; timeFrameCount?: number; usedFallback: boolean; error?: string; filename?: string }

export async function runImport(input: { documentText: string; live: boolean
  onStage?: (s: ImportStageId) => void }): Promise<ImportRunResult>
export async function runPdfImport(file: File, input: { live: boolean
  onStage?: (s: ImportStageId) => void }): Promise<ImportRunResult>
```
- `runImport`: `onStage('reading_model')`; if `!live` → `raw = JSON.stringify(SAMPLE_EXTRACTION)`, `usedFallback=true`. Else `requestExtraction(documentText)`: ok → raw + `usedFallback=false`; not ok → SAMPLE raw + `usedFallback=true` + a warning (`Live model unavailable — used the sample request.`). Then `onStage('normalizing')`, `parseNormalizeMap(raw)`, `onStage('done')`, return result. A thrown `parseNormalizeMap` → `{ ok:false, error, … }`, `onStage('error')`.
- `runPdfImport`: `onStage('extracting_text')`, `extractPdfText(file)` (catch `PdfExtractionError` → `{ ok:false, error }`), then `runImport({ documentText, live, onStage })`, attach `filename`.

**Gate:** `extract-client.test.ts` + `run-import.test.ts` green (mock `requestExtraction`/`pdf-extract`); `tsc`. Commit.

---

## Phase 4 — UI: real picker + DemoExperience wiring

**`features/demo/ui/screens/ImportModal.tsx`** (edit):
- `picker` stage: "Pick a PDF" now calls `onPickPdf()` (parent opens the file dialog); copy clarifies single/multiple. "Paste text" → `onChoosePaste()` (blank textarea in sandbox).
- `progress` stage: show the active `ImportStageId` label + batch counter (`Importing 2 of 3…`).
- `result` stage: per-file success (location name, field count, time-frame count), a **warnings** disclosure (list `ImportWarning.reason`), a `usedFallback` notice ("Live model unavailable — imported the sample request"), and per-file failures. Props extended with `onPickPdf`, `batch?: { current: number; total: number }`, `warnings`, `usedFallback`, and a `failures` list.

**`features/demo/ui/DemoExperience.tsx`** (edit):
- Add a hidden `<input ref={fileInputRef} type="file" accept="application/pdf" multiple style={{display:'none'}} onChange={onFilesPicked} />` inside the always-mounted chrome.
- `live = currentMode === 'sandbox'` (guided always uses SAMPLE/fallback — deterministic).
- `onPickPdf()` → `fileInputRef.current?.click()`.
- `onFilesPicked(e)`: read `FileList` → sequential loop; for each file `setImp(progress, batch:{current,total})`, `await runPdfImport(file, { live, onStage })`; on `ok` → `addLocation` + `applyImport(patch)`, accumulate success; else accumulate failure. After the loop → `setImp(result, …)`. Reset the input value so re-picking the same file fires `change`.
- Paste path (`onRun`): `await runImport({ documentText: imp.text, live, onStage })` → same apply + result.
- Keep batch-size warning (> 25 files) → a confirm step in the modal (mirror the app).

**Gate:** component + sandbox tests green; `tsc`. Commit.

---

## Phase 5 — Wiring polish, env, determinism guard, docs

- `.env.example`: `OLLAMA_API_KEY=`, `OLLAMA_MODEL=llama3.2:3b`, `OLLAMA_BASE_URL=https://ollama.com/v1`, `OLLAMA_TIMEOUT_MS=30000`.
- Confirm guided import chapter still resolves deterministically (live=false in guided) — the guided beat path is unchanged; verify the import chapter test stays green.
- `pnpm build` (ensure pdf.js worker bundles; the `/demo` island is already `ssr:false`). If the worker URL trips the build, fall back to copying `pdf.worker.min.mjs` into `public/` and pointing `workerSrc` at `/pdf.worker.min.mjs`.
- Full `pnpm test` + `pnpm test:coverage` (≥80%) + `tsc`. Commit.

## Appendix A — new dependencies
- `pdfjs-dist` (runtime). No AI SDK needed — the route uses plain `fetch`.

## Appendix B — existing files modified
- `features/demo/engine/logic/import.ts` (add `MAX_DOCUMENT_CHARS`)
- the demo engine barrel (export `import-normalize` symbols)
- `features/demo/ui/screens/ImportModal.tsx`
- `features/demo/ui/DemoExperience.tsx`
- `package.json`, `.env.example`

## Appendix C — manual live verification (needs the API key)
With `OLLAMA_API_KEY` set in `.env.local`: `pnpm dev` → `/demo?mode=sandbox` → create a case → Import → Pick a PDF → choose a real recovery-request PDF → confirm a Location is created with mapped fields + any normalization warnings. (Build/CI verify everything else via mocks + the SAMPLE fallback.)
