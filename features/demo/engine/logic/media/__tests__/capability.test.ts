import { describe, expect, it } from 'vitest'

import {
  captureAvailability,
  sampleFallbackNotice,
  type CaptureSupport,
} from '@/features/demo/engine/logic/media/capability'
import {
  NO_CAPTURE_STORAGE_NOTICE,
  NO_RECORDER_NOTICE,
  SAMPLE_MEDIA_NOTICE,
} from '@/features/demo/engine/logic/media/samples'
import { CAPTURE_FACILITIES } from '@/features/demo/engine/logic/media/permissions'
import { MEDIA_KINDS, type MediaKind } from '@/features/demo/engine/types'

const support = (over: Partial<CaptureSupport> = {}): CaptureSupport => ({
  stream: true,
  record: true,
  objectUrls: true,
  ...over,
})

describe('captureAvailability', () => {
  it('is live for every kind on a fully capable browser', () => {
    for (const kind of MEDIA_KINDS) {
      expect(captureAvailability(support(), kind)).toBe('live')
    }
  })

  it('is sample for every kind when no stream can be opened', () => {
    for (const kind of MEDIA_KINDS) {
      expect(captureAvailability(support({ stream: false, record: false }), kind), kind).toBe('sample')
    }
  })

  it('separates the photo answer from the recording answer — R-3 in one arm', () => {
    // A browser with `getUserMedia` but no `MediaRecorder` (Safari ≤ 14.0, hardened WebViews)
    // takes real photos and can only attach a sample clip. One boolean for both is what printed
    // "This browser doesn't expose a camera to this page" over a live viewfinder.
    const noRecorder = support({ record: false })
    expect(captureAvailability(noRecorder, 'photo')).toBe('live')
    expect(captureAvailability(noRecorder, 'video')).toBe('sample')
    expect(captureAvailability(noRecorder, 'audio')).toBe('sample')
  })

  it('is sample for every kind with no way to hold the bytes', () => {
    for (const kind of MEDIA_KINDS) {
      expect(captureAvailability(support({ objectUrls: false }), kind), kind).toBe('sample')
    }
  })

  it('throws rather than silently inheriting the photo rule for an unknown kind', () => {
    // The runtime half of the exhaustiveness guard: a fourth MediaKind must surface here, not
    // quietly acquire whichever branch it fell into.
    expect(() => captureAvailability(support(), 'hologram' as MediaKind)).toThrow(/Unhandled case/)
  })
})

describe('sampleFallbackNotice', () => {
  it('names the missing device when there is no stream at all', () => {
    for (const facility of CAPTURE_FACILITIES) {
      expect(sampleFallbackNotice(support({ stream: false, record: false }), facility)).toBe(
        SAMPLE_MEDIA_NOTICE[facility],
      )
    }
  })

  it('names the missing recorder when the device opens but nothing can record', () => {
    for (const facility of CAPTURE_FACILITIES) {
      expect(sampleFallbackNotice(support({ record: false }), facility)).toBe(NO_RECORDER_NOTICE[facility])
    }
  })

  it('never claims a missing device when the device is open (the folded S-3 rider)', () => {
    // A live camera with no object-URL support used to render "This browser exposes no camera
    // to the page" — the very sentence the unavailable panel refuses to print as simply false.
    for (const facility of CAPTURE_FACILITIES) {
      const notice = sampleFallbackNotice(support({ objectUrls: false }), facility)
      expect(notice).toBe(NO_CAPTURE_STORAGE_NOTICE)
      expect(notice).not.toMatch(/exposes no (camera|microphone)/)
    }
  })

  it('prefers the outermost reason when several bind at once', () => {
    // No device outranks no storage outranks no recorder: the visitor is told the first thing
    // that would have to be fixed, not the last one checked.
    expect(sampleFallbackNotice({ stream: false, record: false, objectUrls: false }, 'camera')).toBe(
      SAMPLE_MEDIA_NOTICE.camera,
    )
    expect(sampleFallbackNotice({ stream: true, record: false, objectUrls: false }, 'camera')).toBe(
      NO_CAPTURE_STORAGE_NOTICE,
    )
  })

  it('always says that nothing was recorded', () => {
    for (const facility of CAPTURE_FACILITIES) {
      for (const over of [{ stream: false }, { objectUrls: false }, { record: false }]) {
        expect(sampleFallbackNotice(support(over), facility)).toMatch(/Nothing was recorded/)
      }
    }
  })
})
