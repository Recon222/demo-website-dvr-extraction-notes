/**
 * Capture permissions + failure taxonomy — the pure core of the demo's media capability
 * (parity P4.1, matrix §1.11 preamble). Consumed by every P4 media surface: the photo/video
 * capture screen (P4.3), the audio recorder (P4.6) and the OCR camera step (P4.7).
 *
 * Same split as the GPS capability (P2.3): everything that DECIDES lives here as pure
 * functions over injected values; the `getUserMedia` / `MediaRecorder` I/O lives in
 * `ui/inputs/capture-media.ts`. No `navigator`, no DOM, no timers in this file.
 *
 * ── Honesty contract ────────────────────────────────────────────────────────────────
 * A denied camera produces a DENIED state and nothing else. The sample fallback
 * (`./samples.ts`) is never substituted for a capture the visitor was refused or that
 * failed — it is offered when the browser exposes NO capture capability at all, and it is
 * labelled `sample: true` everywhere it appears. `vitest.setup.ts` deliberately leaves
 * `navigator.mediaDevices` undefined (and jsdom ships no `MediaRecorder` and no
 * `URL.createObjectURL`), so `UNAVAILABLE` / the sample path is the DEFAULT tested contract,
 * exactly as `UNSUPPORTED` is for GPS.
 */

import { assertNever } from '@/features/demo/engine/logic/assert-never'

// ---- Facilities -----------------------------------------------------------

/** The two hardware facilities the demo asks for. Named as an `as const` tuple (the store's
 *  snapshot-guard device 3) so any widening reaches every exhaustive switch below. */
export const CAPTURE_FACILITIES = ['camera', 'microphone'] as const
export type CaptureFacility = (typeof CAPTURE_FACILITIES)[number]

// ---- Permission states ----------------------------------------------------

/**
 * The four states a capture surface can be in before it has a stream.
 *
 * `prompt` / `granted` / `denied` mirror the Permissions API's own vocabulary. `unavailable`
 * is the state a phone does not have: the page is not merely un-permitted, the browser
 * exposes no capture API to it at all (jsdom, an insecure origin, a locked-down browser, a
 * `Permissions-Policy` block). It is a DIFFERENT sentence to the visitor — "your browser
 * won't let this page use a camera" is not "you said no" — and it is the only state that
 * offers the sample fallback.
 */
export const CAPTURE_PERMISSION_STATES = ['prompt', 'granted', 'denied', 'unavailable'] as const
export type CapturePermission = (typeof CAPTURE_PERMISSION_STATES)[number]

// ---- Failure taxonomy -----------------------------------------------------

/**
 * Every way a capture can fail, classified. Unlike the GPS capability — which could drop
 * `UNKNOWN` because every rejection path was classifiable — `getUserMedia` and
 * `MediaRecorder` reject with an open-ended `DOMException.name` set, so `UNKNOWN` here has a
 * real producer and is pinned by a test.
 *
 * `PERMISSION_DENIED` … `UNSUPPORTED` are what `classifyCaptureError` emits.
 * `RECORDING_FAILED` and `FRAME_GRAB_FAILED` are raised by the recorder / canvas paths in
 * `ui/inputs/capture-media.ts`, which know their own context and never guess.
 */
export const CAPTURE_ERROR_CODES = [
  /** `NotAllowedError` / `SecurityError` — the visitor, or the embedding policy, said no. */
  'PERMISSION_DENIED',
  /** `NotFoundError` / `OverconstrainedError` — nothing matched the request. */
  'NO_DEVICE',
  /** `NotReadableError` / `AbortError` — the hardware exists but would not start. */
  'DEVICE_BUSY',
  /** No `mediaDevices` / no `MediaRecorder` / no object-URL support on this origin. */
  'UNSUPPORTED',
  /** The recorder errored, or stopped having produced zero bytes. */
  'RECORDING_FAILED',
  /** A photo frame could not be drawn or encoded (no 2d context, `toBlob` returned null). */
  'FRAME_GRAB_FAILED',
  /** An unrecognised rejection — classified as such rather than mislabelled. */
  'UNKNOWN',
] as const
export type CaptureErrorCode = (typeof CAPTURE_ERROR_CODES)[number]

export interface CaptureFailure {
  code: CaptureErrorCode
  message: string
}

/**
 * Operator-facing failure copy.
 *
 * The phone's own strings are lifted verbatim where the phone HAS one for the same state:
 * `NO_DEVICE`/camera is `VisionCameraScreen.tsx:497`'s "No camera device available", and the
 * permission headline/body pair the screens render comes from `PermissionsView.tsx` (camera)
 * and `RecorderScreen.tsx:219-224` (microphone) — see `CAPTURE_PERMISSION_COPY`.
 *
 * The one deliberate divergence is the REMEDY sentence. The phone says "enable microphone
 * access in your device settings"; in a browser the switch is the site permission, not an OS
 * setting, so repeating the phone's sentence would send the visitor somewhere that cannot fix
 * it. Copy parity loses to being correct (deferred §58).
 */
