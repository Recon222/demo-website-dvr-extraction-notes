import { describe, it, expect } from 'vitest'
import { freshStore, seededStore, newCaseInput, newLocationInput } from './test-utils'
import { selectCaseNotesData, selectCurrentLocation } from '@/lib/demo/store/selectors'
import { mapAiToForm, SAMPLE_EXTRACTION } from '@/lib/demo/logic/import'
import type { MediaItem } from '@/lib/demo/types'

const media = (o: Partial<MediaItem> = {}): MediaItem => ({
  id: 'm1',
  kind: 'photo',
  url: 'blob:x',
  filename: 'IMG_1.jpg',
  caption: '',
  capturedAt: '2025-03-09 10:00:00',
  ...o,
})

function withLocation() {
  const store = freshStore()
  const c = store.getState().createCase(newCaseInput())
  store.getState().addLocation(c, newLocationInput({ businessName: '', streetAddress: '' }))
  return store
}

describe('createCase / addLocation optional fields', () => {
  it('carry through OIC/VC and per-location requester/contact when provided', () => {
    const store = freshStore()
    const c = store.getState().createCase(
      newCaseInput({ oicName: 'A. Okafor', oicBadge: '3318', vcName: 'M. Reyes', vcBadge: '5102' }),
    )
    expect(store.getState().cases.find((x) => x.id === c)?.oicName).toBe('A. Okafor')
    const l = store.getState().addLocation(
      c,
      newLocationInput({ requesterName: 'Liam McHugh', requesterBadge: '4471', locationContact: 'Sandeep Gill' }),
    )
    const loc = store.getState().locations.find((x) => x.id === l)
    expect(loc?.requesterName).toBe('Liam McHugh')
    expect(loc?.locationContact).toBe('Sandeep Gill')
  })
})

describe('applyImport', () => {
  it('pre-fills the current location identity, DVR info and scopes from the AI mapping', () => {
    const store = withLocation()
    store.getState().applyImport(mapAiToForm(SAMPLE_EXTRACTION))
    const loc = selectCurrentLocation(store.getState())!
    expect(loc.businessName).toBe("Kim's Convenience")
    expect(loc.requesterName).toBe('Liam McHugh')
    expect(loc.form.dvr.dvrTypeBrand).toBe('Hikvision DS-7608')
    expect(loc.form.scopes).toHaveLength(1)
    expect(loc.form.scopes[0].cameras).toBe('cameras 3, 4 and 7')
  })
})

describe('media', () => {
  it('addMedia / deleteMedia manage the photo/video/audio buckets on the current location', () => {
    const store = withLocation()
    store.getState().addMedia('photo', media())
    store.getState().addMedia('video', media({ id: 'm2', kind: 'video' }))
    store.getState().addMedia('audio', media({ id: 'm3', kind: 'audio' }))
    const m = () => selectCurrentLocation(store.getState())!.form.media
    expect(m().photos).toHaveLength(1)
    expect(m().videos).toHaveLength(1)
    expect(m().audios).toHaveLength(1)
    store.getState().deleteMedia('photo', 'm1')
    expect(m().photos).toHaveLength(0)
  })
})

describe('view / mode / modal / drawer setters', () => {
  it('update the corresponding state', () => {
    const store = freshStore()
    store.getState().setMode('sandbox')
    store.getState().openModal('newCase')
    store.getState().setDrawerOpen(true)
    expect(store.getState().mode).toBe('sandbox')
    expect(store.getState().modal).toBe('newCase')
    expect(store.getState().drawerOpen).toBe(true)
    store.getState().closeModal()
    expect(store.getState().modal).toBeNull()
  })
})

describe('guards', () => {
  it('switchLocation ignores an unknown id', () => {
    const store = seededStore()
    store.getState().switchLocation('does-not-exist')
    expect(store.getState().currentLocationId).toBe('seed-loc')
  })

  it('location mutators are no-ops without a current location', () => {
    const store = freshStore() // no current location
    store.getState().updateField('businessName', 'x')
    store.getState().calculateOffset()
    store.getState().generateExtractedScopes()
    store.getState().generateNotes()
    store.getState().applyImport(mapAiToForm(SAMPLE_EXTRACTION))
    store.getState().addMedia('photo', media())
    store.getState().deleteMedia('photo', 'm1')
    expect(store.getState().locations).toHaveLength(0)
  })

  it('calculateOffset needs both capture times', () => {
    const store = withLocation()
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30') // only one
    store.getState().calculateOffset()
    expect(selectCurrentLocation(store.getState())?.form.timeOffset).toBeNull()
  })
})

describe('selectCaseNotesData', () => {
  it('tolerates an empty store', () => {
    const data = selectCaseNotesData(freshStore().getState())
    expect(data.occNumber).toBeUndefined()
    expect(data.address).toBe('')
    expect(data.scopes).toBeUndefined()
    expect(data.timeOffset).toBeNull()
  })
})
