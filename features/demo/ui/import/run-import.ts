'use client'

/**
 * Import orchestrator (client). Mirrors the phone app's pdf-import pipeline, minus persist:
 *   [PDF] extract text → [model] /api/extract (or SAMPLE fallback) → parse → normalize → map.
 * The pure transform lives in the engine (parseNormalizeMap); this layer only does IO and
 * fallback. The demo always calls with `live: true`; `live=false` is a deterministic test
 * seam that skips the network and uses the SAMPLE extraction.
 *
 * P1.3: each stage also emits truthful lines into the import log bus via the optional
 * run-bound `emitter` (created by the run owner with `importLogBus.beginRun`). Lines
 * reflect what actually happened — including every sample-fallback transition. The
 * coarse `onStage` callback stays untouched: it still drives the current progress
 * checklist until P1.4 replaces that UI with the live terminal.
 */

import {
  SAMPLE_EXTRACTION,
  EXTRACT_FIELDS_SYSTEM_PROMPT,
  buildExtractFieldsUserPrompt,
  MAX_DOCUMENT_CHARS,
  type MappedImport,
} from '@/features/demo/engine/logic/import'
import { SAMPLE_REQUEST_DOC } from '@/features/demo/engine/content/seed'
import { parseNormalizeMap, type ImportWarning } from '@/features/demo/engine/logic/import-normalize'
import { clipDetail, type ImportLogEmitter } from '@/features/demo/engine/logic/import-log'
import { requestExtraction } from '@/features/demo/ui/import/extract-client'
import { extractPdfText, PdfExtractionError } from '@/features/demo/ui/import/pdf-extract'

export type ImportStageId = 'extracting_text' | 'reading_model' | 'normalizing' | 'done' | 'error'

/** A stage the pipeline actually reached (excludes the terminal 'error' marker). */
export type ImportRealStageId = Exclude<ImportStageId, 'error'>

// Detail-dump clip sizes at the emit sites — same numbers as the phone (§5.7.4).
const DUMP_DETAIL_CHARS = 1200
const USER_PROMPT_DETAIL_CHARS = 800
const SYSTEM_PROMPT_DETAIL_CHARS = 1400
const RESPONSE_PREVIEW_CHARS = 80

/**
 * Mirror of the server route's document truncation (app/api/extract/route.ts) so the
 * VERB "user prompt" dump shows what the proxy actually sends — not a re-derivation.
 */
function truncateForModel(text: string): string {
  return text.length <= MAX_DOCUMENT_CHARS ? text : `${text.slice(0, MAX_DOCUMENT_CHARS)}\n[TRUNCATED]`
}

/**
 * How the result was produced. Every mode other than `none` means the visitor's document
 * was substituted with the fictional SAMPLE — the UI must say so (exhaustive notice switch
 * in DemoExperience + per-card isSample badge; review M1/M2):
 * - `none` — the live model read the visitor's document.
 * - `sample` — live explicitly disabled (`live: false`, a test seam) → deterministic SAMPLE.
 * - `unavailable` — keyless / not-configured (503) → SAMPLE fallback. "Not configured" notice.
 * - `error` — a genuine live failure (401/429/502/network/timeout) → SAMPLE fallback. Distinct notice.
 */
export type FallbackMode = 'none' | 'sample' | 'unavailable' | 'error'

/**
 * The demo pipeline's REAL failure modes (P1.5, matrix row 79) — the phone's
 * `error.code` analog, adapted honestly: proxy 503/network failures are NOT here
 * because they fall back to the SAMPLE (a success with a notice), never a failure.
 * Codes whose pipeline message is already the honest user-facing string
 * (PDF_SCANNED, NO_FIELDS_FOUND) are deliberately absent from the modal's
 * ERROR_MESSAGES map — the phone's own precedent (§5.7.8: "No PDF code is in the
 * map, so the pipeline's own honest string always renders").
 */
export type ImportErrorCode =
  | 'PDF_SCANNED' // pdf.js found no selectable text (scanned/image-only)
  | 'PDF_READ_FAILED' // pdf.js could not load/parse the file (corrupt, encrypted, not a PDF)
  | 'MODEL_OUTPUT_UNPARSEABLE' // no JSON object in the model reply (parseAiJson threw)
  | 'NO_FIELDS_FOUND' // reply parsed but yielded zero usable fields

/** The phone's error.details shape for import failures ({ stage, detail } — §5.7.8). */
export interface ImportErrorDetails {
  stage: ImportStageId
  detail: string
}

