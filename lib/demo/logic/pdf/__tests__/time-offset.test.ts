import { describe, it, expect } from 'vitest'
import { generateTimeOffsetDoc, type TimeOffsetDocData } from '@/lib/demo/logic/pdf/time-offset'

const base: TimeOffsetDocData = {
  occNumber: 'PR25-0098213',
  address: '1450 Eglinton Ave W',
  isCorrect: false,
  formattedDiff: '00:05:30',
  direction: 'AHEAD OF',
  dvrDateTime: '2025-03-08 12:05:30',
  actualDateTime: '2025-03-08 12:00:00',
  captureMethod: 'ocr',
  ocrImageDataUrl: 'data:image/png;base64,AAAA',
  ocrRawText: '2025-03-08 l2:O5:3O',
  ocrCleanedText: '2025-03-08 12:05:30',
  ocrParsedDateTime: '2025-03-08 12:05:30',
  dvrAppliesDST: false,
  sync: {
    method: 'NTP',
    server: 'time.nrc.ca',
    offsetMs: 0.5,
    uncertaintyMs: 2.1,
    rttMs: 18,
    traceability: 'App → NTP → time.nrc.ca → UTC(NRC) → UTC',
  },
  generatedAt: '2025-03-09 10:00:00',
}

describe('generateTimeOffsetDoc', () => {
  it('returns standalone HTML titled Time Offset Report with the case number', () => {
    const html = generateTimeOffsetDoc(base)
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('Time Offset Report')
    expect(html).toContain('PR25-0098213')
  })

  it('shows the formatted difference in the hero, and CORRECT when the clock matches', () => {
    expect(generateTimeOffsetDoc(base)).toContain('00:05:30')
    expect(generateTimeOffsetDoc({ ...base, isCorrect: true })).toContain('CORRECT')
  })

  it('renders the OCR evidence block for an OCR capture, and a manual note otherwise', () => {
    expect(generateTimeOffsetDoc(base)).toContain('Automated OCR Capture')
    expect(generateTimeOffsetDoc({ ...base, captureMethod: 'manual' })).toContain('Manual Entry')
  })

  it('renders the NTP traceability chain when synced, and a warning when not', () => {
    const synced = generateTimeOffsetDoc(base)
    expect(synced).toContain('Traceability Chain')
    expect(synced).toContain('time.nrc.ca')
    expect(generateTimeOffsetDoc({ ...base, sync: null })).toContain('Device Time Not Verified')
  })

  it('handles a BEHIND offset, OCR without image, and a slow >1ms sync with DST', () => {
    const html = generateTimeOffsetDoc({
      occNumber: 'X',
      isCorrect: false,
      formattedDiff: '01:02:03',
      direction: 'BEHIND',
      captureMethod: 'ocr',
      ocrRawText: '',
      dvrAppliesDST: true,
      sync: { method: 'NTP', server: '', offsetMs: 12.5, uncertaintyMs: 3 },
    })
    expect(html).toContain('behind')
    expect(html).toContain('DST Adjustment Applied')
    expect(html).toContain('12.50ms slow')
  })

  it('escapes the OCR image data URL so it cannot break out of the src attribute', () => {
    const html = generateTimeOffsetDoc({
      ...base,
      ocrImageDataUrl: 'data:image/png;base64,AA" onerror="alert(1)',
    })
    expect(html).not.toContain('onerror="alert(1)')
    expect(html).toContain('&quot;')
  })
})
