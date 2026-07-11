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
    expect(rows.find((r) => r.id === 'cases')?.visited).toBe(true) // boot view
  })

  it('marks the active row from the current view and ignores unknown visited ids', () => {
    const store = freshStore()
    store.getState().setView('timeOffset')
    store.getState().launch('ocr') // recorded, but no registry item covers it — ignored
    const rows = selectExploreStatus(store.getState())
    expect(rows.filter((r) => r.active).map((r) => r.id)).toEqual(['timeOffset'])
    expect(rows.find((r) => r.id === 'timeOffset')?.visited).toBe(true)
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
})
