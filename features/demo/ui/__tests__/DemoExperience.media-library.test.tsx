import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'

import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import type { MediaItem } from '@/features/demo/engine/types'

/**
 * P4.5 — the media library THROUGH THE BRIDGE (matrix rows 57–66).
 *
 * The sheet's own behaviour (tabs, lists, preview, the confirm dialog) is pinned presentationally
 * in `screens/__tests__/MediaLibrarySheet.test.tsx`. What is pinned here is the half a
 * presentational test cannot see: which media the sheet is handed, and what deleting one does to
 * the store.
 */

function media(over: Partial<MediaItem> = {}): MediaItem {
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

/** A case with two locations, media on both, the first one open. */
function seed(): { store: DemoStore; otherLocationId: string } {
  const store = createDemoStore()
  let otherLocationId = ''
  act(() => {
    const s = store.getState()
    const caseId = s.createCase({ caseNumber: 'PR25-M', displayName: 'Media', unit: 'Robbery' })
    const locId = s.addLocation(caseId, { locationName: 'Site' })
    otherLocationId = s.addLocation(caseId, { locationName: 'Other' })

    store.getState().switchLocation(otherLocationId)
    store.getState().addMedia('photo', media({ id: 'other-photo', filename: 'elsewhere.jpg' }))

    store.getState().switchLocation(locId)
    store.getState().addMedia('photo', media({ id: 'p1', filename: 'front-door.jpg' }))
    store.getState().addMedia('video', media({ id: 'v1', kind: 'video', filename: 'lobby.mp4', durationSec: 95, url: 'blob:two' }))
    store.getState().setView('dvrInfo')
  })
  return { store, otherLocationId }
}

function openLibrary(store: DemoStore) {
  act(() => store.getState().setDrawerOpen(true))
  fireEvent.click(screen.getByRole('button', { name: 'Media section' }))
  fireEvent.click(screen.getByRole('button', { name: 'Open media library' }))
}

describe('the library reads the OPEN location’s media', () => {
  it('lists this location’s captures and none of the neighbour’s', () => {
    const { store } = seed()
    render(<DemoExperience store={store} />)
    openLibrary(store)

    expect(screen.getByTestId('modal-subtitle')).toHaveTextContent('2 items')
    expect(screen.getByRole('button', { name: 'Photo: front-door.jpg' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Photo: elsewhere.jpg' })).not.toBeInTheDocument()
  })

  it('routes each kind to its own tab', () => {
    const { store } = seed()
    render(<DemoExperience store={store} />)
    openLibrary(store)

    fireEvent.click(screen.getByRole('tab', { name: 'Video tab, 1 items' }))
    expect(screen.getByRole('button', { name: 'Video: lobby.mp4, 01:35' })).toBeInTheDocument()
  })
})

describe('deleting a capture (row 66)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** Answer the confirmation the given way. */
  function confirmDelete(answer: 'Delete' | 'Cancel') {
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: answer }))
  }

  it('drops the item from THIS location’s bucket and says so', () => {
    const { store } = seed()
    render(<DemoExperience store={store} />)
    openLibrary(store)

    fireEvent.click(screen.getByRole('button', { name: 'Delete front-door.jpg' }))
    confirmDelete('Delete')

    const location = store.getState().locations.find((l) => l.id === store.getState().currentLocationId)!
    expect(location.form.media.photos).toHaveLength(0)
    // The video is untouched — deletion is per item, not per location.
    expect(location.form.media.videos).toHaveLength(1)
    expect(screen.getByText('Media deleted')).toBeInTheDocument()
  })

  it('revokes the deleted item’s object URL — §58g’s first and only caller', () => {
    // The tab owns the blob until the row goes; nothing else holds it afterwards, so failing to
    // revoke pins a whole photo in memory for the life of the tab.
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const { store } = seed()
    render(<DemoExperience store={store} />)
    openLibrary(store)

    fireEvent.click(screen.getByRole('button', { name: 'Delete front-door.jpg' }))
    confirmDelete('Delete')

    expect(revoke).toHaveBeenCalledWith('blob:one')
  })

  it('never revokes a bundled sample path — those files outlive every surface', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const store = createDemoStore()
    act(() => {
      const s = store.getState()
      const caseId = s.createCase({ caseNumber: 'PR25-M', displayName: 'Media', unit: 'Robbery' })
      const locId = s.addLocation(caseId, { locationName: 'Site' })
      store.getState().switchLocation(locId)
      store.getState().addMedia('photo', media({ id: 'p1', url: '/demo-media/sample-photo.jpg', sample: true }))
      store.getState().setView('dvrInfo')
    })
    render(<DemoExperience store={store} />)
    openLibrary(store)

    fireEvent.click(screen.getByRole('button', { name: 'Delete front-door.jpg' }))
    confirmDelete('Delete')

    expect(revoke).not.toHaveBeenCalled()
    expect(store.getState().locations[0].form.media.photos).toHaveLength(0)
  })

  it('cancelling writes nothing at all', () => {
    const { store } = seed()
    render(<DemoExperience store={store} />)
    openLibrary(store)

    const before = store.getState()
    fireEvent.click(screen.getByRole('button', { name: 'Delete front-door.jpg' }))
    confirmDelete('Cancel')

    // Whole-state identity: a cancel that quietly rebuilt `locations` would still be a write.
    expect(store.getState()).toBe(before)
    expect(screen.getByRole('button', { name: 'Photo: front-door.jpg' })).toBeInTheDocument()
  })

  it('closes the preview of the item it just deleted, and leaves the sheet open', () => {
    const { store } = seed()
    render(<DemoExperience store={store} />)
    openLibrary(store)

    // The photo is auto-selected, so its preview is up.
    expect(screen.getByTestId('media-preview')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete front-door.jpg' }))
    confirmDelete('Delete')

    expect(screen.queryByTestId('media-preview')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Media Library' })).toBeInTheDocument()
    // The Photos tab is empty now and says so, per tab.
    expect(screen.getByText('No photos')).toBeInTheDocument()
    expect(screen.getByTestId('modal-subtitle')).toHaveTextContent('1 items')
  })
})
