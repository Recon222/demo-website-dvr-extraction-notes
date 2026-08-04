import { describe, it, expect } from 'vitest'
import { freshStore, storeWithLocation, newCaseInput, newLocationInput } from './test-utils'
import {
  selectCurrentCase,
  selectCurrentLocation,
  selectLocationsForCase,
  selectVisibleWizardScreens,
  selectDrawerItems,
  selectExploreStatus,
  selectLocationMapStatus,
  aggregateMapStatus,
  type DrawerStatus,
} from '@/features/demo/engine/store/selectors'

describe('selectors', () => {
  it('select current case/location return the selected entities, else null', () => {
    expect(selectCurrentCase(freshStore().getState())).toBeNull()
    expect(selectCurrentLocation(freshStore().getState())).toBeNull()
    const s = storeWithLocation().getState()
    expect(selectCurrentCase(s)?.id).toBe(s.currentCaseId)
    expect(selectCurrentCase(s)?.caseNumber).toBe('PR25-0098213')
    expect(selectCurrentLocation(s)?.id).toBe(s.currentLocationId)
  })

  it('selectLocationsForCase returns only that case’s locations', () => {
    const store = freshStore()
    const c = store.getState().createCase(newCaseInput())
    store.getState().addLocation(c, newLocationInput())
    store.getState().addLocation(c, newLocationInput())
    expect(selectLocationsForCase(store.getState(), c)).toHaveLength(2)
  })

  it('visible wizard screens / drawer items reflect the forensic profile (all 10)', () => {
    const s = freshStore().getState()
    expect(selectVisibleWizardScreens(s)).toHaveLength(10)
    expect(selectDrawerItems(s)).toHaveLength(10)
  })
})

describe('selectExploreStatus', () => {
  it('returns items in registry order with zero-padded numbers derived from position', () => {
    const rows = selectExploreStatus(freshStore().getState())
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0].number).toBe('01')
    rows.forEach((r, i) => expect(r.number).toBe(String(i + 1).padStart(2, '0')))
  })

  it('marks an item visited when ANY covered id is visited (grouping)', () => {
    const store = freshStore()
    store.getState().openModal('import') // covers: ['import'] on the import item
    const rows = selectExploreStatus(store.getState())
    expect(rows.find((r) => r.id === 'import')?.visited).toBe(true)
    expect(rows.find((r) => r.id === 'map')?.visited).toBe(false)
    // Cases is NOT pre-lit any more (R-12): the boot view is marked by landing on it, not seeded.
    expect(rows.find((r) => r.id === 'cases')?.visited).toBe(false)
  })

  it('marks the active row from the current view and ignores unknown visited ids', () => {
    const store = freshStore()
    store.getState().setView('timeOffset')
    store.getState().launch('ocr') // recorded, but no registry item covers it — ignored
    const rows = selectExploreStatus(store.getState())
    expect(rows.filter((r) => r.active).map((r) => r.id)).toEqual(['timeOffset'])
    expect(rows.find((r) => r.id === 'timeOffset')?.visited).toBe(true)
  })

  it('makes a media launch screen its own active row now that the manifest covers it (§63g)', () => {
    const store = freshStore()
    store.getState().setView('dvrInfo')
    store.getState().launch('mediaCapture')
    const rows = selectExploreStatus(store.getState())
    // Contrast with the `ocr` case above: that launchable has no item covering it, so the
    // anchor falls through to the chapter. This one does, so it wins — same rule, different
    // registry contents.
    expect(rows.filter((r) => r.active).map((r) => r.id)).toEqual(['mediaCapture'])
    expect(rows.find((r) => r.id === 'mediaCapture')?.visited).toBe(true)
  })

  it('lights the Media Library row while its sheet is open, and returns the marker on close', () => {
    const store = freshStore()
    store.getState().setView('dvrInfo')
    store.getState().openModal('mediaLibrary')
    expect(selectExploreStatus(store.getState()).filter((r) => r.active).map((r) => r.id)).toEqual(['mediaLibrary'])

    store.getState().closeModal()
    const after = selectExploreStatus(store.getState())
    expect(after.filter((r) => r.active).map((r) => r.id)).toEqual(['dvrInfo'])
    // Visited survives the close — the checklist records that you have been there.
    expect(after.find((r) => r.id === 'mediaLibrary')?.visited).toBe(true)
  })

  it('makes the modal row active while its modal is open (anchor prefers the open modal)', () => {
    const store = freshStore() // boots on the cases view
    store.getState().openModal('import') // modal open; view stays 'cases'
    const rows = selectExploreStatus(store.getState())
    // the open modal wins the active marker over the underlying view
    expect(rows.filter((r) => r.active).map((r) => r.id)).toEqual(['import'])
  })
})

describe('selectLocationMapStatus', () => {
  it('aggregateMapStatus: all empty → started, all complete → complete, otherwise working', () => {
    expect(aggregateMapStatus(Array<DrawerStatus>(10).fill('empty'))).toBe('started')
    expect(aggregateMapStatus(Array<DrawerStatus>(10).fill('complete'))).toBe('complete')
    expect(aggregateMapStatus(['empty', 'complete', 'partial'])).toBe('working')
    expect(aggregateMapStatus(['empty', 'complete'])).toBe('working')
  })

  it('a brand-new (all-blank) location reads as started', () => {
    const store = freshStore()
    const c = store.getState().createCase(newCaseInput())
    store.getState().addLocation(c, { locationName: 'Front' })
    expect(selectLocationMapStatus(selectCurrentLocation(store.getState())!)).toBe('started')
  })

  it('a partly-filled location reads as working', () => {
    const store = storeWithLocation()
    store.getState().updateField('form.dvr.dvrTypeBrand', 'Hikvision DS-7608') // one screen partial
    expect(selectLocationMapStatus(selectCurrentLocation(store.getState())!)).toBe('working')
  })

  it('an explicitly completed location reads as complete regardless of field aggregation (R-1)', () => {
    const store = storeWithLocation()
    // Partly filled — aggregation alone would say 'working' — then Complete & Save.
    store.getState().updateField('form.dvr.dvrTypeBrand', 'Hikvision DS-7608')
    store.getState().completeCase(store.getState().currentCaseId!)
    expect(selectLocationMapStatus(selectCurrentLocation(store.getState())!)).toBe('complete')
  })
})
