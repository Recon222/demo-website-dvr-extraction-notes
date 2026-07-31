import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { SAMPLE_ACTUAL_TIME } from '@/features/demo/engine/content/seed'
import { stubClock } from '@/features/demo/ui/inputs/__tests__/test-utils'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import type { OcrCaptureScreenProps } from '@/features/demo/ui/screens/OcrCaptureScreen'

/**
 * R-5 (T-2): the live-OCR bridge arm (`runOcrLive`), executed. The aggregator reproduced that
 * gutting it — `measured: false`, `imageDataUrl` dropped, `fallbackActual: SAMPLE_ACTUAL_TIME`
 * — left the full suite and tsc green. Each of those three is a headline claim of P4.7, and
 * each is asserted here THROUGH the bridge.
 *
 * `OcrCaptureScreen` is stubbed at the module boundary (T-2's preferred shape — its own
 * behaviour is fully pinned in `marquee.test.tsx` and `OcrCaptureScreen.live.test.tsx`); the
 * stub is just a hand that presses `onLiveRead`/`onConfirm` and a window onto the props the
 * bridge computes.
 */

const LIVE_READ = {
  rawText: '2025-03-08 12:05:30',
  confidence: 0.91,
  imageDataUrl: 'data:image/jpeg;base64,STRIP',
}

vi.mock('@/features/demo/ui/screens/OcrCaptureScreen', () => ({
  OcrCaptureScreen: (props: OcrCaptureScreenProps) => (
    <div>
      <button type="button" onClick={() => props.onLiveRead(LIVE_READ)}>
        stub-live-read
      </button>
      <button type="button" onClick={() => props.onConfirm(true)}>
        stub-commit
      </button>
      <div data-testid="stub-measured">{props.result?.ok ? String(props.result.confidence.measured) : 'none'}</div>
      <div data-testid="stub-actual">{props.result?.ok ? props.result.actual : 'none'}</div>
      <div data-testid="stub-dvr">{props.result?.ok ? props.result.dvrTime : 'none'}</div>
      <div data-testid="stub-draft">{props.dvrDraft}</div>
    </div>
  ),
}))

/** Frozen picker clock — the live path's "actual" must come from HERE, never the sample seed. */
const NOW = () => new Date(2026, 6, 31, 12, 0, 0)

function openOcr(): DemoStore {
  const store = createDemoStore()
  render(<DemoExperience store={store} />)
  act(() => {
    const c = store.getState().createCase({ caseNumber: 'PR26-LIVE', displayName: 'X', unit: 'Robbery' })
    store.getState().addLocation(c, { locationName: 'Rear Door' })
    store.getState().launch('ocr')
  })
  return store
}

beforeEach(() => stubClock(NOW))
afterEach(() => vi.restoreAllMocks())

describe('DemoExperience — the live-OCR bridge arm (runOcrLive)', () => {
  it('presents a live read as MEASURED, parsed through the ported pipeline, against the device clock', () => {
    openOcr()
    fireEvent.click(screen.getByText('stub-live-read'))

    // (1) R-16 honesty: a live read's score is the recogniser's own — never the Sample badge.
    expect(screen.getByTestId('stub-measured')).toHaveTextContent('true')
    // The raw text went through cleanOcrText → readDvrTimestamp, and pre-filled the draft.
    expect(screen.getByTestId('stub-dvr')).toHaveTextContent('2025-03-08 12:05:30')
    expect(screen.getByTestId('stub-draft')).toHaveTextContent('2025-03-08 12:05:30')
    // (3) The calibration instant is the stubbed device clock — a live frame must not borrow
    // the sample seed's hard-coded instant.
    expect(screen.getByTestId('stub-actual')).toHaveTextContent('2026-07-31 12:00:00')
    expect(screen.getByTestId('stub-actual')).not.toHaveTextContent(SAMPLE_ACTUAL_TIME)
  })

  it('commits the live proof whole — strip image, measured score, and the clock-derived actual', () => {
    const store = openOcr()
    fireEvent.click(screen.getByText('stub-live-read'))
    fireEvent.click(screen.getByText('stub-commit'))

    const capture = store.getState().capture
    expect(capture.method).toBe('ocr')
    expect(capture.dvrDateTime).toBe('2025-03-08 12:05:30')
    expect(capture.actualDateTime).toBe('2026-07-31 12:00:00')
    // (2) The evidence image reaches the proof — the always-empty PDF block's fix, end to end.
    expect(capture.ocr).toEqual({
      rawText: '2025-03-08 12:05:30',
      cleanedText: '2025-03-08 12:05:30',
      parsedDateTime: '2025-03-08 12:05:30',
      confidence: 0.91,
      imageDataUrl: 'data:image/jpeg;base64,STRIP',
    })
    // …and lands on the location's committed offset, where the Time-Offset report reads it.
    const off = store.getState().locations[0].form.timeOffset
    expect(off?.ocr?.imageDataUrl).toBe('data:image/jpeg;base64,STRIP')
    expect(off?.captureMethod).toBe('ocr')
  })

  it('an already-calibrated actual time is NOT overwritten by the live read', () => {
    const store = openOcr()
    act(() => store.getState().updateField('capture.actualDateTime', '2026-07-31 11:58:00'))
    fireEvent.click(screen.getByText('stub-live-read'))

    // The shutter freezes the fallback only when no calibration exists — a synced instant wins.
    expect(screen.getByTestId('stub-actual')).toHaveTextContent('2026-07-31 11:58:00')
  })
})
