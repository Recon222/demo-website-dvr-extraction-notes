import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/features/demo/ui/import/extract-client', () => ({ requestExtraction: vi.fn() }))
vi.mock('@/features/demo/ui/import/pdf-extract', () => ({
  extractPdfText: vi.fn(),
  PdfExtractionError: class PdfExtractionError extends Error {},
}))

import { runImport, runPdfImport } from '@/features/demo/ui/import/run-import'
import { requestExtraction } from '@/features/demo/ui/import/extract-client'
import { extractPdfText, PdfExtractionError } from '@/features/demo/ui/import/pdf-extract'
import { createImportLogBus, type ImportLogEmitter, type ImportLogBus } from '@/features/demo/engine/logic/import-log'
import { RAW_MESSY, RAW_NO_JSON, RAW_NULLS } from '@/features/demo/engine/logic/__tests__/import-fixtures'

const reqMock = vi.mocked(requestExtraction)
const pdfMock = vi.mocked(extractPdfText)

let bus: ImportLogBus
let emitter: ImportLogEmitter

beforeEach(() => {
  reqMock.mockReset()
  pdfMock.mockReset()
  bus = createImportLogBus()
  emitter = bus.beginRun(() => 0) // fixed clock — elapsedMs is not under test here
})

const levels = () => bus.getLines().map((l) => l.level)
const texts = () => bus.getLines().map((l) => l.text)
const lineByText = (re: RegExp) => bus.getLines().find((l) => re.test(l.text))

describe('runImport log emission', () => {
  it('sample mode (live=false): the fallback is visible as a NORM line, no AI lines at all', async () => {
    const r = await runImport({ documentText: 'x', live: false, emitter })
    expect(r.ok).toBe(true)
    expect(levels()).toEqual(['NORM', 'OK', 'OK']) // fallback → parse+map ✓ → normalize ✓
    expect(texts()[0]).toMatch(/sample fallback: live import disabled/)
    expect(levels()).not.toContain('AI') // no model call happened — the log must not claim one
  })

  it('keyless fallback (503): AI Request emitted (the call WAS attempted), then the NORM fallback transition', async () => {
    reqMock.mockResolvedValue({ ok: false, notConfigured: true })
    const r = await runImport({ documentText: 'real request', live: true, emitter })
    expect(r.ok).toBe(true)
    expect(levels()).toEqual(['AI', 'VERB', 'VERB', 'NORM', 'OK', 'OK'])
    const fallback = lineByText(/sample fallback: live model not configured/)
    expect(fallback?.level).toBe('NORM')
    expect(fallback?.detail).toContain('503')
    expect(lineByText(/AI Response/)).toBeUndefined() // no response arrived — none is logged
  })

  it('genuine live failure: distinct NORM fallback line', async () => {
    reqMock.mockResolvedValue({ ok: false, notConfigured: false })
    await runImport({ documentText: 'real request', live: true, emitter })
    expect(lineByText(/sample fallback: couldn't reach the live model/)?.level).toBe('NORM')
  })

  it('live success: request → prompt dumps → response → raw dump → parse/normalize, and NO fallback line', async () => {
    reqMock.mockResolvedValue({ ok: true, rawText: RAW_MESSY })
    const r = await runImport({ documentText: 'real request', live: true, emitter })
    expect(r.ok).toBe(true)
    const ls = levels()
    expect(ls.slice(0, 5)).toEqual(['AI', 'VERB', 'VERB', 'AI', 'VERB'])
    expect(lineByText(/sample fallback/)).toBeUndefined()
    expect(lineByText(/AI Response/)?.detail).toMatch(/length: \d+/)
    expect(lineByText(/raw response ▾/)?.detail).toContain('occurrenceNumber')
    // The messy fixture forces real normalization work — its warnings surface as NORM lines
    // between "parse + map ✓" and "normalize ✓", each carrying the field in the detail.
    const okParse = bus.getLines().findIndex((l) => /parse \+ map ✓/.test(l.text))
    const okNorm = bus.getLines().findIndex((l) => /normalize ✓/.test(l.text))
    const warnings = bus.getLines().slice(okParse + 1, okNorm)
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.every((l) => l.level === 'NORM' && l.detail?.startsWith('field: '))).toBe(true)
    if (r.ok) expect(warnings).toHaveLength(r.warnings.length) // one line per pipeline warning, no theater
    expect(lineByText(/normalize ✓/)?.detail).toBe(`warnings: ${warnings.length}`)
  })

  it('user-prompt dump mirrors what the proxy actually sends (envelope + document)', async () => {
    reqMock.mockResolvedValue({ ok: true, rawText: RAW_MESSY })
    await runImport({ documentText: 'the visitor document', live: true, emitter })
    const dump = lineByText(/user prompt ▾/)
    expect(dump?.level).toBe('VERB')
    expect(dump?.detail).toContain('---BEGIN DOCUMENT---')
    expect(dump?.detail).toContain('the visitor document')
  })

  it('unparseable reply: ERR ✗ failed at normalizing with the message as detail', async () => {
    reqMock.mockResolvedValue({ ok: true, rawText: RAW_NO_JSON })
    const r = await runImport({ documentText: 'x', live: true, emitter })
    expect(r.ok).toBe(false)
    const err = lineByText(/✗ failed at normalizing/)
    expect(err?.level).toBe('ERR')
    expect(err?.detail).toBeTruthy()
  })

  it('live reply with zero usable fields: parse/normalize succeed, then an honest ERR line', async () => {
    reqMock.mockResolvedValue({ ok: true, rawText: RAW_NULLS })
    const r = await runImport({ documentText: 'x', live: true, emitter })
    expect(r.ok).toBe(false)
    expect(lineByText(/no recognizable fields found/)?.level).toBe('ERR')
    expect(levels()[levels().length - 1]).toBe('ERR') // the run's last word is the failure
  })

  it('emitter is optional — the pipeline runs identically without one', async () => {
    const r = await runImport({ documentText: 'x', live: false })
    expect(r.ok).toBe(true)
    expect(bus.getLines()).toEqual([]) // nothing emitted anywhere
  })
})

describe('runPdfImport log emission', () => {
  const file = { name: 'request.pdf' } as unknown as File

  it('extraction success: PDF line (pdf.js, char count) + VERB document dump, then the model stage', async () => {
    pdfMock.mockResolvedValue('a long recovery request document with plenty of text')
    reqMock.mockResolvedValue({ ok: true, rawText: RAW_MESSY })
    const r = await runPdfImport(file, { live: true, emitter })
    expect(r.ok).toBe(true)
    expect(levels().slice(0, 3)).toEqual(['PDF', 'VERB', 'AI'])
    const pdfLine = lineByText(/extract text ✓/)
    expect(pdfLine?.detail).toContain('pdf.js (in-browser)')
    expect(pdfLine?.detail).toContain('52 chars')
    expect(lineByText(/extracted document text ▾/)?.detail).toBe('a long recovery request document with plenty of text')
  })

  it('extraction failure: ERR ✗ failed at extracting text, and the model stage never logs', async () => {
    pdfMock.mockRejectedValue(new PdfExtractionError('scanned'))
    const r = await runPdfImport(file, { live: true, emitter })
    expect(r.ok).toBe(false)
    expect(levels()).toEqual(['ERR'])
    const err = lineByText(/✗ failed at extracting text/)
    expect(err?.detail).toBe('scanned')
  })
})
