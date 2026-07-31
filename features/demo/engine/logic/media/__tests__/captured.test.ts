import { describe, expect, it } from 'vitest'

import {
  MAX_CAPTION_LENGTH,
  MAX_FILENAME_LENGTH,
  MEDIA_EXPIRED_NOTICE,
  buildMediaItem,
  collectMediaUrls,
  defaultCaptureBasename,
  isDurableMediaUrl,
  isMediaAvailable,
  isValidFilename,
  mediaFilename,
  sanitizeFilename,
  withoutEphemeralMedia,
  withoutEphemeralMediaUrls,
  type CapturedMedia,
} from '@/features/demo/engine/logic/media/captured'
import type { DemoLocation, MediaItem } from '@/features/demo/engine/types'

const captured = (over: Partial<CapturedMedia> = {}): CapturedMedia => ({
  kind: 'photo',
  url: 'blob:http://localhost/abc',
  mimeType: 'image/jpeg',
  capturedAt: '2026-07-30 14:05:06',
  sample: false,
  ...over,
})

const item = (over: Partial<MediaItem> = {}): MediaItem => ({
  id: 'm1',
  kind: 'photo',
  url: 'blob:http://localhost/abc',
  filename: 'rack.jpg',
  caption: '',
  capturedAt: '2026-07-30 14:05:06',
  ...over,
})

describe('sanitizeFilename (phone MetadataForm parity)', () => {
  it('strips exactly the phone illegal set and nothing else', () => {
    expect(sanitizeFilename('DVR<rack>:"front"/back\\side|x?y*z')).toBe('DVRrackfrontbacksidexyz')
  })

  it('leaves spaces, dots, dashes and unicode alone', () => {
    expect(sanitizeFilename('front door - cam 2.b')).toBe('front door - cam 2.b')
    expect(sanitizeFilename('café')).toBe('café')
  })
})

describe('isValidFilename (phone 1–100 trimmed)', () => {
  it.each([
    ['', false],
    ['   ', false],
    ['a', true],
    ['a'.repeat(MAX_FILENAME_LENGTH), true],
    ['a'.repeat(MAX_FILENAME_LENGTH + 1), false],
  ])('validates %p as %p', (value, expected) => {
    expect(isValidFilename(value)).toBe(expected)
  })

  it('validates on the trimmed value, as the phone does', () => {
    expect(isValidFilename('  x  ')).toBe(true)
  })
})

describe('the phone’s field caps', () => {
  it('matches the phone’s two maxLength constants (MetadataForm.tsx:27-28)', () => {
    expect(MAX_FILENAME_LENGTH).toBe(100)
    expect(MAX_CAPTION_LENGTH).toBe(500)
  })

  it('leaves the caption cap OUT of the validity rule — the phone validates the filename only', () => {
    // A caption longer than the cap cannot be typed (the field refuses the keystroke), so it is
    // not a validity state; only the filename gates Save.
    expect(isValidFilename('a')).toBe(true)
  })
})

describe('mediaFilename', () => {
  it('appends the extension for the container that was actually produced', () => {
    expect(mediaFilename('rack front', captured({ kind: 'video', mimeType: 'video/webm' }))).toBe(
      'rack front.webm',
    )
    expect(mediaFilename('note', captured({ kind: 'audio', mimeType: 'audio/mp4' }))).toBe('note.m4a')
  })

  it('sanitizes and trims the base before appending', () => {
    expect(mediaFilename('  a/b:c  ', captured())).toBe('abc.jpg')
  })
})

