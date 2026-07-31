import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildMediaItem, isDurableMediaUrl, withoutEphemeralMediaUrls } from '@/features/demo/engine/logic/media/captured'
import {
  SAMPLE_MEDIA,
  SAMPLE_MEDIA_BASE,
  SAMPLE_MEDIA_NOTICE,
  facilityForKind,
  toSampleCapture,
} from '@/features/demo/engine/logic/media/samples'
import { CAPTURE_FACILITIES } from '@/features/demo/engine/logic/media/permissions'
import { MEDIA_KINDS } from '@/features/demo/engine/types'

const publicDir = join(process.cwd(), 'public')

describe('SAMPLE_MEDIA registry', () => {
  it('covers every media kind', () => {
    for (const kind of MEDIA_KINDS) {
      expect(SAMPLE_MEDIA[kind].kind).toBe(kind)
    }
  })

  it('every referenced asset actually exists in public/ and is non-empty', () => {
    // The sample path is the fallback of last resort — a 404 here would turn "no camera
    // available" into a broken image, which is the failure mode this whole layer prevents.
    for (const kind of MEDIA_KINDS) {
      const asset = SAMPLE_MEDIA[kind]
      for (const url of [asset.url, asset.poster].filter((u): u is string => u !== undefined)) {
        expect(url.startsWith(`${SAMPLE_MEDIA_BASE}/`)).toBe(true)
        const path = join(publicDir, url)
        expect(existsSync(path), `${url} is missing from public/`).toBe(true)
        expect(statSync(path).size).toBeGreaterThan(0)
      }
    }
  })

  it('keeps the bundled assets small — they are a fallback, not a payload', () => {
    for (const kind of MEDIA_KINDS) {
      const asset = SAMPLE_MEDIA[kind]
      for (const url of [asset.url, asset.poster].filter((u): u is string => u !== undefined)) {
        expect(statSync(join(publicDir, url)).size).toBeLessThan(256 * 1024)
      }
    }
  })

  it('declares a mime type matching the committed file extension', () => {
    expect(SAMPLE_MEDIA.photo.url.endsWith('.jpg')).toBe(true)
    expect(SAMPLE_MEDIA.photo.mimeType).toBe('image/jpeg')
    expect(SAMPLE_MEDIA.video.url.endsWith('.mp4')).toBe(true)
    expect(SAMPLE_MEDIA.video.mimeType).toBe('video/mp4')
    expect(SAMPLE_MEDIA.audio.url.endsWith('.m4a')).toBe(true)
    expect(SAMPLE_MEDIA.audio.mimeType).toBe('audio/mp4')
  })

  it('gives the video a poster and the still kinds none', () => {
    expect(SAMPLE_MEDIA.video.poster).toBeDefined()
    expect(SAMPLE_MEDIA.photo.poster).toBeUndefined()
    expect(SAMPLE_MEDIA.audio.poster).toBeUndefined()
  })

  it('is frozen — the registry is read, never patched', () => {
    expect(Object.isFrozen(SAMPLE_MEDIA)).toBe(true)
    expect(Object.isFrozen(SAMPLE_MEDIA.photo)).toBe(true)
  })
})

describe('toSampleCapture', () => {
  it('marks every sample capture as a sample', () => {
    for (const kind of MEDIA_KINDS) {
      expect(toSampleCapture(kind, '2026-07-30 14:05:06').sample).toBe(true)
    }
  })

  it('produces a live-capture-shaped object so review screens need one code path', () => {
    expect(toSampleCapture('video', '2026-07-30 14:05:06')).toEqual({
      kind: 'video',
      url: '/demo-media/sample-clip.mp4',
      poster: '/demo-media/sample-clip-poster.jpg',
      mimeType: 'video/mp4',
      durationSec: 4,
      capturedAt: '2026-07-30 14:05:06',
      sample: true,
    })
  })

  it('reports no sizeBytes — nothing measured the file, so nothing claims a size', () => {
    for (const kind of MEDIA_KINDS) {
      expect(toSampleCapture(kind, '2026-07-30 14:05:06').sizeBytes).toBeUndefined()
    }
  })

  it('takes the capture time from its caller, never from an ambient clock', () => {
    expect(toSampleCapture('photo', '1999-12-31 23:59:59').capturedAt).toBe('1999-12-31 23:59:59')
  })

  it('carries sample:true onto the stored MediaItem', () => {
    const built = buildMediaItem({
      id: 'm1',
      captured: toSampleCapture('audio', '2026-07-30 14:05:06'),
      filename: 'note',
      caption: '',
    })
    expect(built).toMatchObject({ sample: true, filename: 'note.m4a', durationSec: 4 })
  })
})

describe('sample URLs are durable', () => {
  it('survives the snapshot strip, unlike a live capture', () => {
    // A sample is served from public/ — it resolves after a refresh, so there is no honest
    // reason to blank it. This is what makes the expired notice mean something specific.
    for (const kind of MEDIA_KINDS) {
      const asset = SAMPLE_MEDIA[kind]
      expect(isDurableMediaUrl(asset.url)).toBe(true)
      const item = buildMediaItem({
        id: 'm1',
        captured: toSampleCapture(kind, '2026-07-30 14:05:06'),
        filename: 'x',
        caption: '',
      })
      expect(withoutEphemeralMediaUrls(item)).toBe(item)
    }
  })
})

describe('SAMPLE_MEDIA_NOTICE', () => {
  it('covers every facility and states that nothing was recorded', () => {
    for (const facility of CAPTURE_FACILITIES) {
      const notice = SAMPLE_MEDIA_NOTICE[facility]
      expect(notice).toMatch(/bundled sample/)
      expect(notice).toMatch(/Nothing was recorded/)
    }
  })

  it('is frozen', () => {
    expect(Object.isFrozen(SAMPLE_MEDIA_NOTICE)).toBe(true)
  })
})

describe('facilityForKind', () => {
  it('routes photo and video to the camera, audio to the microphone', () => {
    expect(facilityForKind('photo')).toBe('camera')
    expect(facilityForKind('video')).toBe('camera')
    expect(facilityForKind('audio')).toBe('microphone')
  })
})
