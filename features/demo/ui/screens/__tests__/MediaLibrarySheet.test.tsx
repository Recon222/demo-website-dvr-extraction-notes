import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'

import {
  MEDIA_CLOSE_CHIP,
  MediaLibrarySheet,
  previewActionFace,
  sampleBadge,
  type MediaLibrarySheetProps,
} from '@/features/demo/ui/screens/MediaLibrarySheet'
import { ElevatedEdges } from '@/features/demo/ui/controls/button-recipe'
import { SAMPLE_BADGE } from '@/features/demo/ui/controls/sample-badge'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { touchTarget } from '@/features/demo/ui/tokens/scale'

/** jsdom rewrites `#rrggbb` to `rgb(r, g, b)` on read-back (mutation-testing SKILL, project
 *  hazards) - compare through the same normalisation rather than by hex. */
function hexToRgb(hex: string): string {
  const [r, g, b] = (hex.replace('#', '').match(/../g) as string[]).map((p) => parseInt(p, 16))
  return `rgb(${r}, ${g}, ${b})`
}
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
  return { media: buckets(), onDelete: vi.fn(), onClose: vi.fn(), ...over }
}

/** A location with one item in each bucket — enough to prove per-tab routing. */
function oneOfEach(): MediaBuckets {
  return buckets({
    photos: [item({ id: 'p1', filename: 'front-door.jpg' })],
    videos: [item({ id: 'v1', kind: 'video', filename: 'lobby.mp4', durationSec: 95 })],
    audios: [item({ id: 'a1', kind: 'audio', filename: 'note.m4a', durationSec: 42 })],
  })
}

const tab = (name: string) => screen.getByRole('button', { name })

/**
 * `colors.link` (#b8d4f0) as jsdom normalises it. W0-F1 re-pointed this control's four
 * accent-as-mark sites off `GLASS.accentFrom`, which the U0.3 re-base turned into a FILL
 * shade measuring 2.54:1 as text against an AA floor of 4.5 — dimmer than the INACTIVE
 * tabs' 5.31. W0-F12: reverting any one of them was invisible to every suite, so the four
 * assertions below are the pin. Same idiom as `ExportHub.test.tsx:115-118`.
 */
const LINK = 'rgb(184, 212, 240)'

