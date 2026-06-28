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
    expect(r.fallbackMode).toBe('guided')
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

  it('rejects a live reply that parses but yields zero fields (no blank success)', async () => {
    reqMock.mockResolvedValue({ ok: true, rawText: RAW_NULLS })
    const r = await runImport({ documentText: 'x', live: true })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/no recognizable fields/i)
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

  it('fails without a model call when the PDF has no text', async () => {
    pdfMock.mockRejectedValue(new PdfExtractionError('scanned'))
    const r = await runPdfImport(file, { live: true })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('scanned')
    expect(reqMock).not.toHaveBeenCalled()
  })

  it('maps a generic (non-PdfExtractionError) extraction failure to a readable error', async () => {
    pdfMock.mockRejectedValue(new Error('boom'))
    const r = await runPdfImport(file, { live: true })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Could not read this PDF.')
  })
})