/**
 * What the pipeline DID find before failing (the phone's partialData concept,
 * ImportFlowModal.tsx:353-368). Only `caseNumber` (the model-read OCC#): the phone's
 * second key, businessName, is structurally unreachable here — the sole partialData
 * producer sits inside the `fieldCount === 0` gate and fieldCount counts businessName,
 * so it is provably empty on that path (p1-review R-30; recorded in deferred.md §35).
 */
export interface ImportPartialData {
  caseNumber?: string
}

/**
 * Discriminated on `ok` — a success always carries the patch + counts; a failure
 * carries the error. `code`/`details` are REQUIRED on the failure arm (p1-review
 * R-29): every producer sets both, and optionality let a future failure path compile
 * while silently dropping the row-79 enrichment (no friendly mapping, no Technical
 * Details). The modal-level `ImportResult` keeps ITS optionality — DemoExperience
 * legitimately builds code-less pre-pipeline guard failures there.
 */
export type ImportRunResult =
  | { ok: true; patch: MappedImport; fieldCount: number; timeFrameCount: number; warnings: ImportWarning[]; fallbackMode: FallbackMode; filename?: string }
  | {
      ok: false
      error: string
      warnings: ImportWarning[]
      fallbackMode: FallbackMode
      filename?: string
      code: ImportErrorCode
      /** Raw failure context for the collapsible "Technical Details" block. */
      details: ImportErrorDetails
      /** Honest partial extraction results for the "Data Found" block. */
      partialData?: ImportPartialData
    }

const SAMPLE_RAW = JSON.stringify(SAMPLE_EXTRACTION)

/**
 * The machine-readable marker prefix on every sample-fallback log line. Exported as the
 * SINGLE source of the contract between the emit sites below and the terminal's
 * `deriveTrust` (p1-review R-32): a copy edit to the human sentence after the prefix
 * can no longer silently break the trust derivation — both sides compile against this
 * constant, and the tests pin it.
 */
export const SAMPLE_FALLBACK_PREFIX = 'sample fallback:'

/**
 * Truthful log line for every FallbackMode transition — the honesty machinery's trace in
 * the terminal. NORM is the warning-accent level (the phone uses it for warning-class
 * lines beyond normalization proper, e.g. the OCC# mismatch); every substitution of the
 * visitor's document with the SAMPLE must be visible here AND in the result notice.
 */
function emitFallback(emitter: ImportLogEmitter | undefined, mode: Exclude<FallbackMode, 'none'>): void {
  switch (mode) {
    case 'sample':
      emitter?.log('NORM', `${SAMPLE_FALLBACK_PREFIX} live import disabled — importing the sample request`)
      break
    case 'unavailable':
      emitter?.log('NORM', `${SAMPLE_FALLBACK_PREFIX} live model not configured — importing the sample request`, '/api/extract → 503 NOT_CONFIGURED')
      break
    case 'error':
      emitter?.log('NORM', `${SAMPLE_FALLBACK_PREFIX} couldn't reach the live model — importing the sample request`, '/api/extract failed (non-503 or network error)')
      break
    default: {
      const exhaustive: never = mode
      throw new Error(`Unhandled fallback mode: ${String(exhaustive)}`)
    }
  }
}