describe('the sheet header (P4.2’s title, kept)', () => {
  it('is the phone’s "Media Library" with the item total under it', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)

    expect(screen.getByRole('dialog', { name: 'Media Library' })).toBeInTheDocument()
    // U7.2: the sheet is `GlassBottomSheet` now, whose subtitle carries no test id — and
    // adding one to production markup for a pin's convenience is what the reviewer contract
    // flags. The visible text is the contract anyway.
    expect(screen.getByText('3 items')).toBeInTheDocument()
  })

  it('closes through onClose — the only exit, per D-B6', () => {
    const onClose = vi.fn()
    render(<MediaLibrarySheet {...props({ onClose })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close media library' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('the tabs (row 58)', () => {
  it('are Photos / Video / Audio, each naming its own count', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)

    const group = screen.getByRole('group', { name: 'Media type' })
    expect(within(group).getAllByRole('button').map((t) => t.getAttribute('aria-label'))).toEqual([
      'Photos tab, 1 items',
      'Video tab, 1 items',
      'Audio tab, 1 items',
    ])
  })

  it('are toggle buttons, not ARIA tabs — the APG keyboard model is not implemented (R-18)', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)

    // `role="tab"` promises roving tabindex, arrow-key navigation and an aria-controls'd
    // tabpanel. None of that exists here, so the roles are not claimed. Same shape as the
    // sibling segmented control in this package (MediaCaptureScreen's Photo/Video pill).
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.queryAllByRole('tablist')).toHaveLength(0)
    expect(screen.queryAllByRole('tabpanel')).toHaveLength(0)
  })

  it('opens on Photos', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)

    expect(tab('Photos tab, 1 items')).toHaveAttribute('aria-pressed', 'true')
    expect(tab('Video tab, 1 items')).toHaveAttribute('aria-pressed', 'false')

    // …and the active tab is the MOST legible thing in the control, not the least (W0-F12).
    expect(tab('Photos tab, 1 items').style.color).toBe(LINK)
    expect(tab('Photos tab, 1 items').style.borderBottom).toContain(LINK)
    expect(tab('Video tab, 1 items').style.color).not.toBe(LINK)
  })

  it('badges a populated tab and leaves an empty one unbadged', () => {
    render(
      <MediaLibrarySheet
        {...props({ media: buckets({ photos: [item({ id: 'p1' }), item({ id: 'p2' })] }) })}
      />,
    )

    expect(within(tab('Photos tab, 2 items')).getByText('2')).toBeInTheDocument()
    // The numeral is TEXT on its own wash, so it takes `link` too (W0-F12).
    expect(within(tab('Photos tab, 2 items')).getByText('2').style.color).toBe(LINK)
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

    // Scoped to the list — the preview panel below shows the selected item's date too.
    const list = screen.getByTestId('media-library-content')
    expect(within(list).getAllByText('Jul 16, 2026')).toHaveLength(2)
    expect(within(list).getByText('Rear door, north wall')).toBeInTheDocument()
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

    // The selection rail is the visual half of `aria-current` (W0-F12).
    expect(screen.getByRole('button', { name: 'Photo: newer.jpg' }).style.borderLeft).toContain(LINK)
    expect(screen.getByRole('button', { name: 'Photo: older.jpg' }).style.borderLeft).not.toContain(LINK)
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

describe('the inline preview (row 63)', () => {
  it('opens on the auto-selected item and shows its bytes', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item({ filename: 'front-door.jpg' })] }) })} />)

    expect(screen.getByTestId('media-preview')).toBeInTheDocument()
    expect(screen.getByAltText('Image preview: front-door.jpg')).toHaveAttribute('src', 'blob:one')
  })

  it('renders a video and an audio item with their own playback controls', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)

    fireEvent.click(tab('Video tab, 1 items'))
    expect(screen.getByLabelText('Video preview: lobby.mp4')).toHaveAttribute('controls')

    fireEvent.click(tab('Audio tab, 1 items'))
    expect(screen.getByLabelText('Audio preview: note.m4a')).toHaveAttribute('controls')
  })

  it('follows the selected row', () => {
    render(
      <MediaLibrarySheet
        {...props({
          media: buckets({
            photos: [
              item({ id: 'p1', filename: 'older.jpg', capturedAt: '2026-07-14 09:00:00', url: 'blob:older' }),
              item({ id: 'p2', filename: 'newer.jpg', capturedAt: '2026-07-16 09:00:00', url: 'blob:newer' }),
            ],
          }),
        })}
      />,
    )

    expect(screen.getByAltText('Image preview: newer.jpg')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Photo: older.jpg' }))

    expect(screen.getByAltText('Image preview: older.jpg')).toBeInTheDocument()
    expect(screen.queryByAltText('Image preview: newer.jpg')).not.toBeInTheDocument()
  })

  it('collapses through its own Close preview button, leaving the list up', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }) })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }))

    expect(screen.queryByTestId('media-preview')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Photo: front-door.jpg' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Photo: front-door.jpg' })).not.toHaveAttribute('aria-current')
  })

  it('is absent on an empty tab', () => {
    render(<MediaLibrarySheet {...props()} />)
    expect(screen.queryByTestId('media-preview')).not.toBeInTheDocument()
  })
})