describe('defaultCaptureBasename (the live camera capture’s metadata-form pre-fill)', () => {
  it('names the kind and the capture instant, from the capture’s own timestamp', () => {
    expect(defaultCaptureBasename(captured())).toBe('photo-20260730-140506')
    expect(defaultCaptureBasename(captured({ kind: 'video', capturedAt: '2026-01-02 03:04:05' }))).toBe(
      'video-20260102-030405',
    )
  })

  it('reads the capture timestamp, never an ambient clock', () => {
    // The demo forbids `Date.now()` outside the seam. Two captures a year apart must produce
    // two different names when the WALL clock has not moved at all, which is what proves the
    // figure came off `CapturedMedia` rather than out of `new Date()`.
    const a = defaultCaptureBasename(captured({ capturedAt: '2026-07-30 14:05:06' }))
    const b = defaultCaptureBasename(captured({ capturedAt: '2027-07-30 14:05:06' }))
    expect(a).not.toBe(b)
  })

  it('falls back to the bare kind rather than emitting a truncated date that looks real', () => {
    expect(defaultCaptureBasename(captured({ capturedAt: '' }))).toBe('photo')
    expect(defaultCaptureBasename(captured({ kind: 'audio', capturedAt: '2026-07-30' }))).toBe('audio')
  })

  it('survives the filename rule it feeds — no illegal characters, always valid', () => {
    const base = defaultCaptureBasename(captured())
    expect(sanitizeFilename(base)).toBe(base)
    expect(isValidFilename(base)).toBe(true)
    expect(mediaFilename(base, captured())).toBe('photo-20260730-140506.jpg')
  })
})

describe('buildMediaItem', () => {
  it('maps a live capture onto the stored shape', () => {
    expect(
      buildMediaItem({
        id: 'm7',
        captured: captured({ kind: 'video', mimeType: 'video/mp4', durationSec: 12, poster: 'blob:p' }),
        filename: 'rear door',
        caption: 'Rear door DVR',
      }),
    ).toEqual({
      id: 'm7',
      kind: 'video',
      url: 'blob:http://localhost/abc',
      poster: 'blob:p',
      filename: 'rear door.mp4',
      caption: 'Rear door DVR',
      capturedAt: '2026-07-30 14:05:06',
      durationSec: 12,
    })
  })

  it('omits poster/durationSec/sample rather than writing empty values into the snapshot', () => {
    const built = buildMediaItem({ id: 'm1', captured: captured(), filename: 'x', caption: '' })
    expect('poster' in built).toBe(false)
    expect('durationSec' in built).toBe(false)
    expect('sample' in built).toBe(false)
  })

  it('carries the sample flag through so every surface can label it', () => {
    const built = buildMediaItem({
      id: 'm1',
      captured: captured({ sample: true, url: '/demo-media/sample-photo.jpg' }),
      filename: 'x',
      caption: '',
    })
    expect(built.sample).toBe(true)
    expect(built.url).toBe('/demo-media/sample-photo.jpg')
  })
})

describe('isDurableMediaUrl', () => {
  it('rejects object URLs — they die with the document that minted them', () => {
    expect(isDurableMediaUrl('blob:http://localhost/abc')).toBe(false)
  })

  it('accepts bundled sample asset paths', () => {
    expect(isDurableMediaUrl('/demo-media/sample-photo.jpg')).toBe(true)
  })

  it('rejects the empty string — an absent URL is not a durable one', () => {
    expect(isDurableMediaUrl('')).toBe(false)
  })
})

describe('the refresh contract', () => {
  it('strips a blob url and poster, keeping every other key', () => {
    const stripped = withoutEphemeralMediaUrls(
      item({ poster: 'blob:p', caption: 'DVR rack', durationSec: 4, sample: true }),
    )
    expect(stripped).toEqual({
      id: 'm1',
      kind: 'photo',
      filename: 'rack.jpg',
      caption: 'DVR rack',
      capturedAt: '2026-07-30 14:05:06',
      durationSec: 4,
      sample: true,
    })
    expect('url' in stripped).toBe(false)
    expect('poster' in stripped).toBe(false)
  })

  it('keeps a bundled sample URL — it is as valid after a refresh as before it', () => {
    const sample = item({ url: '/demo-media/sample-photo.jpg', sample: true })
    expect(withoutEphemeralMediaUrls(sample)).toBe(sample)
  })

  it('strips a blob poster while keeping a durable url', () => {
    const mixed = item({ url: '/demo-media/sample-clip.mp4', poster: 'blob:p' })
    const stripped = withoutEphemeralMediaUrls(mixed)
    expect(stripped.url).toBe('/demo-media/sample-clip.mp4')
    expect(stripped.poster).toBeUndefined()
  })

  it('is identity-preserving when there is nothing to strip', () => {
    const already = item({ url: undefined })
    expect(withoutEphemeralMediaUrls(already)).toBe(already)
  })

  it('reports a stripped item as unavailable, and a live/sample one as available', () => {
    expect(isMediaAvailable(withoutEphemeralMediaUrls(item()))).toBe(false)
    expect(isMediaAvailable(item())).toBe(true)
    expect(isMediaAvailable(item({ url: '/demo-media/sample-photo.jpg' }))).toBe(true)
    expect(isMediaAvailable(item({ url: '' }))).toBe(false)
  })

  it('explains the mechanism rather than reading as a bug', () => {
    expect(MEDIA_EXPIRED_NOTICE).toMatch(/did not survive the refresh/)
    expect(MEDIA_EXPIRED_NOTICE).toMatch(/never writes captured media to storage/)
  })
})

