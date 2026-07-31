import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

import { MediaLibrarySheet, type MediaLibrarySheetProps } from '@/features/demo/ui/screens/MediaLibrarySheet'
import type { MediaBuckets } from '@/features/demo/engine/logic/media'
import type { MediaItem } from '@/features/demo/engine/types'

/**
 * P4.5 — the media library sheet (matrix rows 57–66; phone `MediaLibrarySheet`, ui-mapping 09).
 *
 * Presentational suite: the tabs, the lists, the empty state and the selection behaviour that
 * the phone spends three effects and an armed ref on. The store writes deletion causes are
 * pinned through the bridge in `ui/__tests__/DemoExperience.media-library.test.tsx`.
 */

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

function props(over: Partial<MediaLibrarySheetProps> = {}): MediaLibrarySheetProps {
  return { media: buckets(), onClose: vi.fn(), ...over }
}

/** A location with one item in each bucket — enough to prove per-tab routing. */
function oneOfEach(): MediaBuckets {
  return buckets({
    photos: [item({ id: 'p1', filename: 'front-door.jpg' })],
    videos: [item({ id: 'v1', kind: 'video', filename: 'lobby.mp4', durationSec: 95 })],
    audios: [item({ id: 'a1', kind: 'audio', filename: 'note.m4a', durationSec: 42 })],
  })
}

const tab = (name: string) => screen.getByRole('tab', { name })

describe('the sheet header (P4.2’s title, kept)', () => {
  it('is the phone’s "Media Library" with the item total under it', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)

    expect(screen.getByRole('dialog', { name: 'Media Library' })).toBeInTheDocument()
    expect(screen.getByTestId('modal-subtitle')).toHaveTextContent('3 items')
  })

  it('closes through onClose — the only exit, per D-B6', () => {
    const onClose = vi.fn()
    render(<MediaLibrarySheet {...props({ onClose })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('the tabs (row 58)', () => {
  it('are Photos / Video / Audio, each naming its own count', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual([
      'Photos tab, 1 items',
      'Video tab, 1 items',
      'Audio tab, 1 items',
    ])
  })

  it('opens on Photos', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)

    expect(tab('Photos tab, 1 items')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Video tab, 1 items')).toHaveAttribute('aria-selected', 'false')
  })

  it('badges a populated tab and leaves an empty one unbadged', () => {
    render(
      <MediaLibrarySheet
        {...props({ media: buckets({ photos: [item({ id: 'p1' }), item({ id: 'p2' })] }) })}
      />,
    )

    expect(within(tab('Photos tab, 2 items')).getByText('2')).toBeInTheDocument()
    // The empty tabs carry their label and nothing else — no `0` pill.
    expect(within(tab('Video tab, 0 items')).queryByText('0')).not.toBeInTheDocument()
  })

  it('switching a tab swaps the list to that bucket', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)

    expect(screen.getByRole('button', { name: 'Photo: front-door.jpg' })).toBeInTheDocument()

    fireEvent.click(tab('Audio tab, 1 items'))

    expect(screen.queryByRole('button', { name: 'Photo: front-door.jpg' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Audio: note.m4a, 00:42' })).toBeInTheDocument()
  })
})

describe('the empty state (row 62)', () => {
  it('shows the active tab’s own message and hint', () => {
    render(<MediaLibrarySheet {...props()} />)

    expect(screen.getByText('No photos')).toBeInTheDocument()
    expect(screen.getByText('Use Capture Media to take photos')).toBeInTheDocument()

    fireEvent.click(tab('Audio tab, 0 items'))

    expect(screen.getByText('No audio')).toBeInTheDocument()
    expect(screen.getByText('Use Record Audio to capture audio')).toBeInTheDocument()
  })

  it('is per-tab: a populated library still shows it on the tab that is empty', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }) })} />)

    expect(screen.queryByTestId('empty-media-state')).not.toBeInTheDocument()

    fireEvent.click(tab('Video tab, 0 items'))

    expect(screen.getByTestId('empty-media-state')).toBeInTheDocument()
    expect(screen.getByText('No videos')).toBeInTheDocument()
  })
})