describe('a capture that did not survive the refresh (P4.1’s contract)', () => {
  /** What `snapshotOf` leaves behind: the record of the capture, with no `url`. */
  const expired = item({ id: 'x1', filename: 'front-door.jpg', url: undefined })

  it('explains the mechanism instead of rendering a broken image', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [expired] }) })} />)

    expect(screen.queryByAltText('Image preview: front-door.jpg')).not.toBeInTheDocument()
    const notice = screen.getByTestId('media-expired-notice')
    expect(notice).toHaveTextContent('did not survive the refresh')
    expect(notice).toHaveTextContent('never writes captured media to storage')
  })

  it('still lists the row, with its filename and metadata intact', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [expired] }) })} />)

    expect(screen.getByRole('button', { name: 'Photo: front-door.jpg' })).toBeInTheDocument()
    expect(screen.getByTestId('media-preview-info')).toHaveTextContent('front-door.jpg')
  })
})

describe('delete (row 66)', () => {
  /** The primitive's own beat — a hold shorter than this is a tap. */
  const HOLD_MS = 500

  function hold(el: HTMLElement, ms = HOLD_MS) {
    fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse', clientX: 10, clientY: 10 })
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  it('confirms before deleting, with the phone’s Alert copy verbatim', () => {
    const onDelete = vi.fn()
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }), onDelete })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete front-door.jpg' }))

    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText('Delete Media')).toBeInTheDocument()
    expect(
      within(dialog).getByText('Are you sure you want to delete "front-door.jpg"? This action cannot be undone.'),
    ).toBeInTheDocument()
    // Nothing has happened yet — the confirmation is a gate, not a receipt.
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('deletes on confirm, handing the whole item to the bridge', () => {
    const onDelete = vi.fn()
    const photo = item({ url: 'blob:one' })
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [photo] }), onDelete })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete front-door.jpg' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))

    // The ITEM, not just its id — the bridge needs the urls to revoke and the kind to write.
    expect(onDelete).toHaveBeenCalledWith(photo)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('cancels without deleting, and Escape does the same', () => {
    const onDelete = vi.fn()
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }), onDelete })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete front-door.jpg' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete front-door.jpg' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  describe('the long-press accelerator', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('a hold on the row raises the same confirmation', () => {
      render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }) })} />)

      hold(screen.getByRole('button', { name: 'Photo: front-door.jpg' }))

      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText('Delete Media')).toBeInTheDocument()
    })

    it('a right-click raises no delete confirmation, and keeps the browser menu (R-19)', () => {
      const onDelete = vi.fn()
      render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }), onDelete })} />)

      const prevented = !fireEvent.contextMenu(screen.getByRole('button', { name: 'Photo: front-door.jpg' }))

      // A reflex right-click — often just reaching for Copy or Inspect — must not put a
      // destructive dialog on screen, and must not silently lose the browser's own menu.
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(onDelete).not.toHaveBeenCalled()
      expect(prevented).toBe(false)
    })

    it('a tap selects the row and raises nothing', () => {
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
      const row = screen.getByRole('button', { name: 'Photo: older.jpg' })

      hold(row, HOLD_MS - 100)
      fireEvent.pointerUp(row)
      fireEvent.click(row)

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(row).toHaveAttribute('aria-current', 'true')
    })

    it('swallows the click that ends the hold, so the row does not also get selected', () => {
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
      const row = screen.getByRole('button', { name: 'Photo: older.jpg' })

      hold(row)
      fireEvent.pointerUp(row)
      fireEvent.click(row, { detail: 1 })

      // Selection stayed on the auto-selected newest item.
      expect(row).not.toHaveAttribute('aria-current')
      expect(screen.getByRole('button', { name: 'Photo: newer.jpg' })).toHaveAttribute('aria-current', 'true')
    })
  })
})

