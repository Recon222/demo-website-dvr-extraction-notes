import { describe, it, expect } from 'vitest'

import {
  OCR_BOX_HEIGHT_FRACTION,
  OCR_BOX_WIDTH_FRACTION,
  OCR_CROP_BUFFER_FRACTION,
  ocrCropRegion,
} from '@/features/demo/engine/logic/ocr-crop'

/**
 * P4.7 — the OCR strip's crop geometry. The constants are the phone's own
 * (`src/features/ocr-time-capture/constants/index.ts:4-15`), and the aspect-matched case must
 * reduce exactly to the phone's crop (`ocr-capture-service.ts:65-70`): width buffered by 5%
 * per side, height NOT buffered, centered.
 */

describe('the phone constants (verified against source — refuting drift is the test)', () => {
  it('pins 80% × 17% with a 5% per-side buffer', () => {
    expect(OCR_BOX_WIDTH_FRACTION).toBe(0.8)
    expect(OCR_BOX_HEIGHT_FRACTION).toBe(0.17)
    expect(OCR_CROP_BUFFER_FRACTION).toBe(0.05)
  })
})

describe('ocrCropRegion', () => {
  it('reduces to the phone crop when the stream matches the viewfinder aspect', () => {
    const crop = ocrCropRegion(1920, 1080, 1920 / 1080)!
    expect(crop.width).toBeCloseTo(0.9, 10) // 0.80 + 2 × 0.05 — buffer on the width…
    expect(crop.height).toBeCloseTo(0.17, 10) // …and NONE on the height (phone: line 68)
    expect(crop.x).toBeCloseTo(0.05, 10)
    expect(crop.y).toBeCloseTo(0.415, 10) // centered: (1 − 0.17) / 2
  })

  it('is centered for every aspect combination', () => {
    for (const [w, h, aspect] of [
      [1280, 720, 16 / 9],
      [640, 480, 16 / 9],
      [1920, 1080, 4 / 3],
    ] as const) {
      const crop = ocrCropRegion(w, h, aspect)!
      expect(crop.x).toBeCloseTo((1 - crop.width) / 2, 10)
      expect(crop.y).toBeCloseTo((1 - crop.height) / 2, 10)
    }
  })

  it('shrinks the crop HEIGHT for a 4:3 camera in a 16:9 viewfinder (top/bottom never seen)', () => {
    // cover crops the frame's top and bottom: only 3/4 ÷ (16/9) = 0.75 of the height shows.
    const crop = ocrCropRegion(640, 480, 16 / 9)!
    expect(crop.width).toBeCloseTo(0.9, 10) // full visible width — the width fraction holds
    expect(crop.height).toBeCloseTo(0.17 * ((640 / 480) / (16 / 9)), 10)
    // The strip stays inside the VISIBLE band: visible y-range is [0.125, 0.875].
    expect(crop.y).toBeGreaterThan(0.125)
    expect(crop.y + crop.height).toBeLessThan(0.875)
  })

  it('shrinks the crop WIDTH for a stream wider than the viewfinder (sides never seen)', () => {
    // A 21:9-ish stream in a 16:9 view: cover crops the sides; visible width = (16/9)/(21/9).
    const crop = ocrCropRegion(2100, 900, 16 / 9)!
    const visible = 16 / 9 / (2100 / 900)
    expect(crop.width).toBeCloseTo(0.9 * visible, 10)
    expect(crop.height).toBeCloseTo(0.17, 10)
    // Inside the visible band horizontally.
    expect(crop.x).toBeGreaterThan((1 - visible) / 2)
    expect(crop.x + crop.width).toBeLessThan(1 - (1 - visible) / 2)
  })

  it('refuses degenerate inputs instead of cropping a guess', () => {
    expect(ocrCropRegion(0, 720, 16 / 9)).toBeNull()
    expect(ocrCropRegion(1280, 0, 16 / 9)).toBeNull()
    expect(ocrCropRegion(1280, 720, 0)).toBeNull()
    expect(ocrCropRegion(Number.NaN, 720, 16 / 9)).toBeNull()
  })
})
