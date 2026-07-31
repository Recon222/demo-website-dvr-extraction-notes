import { describe, expect, it } from 'vitest'

import {
  CAPTURE_ERROR_CODES,
  CAPTURE_FACILITIES,
  CAPTURE_PERMISSION_COPY,
  CAPTURE_PERMISSION_STATES,
  captureFailure,
  captureFailureMessage,
  classifyCaptureError,
  permissionAfterFailure,
  type CaptureErrorCode,
} from '@/features/demo/engine/logic/media/permissions'

/** A DOMException-shaped rejection without needing the real constructor in jsdom. */
const domError = (name: string): unknown => ({ name, message: `${name}: synthetic` })

describe('classifyCaptureError', () => {
  it.each([
    ['NotAllowedError', 'PERMISSION_DENIED'],
    ['SecurityError', 'PERMISSION_DENIED'],
    ['NotFoundError', 'NO_DEVICE'],
    ['OverconstrainedError', 'NO_DEVICE'],
    ['NotReadableError', 'DEVICE_BUSY'],
    ['AbortError', 'DEVICE_BUSY'],
    ['TypeError', 'UNSUPPORTED'],
  ] as const)('maps %s → %s', (name, code) => {
    expect(classifyCaptureError(domError(name))).toBe(code)
  })

  it('classifies an unrecognised DOMException name as UNKNOWN rather than guessing', () => {
    expect(classifyCaptureError(domError('SomeFutureError'))).toBe('UNKNOWN')
  })

  it.each([[null], [undefined], ['NotAllowedError'], [42], [{}], [{ name: 7 }]])(
    'classifies a non-DOMException rejection (%p) as UNKNOWN',
    (thrown) => {
      // A string that happens to READ like a name is still not a DOMException — the
      // structural check must not be fooled into reporting a denial that never happened.
      expect(classifyCaptureError(thrown)).toBe('UNKNOWN')
    },
  )
})

describe('captureFailureMessage', () => {
  it('has a distinct, non-empty sentence for every code × facility', () => {
    const seen = new Set<string>()
    for (const facility of CAPTURE_FACILITIES) {
      for (const code of CAPTURE_ERROR_CODES) {
        const message = captureFailureMessage(code, facility)
        expect(message.length).toBeGreaterThan(0)
        seen.add(`${facility}:${message}`)
      }
    }
    expect(seen.size).toBe(CAPTURE_FACILITIES.length * CAPTURE_ERROR_CODES.length)
  })

  it('lifts the phone string verbatim for a missing camera (VisionCameraScreen.tsx:497)', () => {
    expect(captureFailureMessage('NO_DEVICE', 'camera')).toBe('No camera device available')
  })

  it('states the negative outcome explicitly in every sentence (the honesty pin)', () => {
    // A failure sentence that only names the cause ("the camera is busy") leaves the visitor
    // to assume the demo's usual behaviour. Every one must SAY that nothing happened.
    for (const facility of CAPTURE_FACILITIES) {
      for (const code of CAPTURE_ERROR_CODES) {
        expect(captureFailureMessage(code, facility)).toMatch(
          /\b(no|not|nothing|denied|failed|could not|couldn't|doesn't|won't)\b/i,
        )
      }
    }
  })

  it('points a denial at the browser, not at device settings (the phone remedy would be wrong here)', () => {
    for (const facility of CAPTURE_FACILITIES) {
      const message = captureFailureMessage('PERMISSION_DENIED', facility)
      expect(message).toMatch(/browser's site settings/)
      expect(message).not.toMatch(/device settings/)
    }
  })

  it('says a failed recording produced nothing (never a silent empty save)', () => {
    expect(captureFailureMessage('RECORDING_FAILED', 'microphone')).toMatch(/nothing was saved/)
  })

  it('captureFailure pairs the code with its canonical message', () => {
    expect(captureFailure('NO_DEVICE', 'camera')).toEqual({
      code: 'NO_DEVICE',
      message: 'No camera device available',
    })
  })
})

describe('permissionAfterFailure', () => {
  it('treats only a refusal as denied', () => {
    expect(permissionAfterFailure('PERMISSION_DENIED')).toBe('denied')
  })

  it('treats a missing capability or device as unavailable — the sample-offering state', () => {
    expect(permissionAfterFailure('UNSUPPORTED')).toBe('unavailable')
    expect(permissionAfterFailure('NO_DEVICE')).toBe('unavailable')
  })

  it.each(['DEVICE_BUSY', 'RECORDING_FAILED', 'FRAME_GRAB_FAILED', 'UNKNOWN'] as const)(
    'leaves %s at prompt so the retry affordance stays live',
    (code) => {
      expect(permissionAfterFailure(code)).toBe('prompt')
    },
  )

  it('resolves every code to a declared permission state', () => {
    for (const code of CAPTURE_ERROR_CODES) {
      expect(CAPTURE_PERMISSION_STATES).toContain(permissionAfterFailure(code))
    }
  })

  it('throws rather than falling through when handed a code outside the union', () => {
    // The runtime half of the exhaustiveness guard: a future code that skips the switch must
    // surface, not silently resolve to `undefined` and render as an un-styled permission state.
    expect(() => permissionAfterFailure('WORMHOLE_ERROR' as CaptureErrorCode)).toThrow(/Unhandled case/)
  })
})

describe('CAPTURE_PERMISSION_COPY', () => {
  it('lifts the phone headlines verbatim', () => {
    expect(CAPTURE_PERMISSION_COPY.camera.title).toBe('Camera Access Required')
    expect(CAPTURE_PERMISSION_COPY.camera.body).toBe(
      'This app needs camera and microphone access to capture photos and videos.',
    )
    expect(CAPTURE_PERMISSION_COPY.microphone.title).toBe('Microphone Access Required')
  })

  it('is frozen — screens read this copy, they never patch it', () => {
    expect(Object.isFrozen(CAPTURE_PERMISSION_COPY)).toBe(true)
    expect(Object.isFrozen(CAPTURE_PERMISSION_COPY.camera)).toBe(true)
  })

  it('covers every facility', () => {
    for (const facility of CAPTURE_FACILITIES) {
      expect(CAPTURE_PERMISSION_COPY[facility].title.length).toBeGreaterThan(0)
      expect(CAPTURE_PERMISSION_COPY[facility].deniedBody).toMatch(/browser's site settings/)
    }
  })

  it('gives the unavailable state its own sentence — never the denied one (P4.3)', () => {
    // "This browser can't" and "you said no" are different facts, and the screens branch on
    // them: only the unavailable arm offers the bundled sample. Sharing one sentence would
    // either tell a refused visitor to press a sample button that isn't there, or tell someone
    // on a camera-less machine to go change a site permission that would not help.
    for (const facility of CAPTURE_FACILITIES) {
      const copy = CAPTURE_PERMISSION_COPY[facility]
      expect(copy.unavailableBody).not.toBe(copy.deniedBody)
      expect(copy.unavailableBody).not.toMatch(/site settings/)
      expect(copy.unavailableBody).toMatch(/bundled sample/)
    }
    expect(CAPTURE_PERMISSION_COPY.camera.unavailableBody).toMatch(/no camera/)
    expect(CAPTURE_PERMISSION_COPY.microphone.unavailableBody).toMatch(/no microphone/)
  })

  it('never sends a browser visitor to their device settings (§58b, all three bodies)', () => {
    for (const facility of CAPTURE_FACILITIES) {
      const copy = CAPTURE_PERMISSION_COPY[facility]
      for (const body of [copy.body, copy.deniedBody, copy.unavailableBody]) {
        expect(body).not.toMatch(/device settings/i)
      }
    }
  })
})