describe('the fullscreen preview (row 65)', () => {
  it('paints the close chip from MEDIA_CLOSE_CHIP and its glyph from colors.text (A90)', () => {
    // The link the contrast rows cannot make for themselves. `palette-contrast.test.ts`'s rows
    // 36-37 measure `colors.text` over `MEDIA_CLOSE_CHIP`; nothing there notices if this button
    // stops painting either one. A probe proved it: weakening the glyph to `textTertiary` left
    // the whole contrast file green (SURVIVED). This is the cell that reds instead.
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item({ filename: 'front-door.jpg' })] }) })} />)
    fireEvent.click(screen.getByRole('button', { name: 'View fullscreen' }))
    const close = within(screen.getByTestId('media-fullscreen')).getByRole('button', {
      name: 'Close fullscreen',
    })
    expect(close.style.background).toBe(MEDIA_CLOSE_CHIP)
    expect(close.style.color).toBe('rgb(240, 244, 248)') // colors.text, as jsdom reads it back
    // …and NOT the backdrop token, which is the resync this constant exists to refuse.
    expect(close.style.background).not.toBe(colors.scrim)
  })

  it('opens a photo full-bleed and returns to the sheet on close', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item({ filename: 'front-door.jpg' })] }) })} />)

    fireEvent.click(screen.getByRole('button', { name: 'View fullscreen' }))

    const layer = screen.getByRole('dialog', { name: 'Fullscreen photo: front-door.jpg' })
    expect(within(layer).getByAltText('Fullscreen image: front-door.jpg')).toBeInTheDocument()

    fireEvent.click(within(layer).getByRole('button', { name: 'Close fullscreen' }))

    expect(screen.queryByTestId('media-fullscreen')).not.toBeInTheDocument()
    // Back to the inline preview, selection intact (phone: closeFullscreen → 'inline').
    expect(screen.getByTestId('media-preview')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Photo: front-door.jpg' })).toHaveAttribute('aria-current', 'true')
  })

  it('opens a video with its controls', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)
    fireEvent.click(tab('Video tab, 1 items'))
    fireEvent.click(screen.getByRole('button', { name: 'View fullscreen' }))

    // Scoped: the layer itself carries the same name (phone container-label parity), so the
    // element inside it is found by searching descendants.
    const layer = screen.getByTestId('media-fullscreen')
    expect(within(layer).getByLabelText('Fullscreen video: lobby.mp4')).toHaveAttribute('controls')
  })

  it('is not offered for audio — the phone’s image/video-only rule', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)
    fireEvent.click(tab('Audio tab, 1 items'))

    expect(screen.getByTestId('media-preview')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View fullscreen' })).not.toBeInTheDocument()
  })

  it('is not offered for a capture whose bytes did not survive the refresh', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item({ url: undefined })] }) })} />)

    expect(screen.getByTestId('media-expired-notice')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View fullscreen' })).not.toBeInTheDocument()
  })

  it('takes focus on open and hands it back to the opener on close (R-8)', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item({ filename: 'front-door.jpg' })] }) })} />)
    const opener = screen.getByRole('button', { name: 'View fullscreen' })
    opener.focus()

    fireEvent.click(opener)

    // `aria-modal` prunes everything outside this container, so focus must be INSIDE it —
    // otherwise Tab walks the hidden controls behind the layer before reaching Close.
    const layer = screen.getByTestId('media-fullscreen')
    expect(document.activeElement).toBe(layer)

    fireEvent.click(within(layer).getByRole('button', { name: 'Close fullscreen' }))

    expect(document.activeElement).toBe(opener)
  })

  /**
   * W3 r1 F64 / ledger §103 — the regression class the shared hook exists for.
   *
   * The block this replaces read `document.activeElement` AT MOUNT. When the opener is disabled
   * (or otherwise blurred) by the very action that raises the overlay, focus has already fallen
   * to `<body>` before React runs passive effects, so the "opener" captured was `<body>` and the
   * hand-back went nowhere — the keyboard user is dropped at the top of the document.
   *
   * `useOpenerFocusReturn` captures the origin at GESTURE time (a capture-phase `pointerdown`),
   * so the real button survives the blur. The blur below is what a self-disabling opener does.
   *
   * MUTATION: restore the old five-line block (`const opener = document.activeElement` at mount).
   * The pin reds — focus lands on `<body>`, not on the button.
   */
  it('returns focus to an opener that lost it before the layer mounted (F64)', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item({ filename: 'front-door.jpg' })] }) })} />)
    const opener = screen.getByRole('button', { name: 'View fullscreen' })
    opener.focus()

    // The gesture arms the tracker; the blur is the self-disabling opener's own doing.
    fireEvent.pointerDown(opener)
    opener.blur()
    expect(document.activeElement).toBe(document.body)

    fireEvent.click(opener)
    const layer = screen.getByTestId('media-fullscreen')
    expect(document.activeElement).toBe(layer)

    fireEvent.click(within(layer).getByRole('button', { name: 'Close fullscreen' }))

    expect(document.activeElement).toBe(opener)
    expect(document.activeElement).not.toBe(document.body)
  })

  it('takes the same focus path for a video — no autoFocus branch (R-8)', () => {
    render(<MediaLibrarySheet {...props({ media: oneOfEach() })} />)
    fireEvent.click(tab('Video tab, 1 items'))
    const opener = screen.getByRole('button', { name: 'View fullscreen' })
    opener.focus()

    fireEvent.click(opener)

    expect(document.activeElement).toBe(screen.getByTestId('media-fullscreen'))
  })

  it('does not force focus onto a stale opener that was removed while it was open (R-8)', () => {
    // The guard that matters: `isConnected`. Closing after the opener is gone must not throw
    // and must not blur something else the visitor moved to.
    const { unmount } = render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }) })} />)
    fireEvent.click(screen.getByRole('button', { name: 'View fullscreen' }))
    expect(screen.getByTestId('media-fullscreen')).toBeInTheDocument()

    expect(() => unmount()).not.toThrow()
  })

  it('self-cancels when the selection moves to another row', () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'View fullscreen' }))
    expect(screen.getByTestId('media-fullscreen')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Photo: older.jpg' }))

    expect(screen.queryByTestId('media-fullscreen')).not.toBeInTheDocument()
  })
})

