import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  OCR_RECOGNITION_FAILED_MESSAGE,
  disposeDvrRecognizer,
  recognizeDvrStrip,
} from '@/features/demo/ui/inputs/ocr-recognize'

/**
 * P4.7 — the tesseract.js seam. The real library never loads here (mocked wholesale): what is
 * pinned is the CONTRACT around it — self-hosted asset paths (no CDN), the worker singleton's
 * lifecycle (reuse, boot-failure retry, dispose), and the honesty rule that an empty read is
 * a failure, never a blank success.
 */

interface FakeWorker {
  setParameters: ReturnType<typeof vi.fn>
  recognize: ReturnType<typeof vi.fn>
  terminate: ReturnType<typeof vi.fn>
}

const h = vi.hoisted(() => {
  const state = {
    created: [] as FakeWorker[],
    bootFailures: 0,
    /** When set, `createWorker` stalls on it — the R-32 "still booting" window. */
    bootGate: null as Promise<void> | null,
    nextData: { text: '2025-03-08 12:05:30\n', confidence: 87 } as { text?: unknown; confidence?: unknown },
  }
  return state
})

vi.mock('tesseract.js', () => ({
  OEM: { LSTM_ONLY: 1 },
  PSM: { SINGLE_BLOCK: '6' },
  createWorker: vi.fn(async () => {
    if (h.bootGate) await h.bootGate
    if (h.bootFailures > 0) {
      h.bootFailures -= 1
      throw new Error('worker boot failed')
    }
    const worker: FakeWorker = {
      setParameters: vi.fn(async () => {}),
      recognize: vi.fn(async () => ({ data: h.nextData })),
      terminate: vi.fn(async () => {}),
    }
    h.created.push(worker)
    return worker
  }),
}))

const strip = () => new Blob(['strip-bytes'], { type: 'image/jpeg' })

afterEach(async () => {
  await disposeDvrRecognizer()
  h.created.length = 0
  h.bootFailures = 0
  h.bootGate = null
  h.nextData = { text: '2025-03-08 12:05:30\n', confidence: 87 }
  vi.clearAllMocks()
})

describe('recognizeDvrStrip', () => {
  it('returns trimmed raw text with the confidence normalized to 0–1', async () => {
    const outcome = await recognizeDvrStrip(strip())
    expect(outcome).toEqual({ ok: true, text: '2025-03-08 12:05:30', confidence: 0.87 })
  })

  it('boots the worker from the SELF-HOSTED assets, LSTM-only, single-block segmentation', async () => {
    const { createWorker } = await import('tesseract.js')
    await recognizeDvrStrip(strip())

    // No CDN: every path is the vendored /ocr route (public/ocr/SOURCES.md).
    expect(createWorker).toHaveBeenCalledExactlyOnceWith('eng', 1, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr/tesseract-core-simd-lstm.wasm.js',
      langPath: '/ocr',
    })
    expect(h.created[0].setParameters).toHaveBeenCalledExactlyOnceWith({ tessedit_pageseg_mode: '6' })
  })

  it('reuses one worker across retakes instead of re-booting per frame', async () => {
    const { createWorker } = await import('tesseract.js')
    await recognizeDvrStrip(strip())
    await recognizeDvrStrip(strip())
    expect(createWorker).toHaveBeenCalledTimes(1)
    expect(h.created[0].recognize).toHaveBeenCalledTimes(2)
  })

  it('reports an EMPTY read as a failure — a blank success would fabricate a capture', async () => {
    h.nextData = { text: '   \n', confidence: 95 }
    expect(await recognizeDvrStrip(strip())).toEqual({ ok: false, message: OCR_RECOGNITION_FAILED_MESSAGE })
  })

  it('clamps a malformed confidence into 0–1 and tolerates a missing one', async () => {
    h.nextData = { text: 'x', confidence: 250 }
    expect(await recognizeDvrStrip(strip())).toMatchObject({ ok: true, confidence: 1 })
    h.nextData = { text: 'x' }
    expect(await recognizeDvrStrip(strip())).toMatchObject({ ok: true, confidence: 0 })
  })

  it('a recognition throw becomes the honest failure, not an exception into the screen', async () => {
    await recognizeDvrStrip(strip()) // boot
    h.created[0].recognize.mockRejectedValueOnce(new Error('wasm trap'))
    expect(await recognizeDvrStrip(strip())).toEqual({ ok: false, message: OCR_RECOGNITION_FAILED_MESSAGE })
  })

  it('does NOT cache a failed boot — the next attempt retries (a transient fetch is not fatal)', async () => {
    const { createWorker } = await import('tesseract.js')
    h.bootFailures = 1
    expect(await recognizeDvrStrip(strip())).toEqual({ ok: false, message: OCR_RECOGNITION_FAILED_MESSAGE })
    expect(await recognizeDvrStrip(strip())).toMatchObject({ ok: true })
    expect(createWorker).toHaveBeenCalledTimes(2)
  })
})

describe('disposeDvrRecognizer', () => {
  it('terminates the live worker; the next recognition boots a fresh one', async () => {
    const { createWorker } = await import('tesseract.js')
    await recognizeDvrStrip(strip())
    await disposeDvrRecognizer()
    expect(h.created[0].terminate).toHaveBeenCalledTimes(1)

    await recognizeDvrStrip(strip())
    expect(createWorker).toHaveBeenCalledTimes(2)
  })

  it('is a no-op when nothing was ever created (the suite-default world)', async () => {
    await expect(disposeDvrRecognizer()).resolves.toBeUndefined()
    expect(h.created).toHaveLength(0)
  })

  // R-32 (T-9): the docblock claims the teardown is "safe against a worker that is still
  // booting — the teardown waits for it first". The real path is Cancel during the first
  // shutter's ~6.8 MB asset fetch. Previously asserted nowhere.
  it('waits out a still-booting worker and terminates it — Cancel mid-first-fetch leaks nothing', async () => {
    let openGate: () => void = () => {}
    h.bootGate = new Promise<void>((resolve) => {
      openGate = resolve
    })

    const pendingRead = recognizeDvrStrip(strip()) // boot starts, stalls on the gate
    const pendingDispose = disposeDvrRecognizer() // screen unmounts while it boots
    expect(h.created).toHaveLength(0) // nothing to terminate YET — dispose must be waiting

    openGate()
    await pendingDispose

    expect(h.created).toHaveLength(1)
    expect(h.created[0].terminate).toHaveBeenCalledTimes(1)
    await pendingRead // the abandoned read settles too — no unhandled rejection left behind

    // The singleton really is gone: the next read boots a fresh worker.
    const { createWorker } = await import('tesseract.js')
    await recognizeDvrStrip(strip())
    expect(createWorker).toHaveBeenCalledTimes(2)
  })
})
