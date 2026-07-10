'use client'

/**
 * Import orchestrator (client). Mirrors the phone app's pdf-import pipeline, minus persist:
 *   [PDF] extract text → [model] /api/extract (or SAMPLE fallback) → parse → normalize → map.
 * The pure transform lives in the engine (parseNormalizeMap); this layer only does IO and
 * fallback. The demo always calls with `live: true`; `live=false` is a deterministic test
 * seam that skips the network and uses the SAMPLE extraction.
 */

import { SAMPLE_EXTRACTION, type MappedImport } from '@/features/demo/engine/logic/import'
import { SAMPLE_REQUEST_DOC } from '@/features/demo/engine/content/seed'
import { parseNormalizeMap, type ImportWarning } from '@/features/demo/engine/logic/import-normalize'
import { requestExtraction } from '@/features/demo/ui/import/extract-client'
import { extractPdfText, PdfExtractionError } from '@/features/demo/ui/import/pdf-extract'

export type ImportStageId = 'extracting_text' | 'reading_model' | 'normalizing' | 'done' | 'error'

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

/** Discriminated on `ok` — a success always carries the patch + counts; a failure carries the error. */
export type ImportRunResult =
  | { ok: true; patch: MappedImport; fieldCount: number; timeFrameCount: number; warnings: ImportWarning[]; fallbackMode: FallbackMode; filename?: string }
  | { ok: false; error: string; warnings: ImportWarning[]; fallbackMode: FallbackMode; filename?: string }

const SAMPLE_RAW = JSON.stringify(SAMPLE_EXTRACTION)

export async function runImport(input: {
  documentText: string
  live: boolean
  onStage?: (s: ImportStageId) => void
}): Promise<ImportRunResult> {
  const { documentText, live, onStage } = input
  onStage?.('reading_model')

  let rawText: string
  let fallbackMode: FallbackMode
  if (!live) {
    rawText = SAMPLE_RAW
    fallbackMode = 'sample'
  } else {
    const result = await requestExtraction(documentText)
    if (result.ok) {
      rawText = result.rawText
      fallbackMode = 'none'
    } else {
      rawText = SAMPLE_RAW
      fallbackMode = result.notConfigured ? 'unavailable' : 'error'
    }
  }

  onStage?.('normalizing')
  // The year cold-case guard needs the document the reply came from: the live document for a
  // real reply, or the sample email for the SAMPLE fallback. currentTimeMs is read here (event
  // scope) for the proximity disambiguation; tests of the pure pipeline inject a fixed value.
  const currentTimeMs = Date.now()
  const sourceText = fallbackMode === 'none' ? documentText : SAMPLE_REQUEST_DOC
  try {
    const { patch, warnings, fieldCount, timeFrameCount } = parseNormalizeMap(rawText, { currentTimeMs, sourceText })
    // Live reply that parsed but yielded nothing usable → don't create a blank location.
    if (fallbackMode === 'none' && fieldCount === 0 && timeFrameCount === 0) {
      onStage?.('error')
      return { ok: false, error: 'No recognizable fields found in this document — check it and try again.', warnings, fallbackMode }
    }
    onStage?.('done')
    return { ok: true, patch, warnings, fieldCount, timeFrameCount, fallbackMode }
  } catch (e) {
    onStage?.('error')
    return { ok: false, error: e instanceof Error ? e.message : 'Could not read the request.', warnings: [], fallbackMode }
  }
}

export async function runPdfImport(
  file: File,
  input: { live: boolean; onStage?: (s: ImportStageId) => void },
): Promise<ImportRunResult> {
  input.onStage?.('extracting_text')
  let documentText: string
  try {
    documentText = await extractPdfText(file)
  } catch (e) {
    input.onStage?.('error')
    const error = e instanceof PdfExtractionError ? e.message : 'Could not read this PDF.'
    return { ok: false, error, warnings: [], fallbackMode: 'none', filename: file.name }
  }
  const result = await runImport({ documentText, live: input.live, onStage: input.onStage })
  return { ...result, filename: file.name }
}