describe('the list rows (rows 59–61)', () => {
  it('names each row by kind, filename and — for the timed kinds — duration', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)
    expect(screen.getByRole('button', { name: 'Photo: front-door.jpg' })).toBeInTheDocument()

    fireEvent.click(tab('Video tab, 1 items'))
    expect(screen.getByRole('button', { name: 'Video: lobby.mp4, 01:35' })).toBeInTheDocument()
  })

  it('falls back to the phone’s placeholder for an unmeasured duration', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ audios: [item({ id: 'a1', kind: 'audio', filename: 'note.m4a' })] }) })} />)

    fireEvent.click(tab('Audio tab, 1 items'))
    expect(screen.getByRole('button', { name: 'Audio: note.m4a, --:--' })).toBeInTheDocument()
  })

  it('shows the capture date, and a caption only when there is one', () => {
    render(
      <MediaLibrarySheet
        {...props({
          media: buckets({
            photos: [
              item({ id: 'p1', filename: 'a.jpg', caption: 'Rear door, north wall' }),
              item({ id: 'p2', filename: 'b.jpg', caption: '' }),
            ],
          }),
        })}
      />,
    )

    expect(screen.getAllByText('Jul 16, 2026')).toHaveLength(2)
    expect(screen.getByText('Rear door, north wall')).toBeInTheDocument()
  })

  it('orders newest first', () => {
    render(
      <MediaLibrarySheet
        {...props({
          media: buckets({
            photos: [
              item({ id: 'p1', filename: 'older.jpg', capturedAt: '2026-07-14 09:00:00' }),
              item({ id: 'p2', filename: 'newer.jpg', capturedAt: '2026-07-16 09:00:00' }),
            ],
          }),
        })}
      />,
    )

    const names = screen.getAllByRole('button', { name: /^Photo: / }).map((b) => b.getAttribute('aria-label'))
    expect(names).toEqual(['Photo: newer.jpg', 'Photo: older.jpg'])
  })
})

describe('selection (row 58 — auto-select-first)', () => {
  it('marks the newest item of the opening tab as current, with no effects to wait for', () => {
    render(
      <MediaLibrarySheet
        {...props({
          media: buckets({
            photos: [
              item({ id: 'p1', filename: 'older.jpg', capturedAt: '2026-07-14 09:00:00' }),
              item({ id: 'p2', filename: 'newer.jpg', capturedAt: '2026-07-16 09:00:00' }),
            ],
          }),
        })}
      />,
    )

    expect(screen.getByRole('button', { name: 'Photo: newer.jpg' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Photo: older.jpg' })).not.toHaveAttribute('aria-current')
  })

  it('re-arms on every tab switch — the new tab’s first item becomes current', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)

    fireEvent.click(tab('Video tab, 1 items'))

    expect(screen.getByRole('button', { name: 'Video: lobby.mp4, 01:35' })).toHaveAttribute('aria-current', 'true')
  })

  it('follows a tap onto another row', () => {
    render(
      <MediaLibrarySheet
        {...props({
          media: buckets({
            photos: [
              item({ id: 'p1', filename: 'older.jpg', capturedAt: '2026-07-14 09:00:00' }),
              item({ id: 'p2', filename: 'newer.jpg', capturedAt: '2026-07-16 09:00:00' }),
            ],
          }),
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Photo: older.jpg' }))

    expect(screen.getByRole('button', { name: 'Photo: older.jpg' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Photo: newer.jpg' })).not.toHaveAttribute('aria-current')
  })

  it('selects nothing on an empty tab', () => {
    render(<MediaLibrarySheet {...props()} />)
    expect(screen.queryByRole('button', { name: /^Photo: / })).not.toBeInTheDocument()
  })
})
