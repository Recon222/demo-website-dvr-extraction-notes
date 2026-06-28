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

export interface ImportRunResult {
  ok: boolean
  patch?: MappedImport
  warnings: ImportWarning[]
  fieldCount?: number
  timeFrameCount?: number
  /** SAMPLE was used (guided mode, or live unavailable). */
  usedFallback: boolean
  /** Live extraction was requested but unavailable — show the degraded notice. */
  degraded: boolean
  error?: string
  filename?: string
}

const SAMPLE_RAW = JSON.stringify(SAMPLE_EXTRACTION)

const FALLBACK_WARNING: ImportWarning = {
  field: '(model)',
  originalValue: '',
  normalizedValue: '',
  reason: 'Live model unavailable — imported the sample request instead.',
}

export async function runImport(input: {
  documentText: string
  live: boolean
  onStage?: (s: ImportStageId) => void
}): Promise<ImportRunResult> {
  const { documentText, live, onStage } = input
  onStage?.('reading_model')

  let rawText: string
  let usedFallback = false
  let degraded = false
  const extraWarnings: ImportWarning[] = []

  if (live) {
    const result = await requestExtraction(documentText)
    if (result.ok) {
      rawText = result.rawText
    } else {
      rawText = SAMPLE_RAW
      usedFallback = true
      degraded = true
      extraWarnings.push(FALLBACK_WARNING)
    }
  } else {
    rawText = SAMPLE_RAW
    usedFallback = true
  }

  onStage?.('normalizing')
  try {
    const { patch, warnings, fieldCount, timeFrameCount } = parseNormalizeMap(rawText)
    onStage?.('done')
    return { ok: true, patch, warnings: [...extraWarnings, ...warnings], fieldCount, timeFrameCount, usedFallback, degraded }
  } catch (e) {
    onStage?.('error')
    return {
      ok: false,
      warnings: extraWarnings,
      usedFallback,
      degraded,
      error: e instanceof Error ? e.message : 'Could not read the request.',
    }
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
    return { ok: false, warnings: [], usedFallback: false, degraded: false, error, filename: file.name }
  }
  const result = await runImport({ documentText, live: input.live, onStage: input.onStage })
  return { ...result, filename: file.name }
}