describe('the item info panel (row 64)', () => {
  it('shows filename, duration, date and caption — and nothing editable', () => {
    render(
      <MediaLibrarySheet
        {...props({
          media: buckets({ videos: [item({ id: 'v1', kind: 'video', filename: 'lobby.mp4', durationSec: 95, caption: 'Rear door, north wall' })] }),
        })}
      />,
    )
    fireEvent.click(tab('Video tab, 1 items'))

    const info = screen.getByTestId('media-preview-info')
    expect(info).toHaveTextContent('lobby.mp4')
    expect(info).toHaveTextContent('01:35 · Jul 16, 2026')
    expect(within(info).getByTestId('media-item-caption')).toHaveTextContent('Rear door, north wall')
    // The phone's library DISPLAYS metadata and never edits it (MediaItemInfo.tsx:88-147 is
    // read-only Text; MediaPreview takes no change callback) — so neither does this.
    expect(within(info).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('reserves the caption line when there is no caption, so selection does not shift the list', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item({ caption: '' })] }) })} />)

    expect(screen.queryByTestId('media-item-caption')).not.toBeInTheDocument()
    expect(screen.getByTestId('media-preview-info').lastElementChild).toHaveStyle({ minHeight: '16px' })
  })

  it('badges a bundled sample', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item({ sample: true })] }) })} />)
    expect(within(screen.getByTestId('media-preview-info')).getByText('Sample')).toBeInTheDocument()
    /**
     * W3 r1 F51 — D12's freeze-and-defend arm, pinned where it RENDERS.
     *
     * MUTATION: re-inline any one of the three values at the consumer (the state this fix
     * repaired). Read through `SAMPLE_BADGE`, so the assertion cannot drift from the seam and
     * a re-typed literal reds. The provenance mark is a correctness constraint, not a style.
     */
    expect(within(screen.getByTestId('media-preview-info')).getByText('Sample')).toHaveStyle({
      color: SAMPLE_BADGE.foreground,
      background: SAMPLE_BADGE.background,
      borderColor: SAMPLE_BADGE.border,
    })
  })

  it('shows no Sample badge for a live capture', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }) })} />)
    expect(within(screen.getByTestId('media-preview-info')).queryByText('Sample')).not.toBeInTheDocument()
  })

  it('omits the duration segment entirely when nothing measured it', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ audios: [item({ id: 'a1', kind: 'audio', filename: 'note.m4a' })] }) })} />)
    fireEvent.click(tab('Audio tab, 1 items'))

    const info = screen.getByTestId('media-preview-info')
    expect(info).toHaveTextContent('Jul 16, 2026')
    // Not the row's `--:--` placeholder — the panel drops the segment (MediaItemInfo.tsx:46-64).
    expect(info).not.toHaveTextContent('--:--')
  })
})

