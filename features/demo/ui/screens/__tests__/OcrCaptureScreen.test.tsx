import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { OcrCaptureScreen, type OcrCaptureScreenProps, type OcrResult } from '@/features/demo/ui/screens/OcrCaptureScreen'

/**
 * U7.3 — the OCR surface's chrome: the mono policy at the one file that carries both faces
 * (A94 / D13), the confirm stage's glass tiers and severity callouts (B.6 row 37), and the
 * D12 sample amber's defence.
 *
 * The camera/live world is `OcrCaptureScreen.live.test.tsx`'s; nothing here injects
 * `mediaDevices`, so every case takes the suite's default sample path
 * (`vitest.setup.ts:74-75` leaves `navigator.mediaDevices` undefined ON PURPOSE — that is the
 * tested contract, not a gap).
 */

const parsed: OcrResult = {
  ok: true,
  dvrTime: '2025-03-08 12:05:30',
  confidence: { label: 'High', color: '#10d177', measured: true },
  actual: '2025-03-08 12:00:00',
  resolution: { kind: 'exact' },
}

function props(overrides: Partial<OcrCaptureScreenProps> = {}): OcrCaptureScreenProps {
  return {
    result: null,
    dvrDraft: '',
    onChangeDvrDraft: vi.fn(),
    dateConfirmed: false,
    onConfirmDate: vi.fn(),
    hasExtractedScopes: false,
    onUseSample: vi.fn(),
    onCapture: vi.fn(),
    onLiveRead: vi.fn(),
    onCancel: vi.fn(),
    onRetake: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  }
}

/**
 * The BEHAVIOURAL anchor under `ui/__tests__/fonts.test.ts`'s file-level mono scan. A94 names
 * this file specifically because it is the one surface that paints both faces, so it is the one
 * surface where a render pin can tell the policy's two halves apart at the same time.
 *
 * `fontFamily` is read off the inline style, not a class — jsdom renders no CSS
 * (`vitest.config.mts:31`, `css: false`), so an inline object is the only observable there is.
 */
describe('OcrCaptureScreen — the mono policy, rendered (A94 / D13)', () => {
  it('paints the viewfinder HUD caption in Share Tech Mono', () => {
    render(<OcrCaptureScreen {...props()} />)
    const caption = screen.getByText('AIM AT THE DVR CLOCK')
    expect(caption.style.fontFamily).toContain('--font-stmono')
    expect(caption.style.fontFamily).not.toContain('--font-jbmono')
  })

  it('paints the evidentiary values in JetBrains Mono, never the scanner face', () => {
    render(<OcrCaptureScreen {...props({ result: parsed, dvrDraft: parsed.dvrTime })} />)
    // The parsed DVR time and the atomic actual: the two numbers this screen exists to produce.
    // Phone `ConfirmationScreen.tsx:378-381` paints its counterpart with
    // `Typography.fontFamily.mono`, i.e. the EVIDENTIARY role, not `scannerMono`.
    for (const value of [parsed.dvrTime, parsed.actual]) {
      const node = screen.getByText(value)
      expect(node.style.fontFamily, `${value} must take the evidentiary face`).toContain('--font-jbmono')
      expect(node.style.fontFamily).not.toContain('--font-stmono')
    }
  })

  it('paints an unreadable frame`s raw OCR text in JetBrains Mono', () => {
    render(<OcrCaptureScreen {...props({ result: { ok: false, rawText: '88:88 ??' } })} />)
    const raw = screen.getByText('88:88 ??')
    expect(raw.style.fontFamily).toContain('--font-jbmono')
    expect(raw.style.fontFamily).not.toContain('--font-stmono')
  })
})