export async function runImport(input: {
  documentText: string
  live: boolean
  onStage?: (s: ImportStageId) => void
  emitter?: ImportLogEmitter
}): Promise<ImportRunResult> {
  const { documentText, live, onStage, emitter } = input
  onStage?.('reading_model')

  let rawText: string
  let fallbackMode: FallbackMode
  if (!live) {
    rawText = SAMPLE_RAW
    fallbackMode = 'sample'
    emitFallback(emitter, 'sample')
  } else {
    // The demo's model call leaves the browser (unlike the phone's on-device model): the
    // extracted text goes to the /api/extract server proxy, which forwards it to a cloud
    // model. The log says so — P1.4's title bar carries the same honesty.
    emitter?.log('AI', "AI Request → /api/extract", `document: ${documentText.length} chars → cloud model via server proxy`)
    emitter?.log('VERB', 'system prompt ▾', clipDetail(EXTRACT_FIELDS_SYSTEM_PROMPT, SYSTEM_PROMPT_DETAIL_CHARS))
    emitter?.log('VERB', 'user prompt ▾', clipDetail(buildExtractFieldsUserPrompt(truncateForModel(documentText)), USER_PROMPT_DETAIL_CHARS))
    const aiT0 = emitter?.elapsed() ?? 0
    const result = await requestExtraction(documentText)
    if (result.ok) {
      rawText = result.rawText
      fallbackMode = 'none'
      emitter?.log('AI', 'AI Response', `length: ${rawText.length} · ${(emitter?.elapsed() ?? aiT0) - aiT0}ms · preview: ${clipDetail(rawText, RESPONSE_PREVIEW_CHARS)}`)
      emitter?.log('VERB', 'raw response ▾', clipDetail(rawText, DUMP_DETAIL_CHARS))
    } else {
      rawText = SAMPLE_RAW
      fallbackMode = result.notConfigured ? 'unavailable' : 'error'
      emitFallback(emitter, fallbackMode)
    }
  }

  onStage?.('normalizing')
  // The year cold-case guard needs the document the reply came from: the live document for a
  // real reply, or the sample email for the SAMPLE fallback. currentTimeMs is read here (event
  // scope) for the proximity disambiguation; tests of the pure pipeline inject a fixed value.
  const currentTimeMs = Date.now()
  const sourceText = fallbackMode === 'none' ? documentText : SAMPLE_REQUEST_DOC
  try {
    const { patch, warnings, fieldCount, timeFrameCount, occurrenceNumber } = parseNormalizeMap(rawText, { currentTimeMs, sourceText })
    emitter?.log('OK', 'parse + map ✓', `fields: ${fieldCount} · timeFrames: ${timeFrameCount}`)
    for (const w of warnings) emitter?.log('NORM', w.reason, `field: ${w.field}`)
    emitter?.log('OK', 'normalize ✓', `warnings: ${warnings.length}`)
    // Live reply that parsed but yielded nothing usable → don't create a blank location.
    if (fallbackMode === 'none' && fieldCount === 0 && timeFrameCount === 0) {
      emitter?.log('ERR', 'no recognizable fields found — nothing to import')
      onStage?.('error')
      // The OCC# is not a usable form field (the case record owns it), but it IS the
      // honest "here's what the model DID find" for the failure card's Data Found block.
      const partialData = occurrenceNumber ? { caseNumber: occurrenceNumber } : undefined
      return {
        ok: false,
        error: 'No recognizable fields found in this document — check it and try again.',
        warnings,
        fallbackMode,
        code: 'NO_FIELDS_FOUND',
        details: { stage: 'normalizing', detail: `parsed ✓ but fields: 0 · timeFrames: 0` },
        ...(partialData ? { partialData } : {}),
      }
    }
    onStage?.('done')
    return { ok: true, patch, warnings, fieldCount, timeFrameCount, fallbackMode }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    emitter?.log('ERR', '✗ failed at normalizing', e instanceof Error ? e.message : undefined)
    onStage?.('error')
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not read the request.',
      warnings: [],
      fallbackMode,
      code: 'MODEL_OUTPUT_UNPARSEABLE',
      details: { stage: 'normalizing', detail },
    }
  }
}

export async function runPdfImport(
  file: File,
  input: { live: boolean; onStage?: (s: ImportStageId) => void; emitter?: ImportLogEmitter },
): Promise<ImportRunResult> {
  const { emitter } = input
  input.onStage?.('extracting_text')
  let documentText: string
  const pdfT0 = emitter?.elapsed() ?? 0
  try {
    documentText = await extractPdfText(file)
  } catch (e) {
    emitter?.log('ERR', '✗ failed at extracting text', e instanceof Error ? e.message : undefined)
    input.onStage?.('error')
    // PDF_SCANNED's own message is the user-facing string (phone precedent: PDF codes stay
    // out of the friendly map); a generic pdf.js failure keeps its raw message for the
    // Technical Details block while the card shows the mapped PDF_READ_FAILED copy.
    const scanned = e instanceof PdfExtractionError
    const raw = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      error: scanned ? e.message : 'Could not read this PDF.',
      warnings: [],
      fallbackMode: 'none',
      filename: file.name,
      code: scanned ? 'PDF_SCANNED' : 'PDF_READ_FAILED',
      details: { stage: 'extracting_text', detail: raw },
    }
  }
  // In-browser pdf.js, vs the phone's native extractor — the raw PDF bytes never leave the browser.
  emitter?.log('PDF', 'extract text ✓', `pdf.js (in-browser) · ${documentText.length} chars · ${(emitter?.elapsed() ?? pdfT0) - pdfT0}ms`)
  emitter?.log('VERB', 'extracted document text ▾', clipDetail(documentText, DUMP_DETAIL_CHARS))
  const result = await runImport({ documentText, live: input.live, onStage: input.onStage, emitter })
  return { ...result, filename: file.name }
}
