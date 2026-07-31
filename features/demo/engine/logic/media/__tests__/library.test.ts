import { describe, it, expect } from 'vitest'

import {
  DEFAULT_MEDIA_TAB,
  DELETE_MEDIA_TITLE,
  MAX_MEDIA_BADGE_COUNT,
  MEDIA_DELETED_NOTICE,
  MEDIA_LIBRARY_TABS,
  UNKNOWN_DURATION_LABEL,
  deleteMediaMessage,
  formatCapturedDate,
  mediaDurationLabel,
  mediaForTab,
  mediaLibraryCounts,
  mediaLibrarySubtitle,
  mediaLibraryTab,
  mediaTabBadge,
  type MediaBuckets,
} from '@/features/demo/engine/logic/media/library'
import type { MediaItem } from '@/features/demo/engine/types'

function item(over: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 'm1',
    kind: 'photo',
    url: 'blob:one',
    filename: 'front-door.jpg',
    caption: '',
    capturedAt: '2026-07-16 14:05:06',
    ...over,
  }
}

function buckets(over: Partial<MediaBuckets> = {}): MediaBuckets {
  return { photos: [], videos: [], audios: [], ...over }
}

describe('the tab registry', () => {
  it('is Photos → Video → Audio, in array order, one per media kind', () => {
    expect(MEDIA_LIBRARY_TABS.map((t) => t.id)).toEqual(['photos', 'video', 'audio'])
    expect(MEDIA_LIBRARY_TABS.map((t) => t.label)).toEqual(['Photos', 'Video', 'Audio'])
    expect(MEDIA_LIBRARY_TABS.map((t) => t.kind)).toEqual(['photo', 'video', 'audio'])
    expect(MEDIA_LIBRARY_TABS.map((t) => t.bucket)).toEqual(['photos', 'videos', 'audios'])
  })

  it('carries the phone’s empty-state copy verbatim, message and hint', () => {
    expect(mediaLibraryTab('photos').empty).toEqual({
      message: 'No photos',
      hint: 'Use Capture Media to take photos',
    })
    expect(mediaLibraryTab('video').empty).toEqual({
      message: 'No videos',
      hint: 'Use Capture Media to record video',
    })
    expect(mediaLibraryTab('audio').empty).toEqual({
      message: 'No audio',
      hint: 'Use Record Audio to capture audio',
    })
  })

  it('opens on Photos, even when Photos is the empty tab (phone initialTab default)', () => {
    expect(DEFAULT_MEDIA_TAB).toBe('photos')
  })
})

describe('counts', () => {
  it('counts each bucket and totals the three', () => {
    const media = buckets({
      photos: [item({ id: 'p1' }), item({ id: 'p2' })],
      videos: [item({ id: 'v1', kind: 'video' })],
      audios: [],
    })
    expect(mediaLibraryCounts(media)).toEqual({ photos: 2, video: 1, audio: 0, total: 3 })
  })

  it('is all zeroes for a location that has captured nothing', () => {
    expect(mediaLibraryCounts(buckets())).toEqual({ photos: 0, video: 0, audio: 0, total: 0 })
  })
})

describe('the tab badge', () => {
  it('renders nothing at zero — a badge showing 0 is not the phone’s empty tab', () => {
    expect(mediaTabBadge(0)).toBeNull()
  })

  it('counts up to the cap and then says 99+', () => {
    expect(mediaTabBadge(1)).toBe('1')
    expect(mediaTabBadge(MAX_MEDIA_BADGE_COUNT)).toBe('99')
    expect(mediaTabBadge(MAX_MEDIA_BADGE_COUNT + 1)).toBe('99+')
    expect(mediaTabBadge(4210)).toBe('99+')
  })
})

describe('the header subtitle', () => {
  it('is the phone’s template at every value, including one', () => {
    expect(mediaLibrarySubtitle(0)).toBe('0 items')
    // Phone verbatim (`${counts.total} items`) — deliberately not singularized (§63f).
    expect(mediaLibrarySubtitle(1)).toBe('1 items')
    expect(mediaLibrarySubtitle(12)).toBe('12 items')
  })
})

