'use client'

/**
 * In-browser text recognition for the OCR camera (parity P4.7) — the demo's analog of the
 * phone's ML Kit call (`@react-native-ml-kit/text-recognition` in `useOCRProcessing`). The
 * recogniser reads the cropped DVR strip and hands RAW text out; everything intelligent about
 * that text — cleaning, parsing, disambiguation — stays in the ported engine pipeline
 * (`engine/logic/ocr.ts`), exactly as the phone layers ML Kit under its cleaning pipeline.
 *
 * Tesseract.js is HEAVY, so none of it may enter the first-load graph:
 * - `import('tesseract.js')` happens at first recognition, never at module scope;
 * - the worker script, the wasm core and the language model are self-hosted under
 *   `public/ocr/` (see `public/ocr/SOURCES.md`) and fetched by the worker only when
 *   recognition actually runs — the demo never talks to a third-party CDN.
 *
 * The worker is a module singleton: created on first use (wasm compile + ~6.8 MB of assets),
 * reused across retakes, and torn down by `disposeDvrRecognizer()` when the OCR screen
 * unmounts — a resident recogniser would hold tens of MB of wasm heap for a screen the
 * visitor left. Vitest never reaches any of this: the screen takes a `recognize` seam, and
 * the suite's default world has no camera to produce a frame in the first place.
 *
 * Failure policy: a recognition that produced NOTHING is reported as a failure, never as an
 * empty success — and the message says what still works (retake, or the sample path).
 */

export interface OcrRecognition {
  /** Raw recogniser output — fed VERBATIM to `cleanOcrText`, which owns the fixing. */
  text: string
  /** Word-weighted confidence, normalized to 0–1 (Tesseract reports 0–100). */
  confidence: number
}

export type OcrRecognizeOutcome = ({ ok: true } & OcrRecognition) | { ok: false; message: string }

/** The injection seam the OCR screen consumes — tests hand in a fake, the browser gets
 *  `recognizeDvrStrip`. */
export type OcrRecognizeFn = (image: Blob) => Promise<OcrRecognizeOutcome>

/** Self-hosted runtime assets (public/ocr — see SOURCES.md there). */
const OCR_ASSET_BASE = '/ocr'

/** One honest sentence for every way the recogniser can fail: the distinction the visitor can
 *  act on is not WHICH internal step broke, but that nothing was read and what still works. */
export const OCR_RECOGNITION_FAILED_MESSAGE =
  'Text recognition failed — nothing was read from the frame. Try again, or use the sample DVR clock below.'

type TesseractWorker = Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>>

let workerPromise: Promise<TesseractWorker> | null = null

async function createDvrWorker(): Promise<TesseractWorker> {
  const { createWorker, OEM, PSM } = await import('tesseract.js')
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: `${OCR_ASSET_BASE}/worker.min.js`,
    // A specific .js file pins the exact core; the SIMD+LSTM single-file build covers every
    // wasm-SIMD browser (the modern baseline). A browser without wasm SIMD fails honestly
    // into the sample path — deferred §64 records the trade.
    corePath: `${OCR_ASSET_BASE}/tesseract-core-simd-lstm.wasm.js`,
    langPath: OCR_ASSET_BASE,
  })
  // SINGLE_BLOCK: the strip is a cropped band that may carry the date and time as one or two
  // short lines; full-page segmentation (the default) hunts for columns that don't exist.
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
  return worker
}

/**
 * Recognize the cropped DVR strip. Serialized per worker by tesseract.js's own job queue;
 * a failed WORKER BOOT is not cached, so a transient asset fetch failure can be retried.
 */
export async function recognizeDvrStrip(image: Blob): Promise<OcrRecognizeOutcome> {
  try {
    if (workerPromise === null) {
      workerPromise = createDvrWorker()
      // A boot that failed must not poison every later attempt with the same rejection.
      workerPromise.catch(() => {
        workerPromise = null
      })
    }
    const worker = await workerPromise
    const { data } = await worker.recognize(image)
    const text = typeof data.text === 'string' ? data.text.trim() : ''
    if (text === '') return { ok: false, message: OCR_RECOGNITION_FAILED_MESSAGE }
    const confidence = typeof data.confidence === 'number' ? data.confidence : 0
    return { ok: true, text, confidence: Math.min(Math.max(confidence / 100, 0), 1) }
  } catch {
    return { ok: false, message: OCR_RECOGNITION_FAILED_MESSAGE }
  }
}

/** Tear the singleton down (OCR screen unmount). Safe when nothing was ever created, and
 *  safe against a worker that is still booting — the teardown waits for it first. */
export async function disposeDvrRecognizer(): Promise<void> {
  const pending = workerPromise
  workerPromise = null
  if (!pending) return
  try {
    const worker = await pending
    await worker.terminate()
  } catch {
    // A worker that failed to boot has nothing to terminate; a terminate that throws has
    // already released what it could. Either way there is nothing to tell the visitor.
  }
}
