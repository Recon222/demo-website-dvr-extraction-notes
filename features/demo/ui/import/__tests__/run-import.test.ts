import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/features/demo/ui/import/extract-client', () => ({ requestExtraction: vi.fn() }))
vi.mock('@/features/demo/ui/import/pdf-extract', () => ({
  extractPdfText: vi.fn(),
  PdfExtractionError: class PdfExtractionError extends Error {},
}))

import { runImport, runPdfImport } from '@/features/demo/ui/import/run-import'
import { requestExtraction } from '@/features/demo/ui/import/extract-client'
import { extractPdfText, PdfExtractionError } from '@/features/demo/ui/import/pdf-extract'
import { RAW_MESSY, RAW_NO_JSON, RAW_NULLS } from '@/features/demo/engine/logic/__tests__/import-fixtures'

const reqMock = vi.mocked(requestExtraction)
const pdfMock = vi.mocked(extractPdfText)

beforeEach(() => {
  reqMock.mockReset()
  pdfMock.mockReset()
})

describe('runImport', () => {
  it('uses SAMPLE deterministically when live=false (no network)', async () => {
    const stages: string[] = []
    const r = await runImport({ documentText: 'x', live: false, onStage: (s) => stages.push(s) })
    expect(r.ok).toBe(true)
    expect(r.fallbackMode).toBe('sample')
    if (r.ok) expect(r.patch.requesterName).toBe('Liam McHugh') // from SAMPLE_EXTRACTION
    expect(reqMock).not.toHaveBeenCalled()
    expect(stages).toEqual(['reading_model', 'normalizing', 'done'])
  })

  it('uses the live model reply when available', async () => {
    reqMock.mockResolvedValue({ ok: true, rawText: RAW_MESSY })
    const r = await runImport({ documentText: 'real request', live: true })
    expect(r.ok).toBe(true)
    expect(r.fallbackMode).toBe('none')
    if (r.ok) expect(r.patch.requesterName).toBe('Det. Naplioni')
  })

  it('falls back to SAMPLE with fallbackMode=unavailable when the model is not configured', async () => {
    reqMock.mockResolvedValue({ ok: false, notConfigured: true })
    const r = await runImport({ documentText: 'real request', live: true })
    expect(r.ok).toBe(true)
    expect(r.fallbackMode).toBe('unavailable')
    if (r.ok) expect(r.patch.requesterName).toBe('Liam McHugh')
  })

  it('falls back to SAMPLE with fallbackMode=error on a genuine failure', async () => {
    reqMock.mockResolvedValue({ ok: false, notConfigured: false })
    const r = await runImport({ documentText: 'real request', live: true })
    expect(r.ok).toBe(true)
    expect(r.fallbackMode).toBe('error')
  })

  it('returns an error result when the live reply has no JSON', async () => {
    reqMock.mockResolvedValue({ ok: true, rawText: RAW_NO_JSON })
    const stages: string[] = []
    const r = await runImport({ documentText: 'x', live: true, onStage: (s) => stages.push(s) })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeTruthy()
    expect(stages).toContain('error')
  })

  it('an unparseable reply is coded MODEL_OUTPUT_UNPARSEABLE with the raw throw in details (P1.5)', async () => {
    reqMock.mockResolvedValue({ ok: true, rawText: RAW_NO_JSON })
    const r = await runImport({ documentText: 'x', live: true })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('MODEL_OUTPUT_UNPARSEABLE')
      expect(r.details).toEqual({ stage: 'normalizing', detail: 'No JSON object found in AI response' })
      expect(r.partialData).toBeUndefined() // nothing parsed — no partial data to claim
    }
  })

  it('rejects a live reply that parses but yields zero fields (no blank success)', async () => {
    reqMock.mockResolvedValue({ ok: true, rawText: RAW_NULLS })
    const r = await runImport({ documentText: 'x', live: true })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/no recognizable fields/i)
  })

  it('a zero-field reply is coded NO_FIELDS_FOUND and carries the parsed OCC# as Data Found (P1.5)', async () => {
    reqMock.mockResolvedValue({ ok: true, rawText: JSON.stringify({ occurrenceNumber: 'PR25-777', businessName: 'n/a' }) })
    const r = await runImport({ documentText: 'x', live: true })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('NO_FIELDS_FOUND')
      expect(r.details).toEqual({ stage: 'normalizing', detail: 'parsed ✓ but fields: 0 · timeFrames: 0' })
      expect(r.partialData).toEqual({ caseNumber: 'PR25-777' })
    }
  })

  it('a zero-field reply with no OCC# carries no partialData (nothing found = nothing claimed)', async () => {
    reqMock.mockResolvedValue({ ok: true, rawText: RAW_NULLS })
    const r = await runImport({ documentText: 'x', live: true })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.partialData).toBeUndefined()
  })
})

describe('runPdfImport', () => {
  const file = { name: 'request.pdf' } as unknown as File

  it('extracts text then delegates to the model path, carrying the filename', async () => {
    pdfMock.mockResolvedValue('a long recovery request document with plenty of text')
    reqMock.mockResolvedValue({ ok: true, rawText: RAW_MESSY })
    const stages: string[] = []
    const r = await runPdfImport(file, { live: true, onStage: (s) => stages.push(s) })
    expect(r.ok).toBe(true)
    expect(r.filename).toBe('request.pdf')
    expect(stages[0]).toBe('extracting_text')
  })

  it('fails without a model call when the PDF has no text — coded PDF_SCANNED, message kept honest', async () => {
    pdfMock.mockRejectedValue(new PdfExtractionError('scanned'))
    const r = await runPdfImport(file, { live: true })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBe('scanned') // the pipeline's own string IS the user-facing copy
      expect(r.code).toBe('PDF_SCANNED')
      expect(r.details).toEqual({ stage: 'extracting_text', detail: 'scanned' })
    }
    expect(reqMock).not.toHaveBeenCalled()
  })

  it('maps a generic (non-PdfExtractionError) extraction failure to a readable error', async () => {
    pdfMock.mockRejectedValue(new Error('boom'))
    const r = await runPdfImport(file, { live: true })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBe('Could not read this PDF.')
      // P1.5: the raw pdf.js message survives into details for the Technical Details block.
      expect(r.code).toBe('PDF_READ_FAILED')
      expect(r.details).toEqual({ stage: 'extracting_text', detail: 'boom' })
    }
  })
})