describe('mediaForTab', () => {
  it('reads the tab’s own bucket', () => {
    const media = buckets({
      photos: [item({ id: 'p1' })],
      videos: [item({ id: 'v1', kind: 'video' })],
      audios: [item({ id: 'a1', kind: 'audio' })],
    })
    expect(mediaForTab(media, 'photos').map((m) => m.id)).toEqual(['p1'])
    expect(mediaForTab(media, 'video').map((m) => m.id)).toEqual(['v1'])
    expect(mediaForTab(media, 'audio').map((m) => m.id)).toEqual(['a1'])
  })

  it('orders newest first — the store appends, the library reads down', () => {
    const media = buckets({
      photos: [
        item({ id: 'oldest', capturedAt: '2026-07-14 09:00:00' }),
        item({ id: 'newest', capturedAt: '2026-07-16 18:30:00' }),
        item({ id: 'middle', capturedAt: '2026-07-15 12:00:00' }),
      ],
    })
    expect(mediaForTab(media, 'photos').map((m) => m.id)).toEqual(['newest', 'middle', 'oldest'])
  })

  it('breaks a same-second tie toward the later-added item', () => {
    const media = buckets({
      photos: [
        item({ id: 'first', capturedAt: '2026-07-16 14:05:06' }),
        item({ id: 'second', capturedAt: '2026-07-16 14:05:06' }),
      ],
    })
    expect(mediaForTab(media, 'photos').map((m) => m.id)).toEqual(['second', 'first'])
  })

  it('does not mutate or alias the stored bucket', () => {
    const photos = [item({ id: 'a', capturedAt: '2026-07-14 09:00:00' }), item({ id: 'b', capturedAt: '2026-07-16 09:00:00' })]
    const media = buckets({ photos })
    const out = mediaForTab(media, 'photos')
    expect(out).not.toBe(photos)
    expect(photos.map((m) => m.id)).toEqual(['a', 'b'])
  })
})

describe('formatCapturedDate', () => {
  it('reads the demo’s wall-clock string without constructing a Date', () => {
    expect(formatCapturedDate('2026-07-16 14:05:06')).toBe('Jul 16, 2026')
    // No leading zero on the day — the phone's `day: 'numeric'`.
    expect(formatCapturedDate('2026-01-02 00:00:00')).toBe('Jan 2, 2026')
    expect(formatCapturedDate('2026-12-31 23:59:59')).toBe('Dec 31, 2026')
  })

  it('accepts a date with no time part', () => {
    expect(formatCapturedDate('2026-03-09')).toBe('Mar 9, 2026')
  })

  it('returns empty for anything it cannot read, rather than inventing a date', () => {
    expect(formatCapturedDate('')).toBe('')
    expect(formatCapturedDate('not a date')).toBe('')
    expect(formatCapturedDate('16-07-2026')).toBe('')
    expect(formatCapturedDate('2026-13-01 00:00:00')).toBe('')
    expect(formatCapturedDate('2026-00-01 00:00:00')).toBe('')
    expect(formatCapturedDate('2026-07-00 00:00:00')).toBe('')
    expect(formatCapturedDate('2026-07-32 00:00:00')).toBe('')
  })
})

describe('mediaDurationLabel', () => {
  it('formats video and audio durations', () => {
    expect(mediaDurationLabel(item({ kind: 'video', durationSec: 95 }))).toBe('01:35')
    expect(mediaDurationLabel(item({ kind: 'audio', durationSec: 3725 }))).toBe('01:02:05')
  })

  it('is null for a photo — nothing timed it', () => {
    expect(mediaDurationLabel(item({ kind: 'photo', durationSec: 12 }))).toBeNull()
  })

  it('is null when the duration was never measured (the sample assets)', () => {
    expect(mediaDurationLabel(item({ kind: 'video' }))).toBeNull()
    expect(mediaDurationLabel(item({ kind: 'audio', durationSec: Number.POSITIVE_INFINITY }))).toBeNull()
  })

  it('offers the phone’s row placeholder for the unmeasured case', () => {
    expect(UNKNOWN_DURATION_LABEL).toBe('--:--')
  })
})

describe('delete copy', () => {
  it('is the phone’s Alert, verbatim, with the filename quoted', () => {
    expect(DELETE_MEDIA_TITLE).toBe('Delete Media')
    expect(deleteMediaMessage('front-door.jpg')).toBe(
      'Are you sure you want to delete "front-door.jpg"? This action cannot be undone.',
    )
    expect(MEDIA_DELETED_NOTICE).toBe('Media deleted')
  })
})
