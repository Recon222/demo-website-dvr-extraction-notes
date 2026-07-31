import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

import { OcrCaptureScreen, type OcrCaptureScreenProps } from '@/features/demo/ui/screens/OcrCaptureScreen'
import { disposeDvrRecognizer } from '@/features/demo/ui/inputs/ocr-recognize'

/**
 * P4.7 — the recogniser's teardown wiring, in its own file because it mocks the module the
 * other suites use for types only. The default recogniser holds a wasm worker (tens of MB),
 * so the screen must release it on unmount — and must NOT touch the singleton when a test or
 * caller injected its own `recognize` seam, whose lifecycle is not the screen's to manage.
 */

vi.mock('@/features/demo/ui/inputs/ocr-recognize', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/demo/ui/inputs/ocr-recognize')>()
  return { ...original, disposeDvrRecognizer: vi.fn(async () => {}) }
})

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

afterEach(() => {
  vi.clearAllMocks()
})

describe('recogniser teardown', () => {
  it('disposes the default recogniser when the screen unmounts', () => {
    const view = render(<OcrCaptureScreen {...props()} />)
    expect(disposeDvrRecognizer).not.toHaveBeenCalled()
    view.unmount()
    expect(disposeDvrRecognizer).toHaveBeenCalledTimes(1)
  })

  it('leaves an INJECTED recogniser alone — its lifecycle is the injector’s', () => {
    const view = render(<OcrCaptureScreen {...props({ deps: { recognize: vi.fn() } })} />)
    view.unmount()
    expect(disposeDvrRecognizer).not.toHaveBeenCalled()
  })
})