export function captureFailureMessage(code: CaptureErrorCode, facility: CaptureFacility): string {
  const thing = facility === 'camera' ? 'camera' : 'microphone'
  switch (code) {
    case 'PERMISSION_DENIED':
      return `${facility === 'camera' ? 'Camera' : 'Microphone'} access was denied — nothing was captured. Allow it in your browser's site settings to try again.`
    case 'NO_DEVICE':
      // Phone verbatim for the camera case (VisionCameraScreen.tsx:497).
      return facility === 'camera' ? 'No camera device available' : 'No microphone device available'
    case 'DEVICE_BUSY':
      return `The ${thing} could not be started — another app or tab may be using it.`
    case 'UNSUPPORTED':
      return `This browser doesn't expose a ${thing} to this page — nothing was captured.`
    case 'RECORDING_FAILED':
      // Never "saved anyway": a recorder that produced no bytes recorded NOTHING.
      return 'The recording failed and produced no audio or video — nothing was saved.'
    case 'FRAME_GRAB_FAILED':
      return 'This browser could not turn the camera frame into an image — nothing was captured.'
    case 'UNKNOWN':
      return `The ${thing} could not be opened — nothing was captured.`
    default:
      return assertNever(code)
  }
}

/** Build a failure with its canonical message — the single construction site, so no caller
 *  hand-writes a sentence for a code that already has one. */
export function captureFailure(code: CaptureErrorCode, facility: CaptureFacility): CaptureFailure {
  return { code, message: captureFailureMessage(code, facility) }
}

/**
 * The headline/body pair a permission screen renders, lifted from the phone.
 *
 * Camera: `PermissionsView.tsx` — title "Camera Access Required", description "This app needs
 * camera and microphone access to capture photos and videos." (ui-mapping 09).
 * Microphone: `RecorderScreen.tsx:219-224` — title "Microphone Access Required" verbatim; the
 * body's remedy clause is browser-corrected (see `captureFailureMessage`).
 *
 * `unavailableBody` (P4.3) has no phone counterpart, because `unavailable` is a state the phone
 * does not have (see `CAPTURE_PERMISSION_STATES`). It is the ONE state that offers the bundled
 * sample, so its sentence has to say both halves: nothing here is live, and the flow still runs.
 * It lives here rather than in `captureFailureMessage` because that function is keyed by
 * `CaptureErrorCode` — a taxonomy of things that WENT WRONG — and "this page was never given a
 * camera" is a standing condition the visitor meets before pressing anything, not a failure of
 * an attempt they made.
 */
export const CAPTURE_PERMISSION_COPY: Readonly<
  Record<
    CaptureFacility,
    {
      readonly title: string
      readonly body: string
      readonly deniedBody: string
      readonly unavailableBody: string
    }
  >
> = Object.freeze({
  camera: Object.freeze({
    title: 'Camera Access Required',
    body: 'This app needs camera and microphone access to capture photos and videos.',
    deniedBody: "Camera access is blocked for this page. Allow it in your browser's site settings, then try again.",
    unavailableBody:
      'This browser exposes no camera to the page, so nothing here is live. You can still walk the whole flow with a bundled sample.',
  }),
  microphone: Object.freeze({
    title: 'Microphone Access Required',
    body: 'This app needs microphone access to record an audio note.',
    deniedBody:
      "Microphone access is blocked for this page. Allow it in your browser's site settings, then try again.",
    unavailableBody:
      'This browser exposes no microphone to the page, so nothing here is live. You can still walk the whole flow with a bundled sample.',
  }),
})

// ---- Classification -------------------------------------------------------

/** Structural narrowing — a rejected `getUserMedia` hands back a `DOMException`, but a
 *  stubbed or non-conformant implementation can reject with anything at all. */
function errorName(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null
  const name = (error as { name?: unknown }).name
  return typeof name === 'string' ? name : null
}

/**
 * `getUserMedia` rejection → a `CaptureErrorCode`, per the W3C media-capture error names.
 *
 * `SecurityError` joins `PERMISSION_DENIED` rather than `UNSUPPORTED`: modern browsers drop
 * `navigator.mediaDevices` entirely on an insecure origin (which the null-API path already
 * reports as `UNSUPPORTED`), so a `SecurityError` that does arrive means "this document is
 * not allowed to", which is a refusal, not a missing feature.
 *
 * `TypeError` is `UNSUPPORTED`: `getUserMedia` throws it for a constraints object the
 * implementation cannot honour at all, which is a capability statement, not a device one.
 */
export function classifyCaptureError(error: unknown): CaptureErrorCode {
  switch (errorName(error)) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'PERMISSION_DENIED'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'NO_DEVICE'
    case 'NotReadableError':
    case 'AbortError':
      return 'DEVICE_BUSY'
    case 'TypeError':
      return 'UNSUPPORTED'
    default:
      return 'UNKNOWN'
  }
}

/**
 * The permission state a failure implies. Only a refusal is `denied`; a missing capability is
 * `unavailable`; everything else leaves the visitor at `prompt` so the retry affordance stays
 * live (a busy camera is not a permanent answer).
 */
export function permissionAfterFailure(code: CaptureErrorCode): CapturePermission {
  switch (code) {
    case 'PERMISSION_DENIED':
      return 'denied'
    case 'NO_DEVICE':
    case 'UNSUPPORTED':
      return 'unavailable'
    case 'DEVICE_BUSY':
    case 'RECORDING_FAILED':
    case 'FRAME_GRAB_FAILED':
    case 'UNKNOWN':
      return 'prompt'
    default:
      return assertNever(code)
  }
}
