'use client'

/**
 * Import orchestrator (client). Mirrors the phone app's pdf-import pipeline, minus persist:
 *   [PDF] extract text → [model] /api/extract (or SAMPLE fallback) → parse → normalize → map.
 * The pure transform lives in the engine (parseNormalizeMap); this layer only does IO and
 * fallback. `live=false` (guided mode, or no live model) skips the network and uses the
 * deterministic SAMPLE — so the guided tour and tests never hit the model.
 */

import { SAMPLE_EXTRACTION, type MappedImport } from '@/features/demo/engine/logic/import'
import { parseNormalizeMap, type ImportWarning } from '@/features/demo/engine/logic/import-normalize'
import { requestExtraction } from '@/features/demo/ui/import/extract-client'
import { extractPdfText, PdfExtractionError } from '@/features/demo/ui/import/pdf-extract'

export type ImportStageId = 'extracting_text' | 'reading_model' | 'normalizing' | 'done' | 'error'

/**
 * How the result was produced:
 * - `none` — the live model was used.
 * - `guided` — deterministic SAMPLE (live disabled; guided tour / tests). No user notice.
 * - `unavailable` — keyless / not-configured (503) → SAMPLE fallback. "Not configured" notice.
 * - `error` — a genuine live failure (401/429/502/network/timeout) → SAMPLE fallback. Distinct notice.
 */
export type FallbackMode = 'none' | 'guided' | 'unavailable' | 'error'

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
    fallbackMode = 'guided'
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
  try {
    const { patch, warnings, fieldCount, timeFrameCount } = parseNormalizeMap(rawText)
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