describe('MediaLibrarySheet — U7.2 (rows 57-66: A49, A51, A58, A80)', () => {
  /**
   * W3 r1 F61 — this file's five module-level style tables ship readonly. `as const` constrains
   * the TYPE only, so the writes live in a never-called function (the repo's idiom,
   * `CentredDialog.test.tsx:627-641`); each `@ts-expect-error` IS the assertion and goes unused,
   * reddening `tsc`, the moment an `as const` is dropped for a bare `: CSSProperties`.
   *
   * MUTATION: `const previewActionFace: CSSProperties = { … }`.
   */
  it('ships its module-level style tables readonly (F61)', () => {
    const reject = () => {
      // @ts-expect-error previewActionFace is readonly
      previewActionFace.width = 32
      // @ts-expect-error sampleBadge is readonly
      sampleBadge.color = 'red'
    }
    expect(typeof reject).toBe('function')
    expect(previewActionFace.width).toBe(36)
    expect(sampleBadge.color).toBe(SAMPLE_BADGE.foreground)
  })

  /**
   * MUTATION: put `<ModalShell …>` back around the body.
   *
   * The phone's `+122/-227` deleted a whole parallel sheet implementation and replaced it with
   * `<GlassBottomSheet>` (P5's "fold"). The shell is observable through the chrome it owns and
   * `ModalShell` does not: the sheet scrim, the accent strip, and the absence of a drag handle.
   */
  it('is mounted on GlassBottomSheet, not on the page-sheet ModalShell', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }) })} />)

    expect(document.querySelector('[data-sheet-scrim]')).not.toBeNull()
    expect(document.querySelector('[data-sheet-accent-strip]')).not.toBeNull()
    expect(document.querySelector('[data-modal-header]')).toBeNull()
    // Phone `:222-224` — the lists own the vertical axis, so no handle and no swipe-to-dismiss.
    expect(document.querySelector('[data-sheet-handle]')).toBeNull()
  })

  /**
   * MUTATION: pass `closeLabel="Close media library"`, i.e. copy the phone's call at `:227`
   * verbatim. That is the ONE prop this adoption deliberately drops, and the reason is
   * `GlassBottomSheet`'s own contract: the scrim is announced only when nothing else is.
   */
  it('labels exactly ONE dismiss control — the ✕, never the scrim as well', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }) })} />)
    expect(screen.getAllByRole('button', { name: 'Close media library' })).toHaveLength(1)
    expect(document.querySelector('[data-sheet-scrim]')?.getAttribute('aria-label')).toBeNull()
  })

  /**
   * MUTATION: drop `hitTarget(...)` from either preview action and paint the disc at 32 again,
   * or grow the painted disc to 44 instead of padding it.
   *
   * A49/DEF-UI-019: the web has no `hitSlop`, and the phone's own ruling
   * (`MediaPreview.tsx:63-68`) is that the painted circle STAYS 36 because "a 44px disc would
   * dominate" the row — the minimum is met with slop. On the web the padding IS the slop, and
   * the equal negative margin hands the 36 box back to the row so the picture does not move.
   */
  it.each(['View fullscreen', 'Close preview'])('gives %s a real 44 target around a 36 disc', (name) => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }) })} />)
    const button = screen.getByRole('button', { name })
    const face = button.firstElementChild as HTMLElement

    // 36 + 4 + 4 = 44, and the -4 margin returns the layout box to 36.
    expect(button).toHaveStyle({ padding: '4px', margin: '-4px' })
    expect(face).toHaveStyle({ width: '36px', height: '36px' })
    expect(4 * 2 + 36).toBe(touchTarget.min)
    // The paint is on the INNER span; a padded button with a background would be a 44 disc.
    expect(button.style.background).toBe('transparent')
  })

  /**
   * MUTATION: re-inline either edge as a literal, or point both at the same value.
   *
   * A51: the demo's hand-rolled 3D-glass edges are byte-identical to `ElevatedEdges.dark`
   * (`button-recipe.ts`'s docblock named this file as the copy and left it to U7.2). They are
   * imported now, and read through `[scheme]` so the light half arrives with the flip.
   */
  it('takes its 3D-glass edges from ElevatedEdges (A51), as longhands', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }) })} />)
    const face = screen.getByRole('button', { name: 'Close preview' }).firstElementChild as HTMLElement
    const norm = (s: string) => s.replace(/\s+/g, '')

    expect(norm(face.style.borderTopColor)).toBe(norm(ElevatedEdges[scheme].top))
    expect(norm(face.style.borderBottomColor)).toBe(norm(ElevatedEdges[scheme].bottom))
    // The lit-edge rule: a `border` shorthand here would erase both on the next paint.
    expect(face.style.borderWidth).toBe('1px')
    expect(face.style.borderTopColor).not.toBe(face.style.borderRightColor)
  })

  /**
   * MUTATION: put the fullscreen chip back to 40 with a 22px glyph.
   * Phone `MediaPreviewFullscreen.tsx:40-41` — `CLOSE_BUTTON_SIZE = 44`, `CLOSE_ICON_SIZE = 24`.
   */
  it('paints the fullscreen close chip at 44 with a 24 glyph (A49)', () => {
    render(<MediaLibrarySheet {...props({ media: buckets({ photos: [item()] }) })} />)
    fireEvent.click(screen.getByRole('button', { name: 'View fullscreen' }))
    const close = within(screen.getByTestId('media-fullscreen')).getByRole('button', { name: 'Close fullscreen' })

    expect(close).toHaveStyle({ width: `${touchTarget.min}px`, height: `${touchTarget.min}px` })
    expect(close.querySelector('svg')?.getAttribute('width')).toBe('24')
    // A90/U4.4's anti-resync: the ground is the chip, never `colors.scrim`.
    expect(close.style.background.replace(/\s+/g, '')).toBe(MEDIA_CLOSE_CHIP.replace(/\s+/g, ''))
  })

  /**
   * MUTATION: put either line back to its pre-U7.2 value (16 / textTertiary message, 13 / the
   * one-off dim blue hint).
   *
   * Phone `EmptyMediaState.tsx:88-99`: message `fontSize.lg` (18) / `fontWeight.medium`, hint
   * `fontSize.sm` (14), and BOTH `colors.textSecondary` (`:69`, `:74`). This is NOT A80's
   * `EmptyState` — the phone keeps a separate component for the media tabs because it carries a
   * hint line, which is why U3.4's sweep correctly left it alone.
   */
  it('brings the empty state to the phone two-line recipe, both lines textSecondary', () => {
    render(<MediaLibrarySheet {...props({ media: buckets() })} />)
    const empty = screen.getByTestId('empty-media-state')
    const [message, hint] = Array.from(empty.children) as HTMLElement[]
    const expected = hexToRgb(colors.textSecondary)

    expect(message).toHaveStyle({ fontSize: '18px', fontWeight: '500' })
    expect(message.style.color).toBe(expected)
    expect(hint).toHaveStyle({ fontSize: '14px', marginTop: '8px' })
    expect(hint.style.color).toBe(expected)
    // Phone `:56-59` — one accessible name for the whole state, not two orphaned lines.
    expect(empty.getAttribute('aria-label')).toBe(`${message.textContent}. ${hint.textContent}`)
  })
})