describe('withoutEphemeralMedia (the location-graph sweep)', () => {
  const location = (media: DemoLocation['form']['media']): DemoLocation =>
    ({ id: 'l1', caseId: 'c1', form: { media } }) as unknown as DemoLocation

  it('strips across all three buckets', () => {
    const swept = withoutEphemeralMedia([
      location({
        photos: [item({ id: 'p1' })],
        videos: [item({ id: 'v1', kind: 'video', url: 'blob:v', poster: 'blob:vp' })],
        audios: [item({ id: 'a1', kind: 'audio', url: 'blob:a' })],
      }),
    ])
    const media = swept[0].form.media
    expect(media.photos[0].url).toBeUndefined()
    expect(media.videos[0].url).toBeUndefined()
    expect(media.videos[0].poster).toBeUndefined()
    expect(media.audios[0].url).toBeUndefined()
  })

  it('preserves identity all the way down when nothing needs stripping', () => {
    // The debounced save runs on every store change; churning references the store's
    // reconciliation discipline relies on would be a real cost for no gain.
    const locations = [
      location({ photos: [item({ url: '/demo-media/sample-photo.jpg' })], videos: [], audios: [] }),
    ]
    const swept = withoutEphemeralMedia(locations)
    expect(swept).toBe(locations)
    expect(swept[0]).toBe(locations[0])
  })

  it('leaves untouched locations by identity while replacing the one that changed', () => {
    const clean = location({ photos: [], videos: [], audios: [] })
    const dirty = location({ photos: [item()], videos: [], audios: [] })
    const swept = withoutEphemeralMedia([clean, dirty])
    expect(swept[0]).toBe(clean)
    expect(swept[1]).not.toBe(dirty)
  })

  it('handles an empty location list', () => {
    const empty: DemoLocation[] = []
    expect(withoutEphemeralMedia(empty)).toBe(empty)
  })
})

describe('collectMediaUrls (the delete cascade’s input — R-2)', () => {
  const location = (media: DemoLocation['form']['media']): DemoLocation =>
    ({ id: 'l1', caseId: 'c1', form: { media } }) as unknown as DemoLocation

  it('reaches every bucket and both URL slots', () => {
    // A bucket left out of this sweep is a whole photo or clip pinned for the tab's life,
    // with nothing left in the page holding a reference to it.
    expect(
      collectMediaUrls([
        location({
          photos: [item({ id: 'p', url: 'blob:p' })],
          videos: [item({ id: 'v', kind: 'video', url: 'blob:v', poster: 'blob:vp' })],
          audios: [item({ id: 'a', kind: 'audio', url: 'blob:a' })],
        }),
      ]),
    ).toEqual(['blob:p', undefined, 'blob:v', 'blob:vp', 'blob:a', undefined])
  })

  it('spans every location handed to it', () => {
    const one = location({ photos: [item({ url: 'blob:1' })], videos: [], audios: [] })
    const two = location({ photos: [item({ url: 'blob:2' })], videos: [], audios: [] })
    expect(collectMediaUrls([one, two])).toEqual(['blob:1', undefined, 'blob:2', undefined])
  })

  it('passes sample paths through unfiltered — revokeCapturedUrls is what no-ops on them', () => {
    expect(
      collectMediaUrls([
        location({ photos: [item({ url: '/demo-media/sample-photo.jpg' })], videos: [], audios: [] }),
      ]),
    ).toEqual(['/demo-media/sample-photo.jpg', undefined])
  })

  it('returns nothing for empty inputs', () => {
    expect(collectMediaUrls([])).toEqual([])
    expect(collectMediaUrls([location({ photos: [], videos: [], audios: [] })])).toEqual([])
  })
})
