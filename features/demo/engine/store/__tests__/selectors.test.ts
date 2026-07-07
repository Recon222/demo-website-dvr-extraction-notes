import { describe, it, expect } from 'vitest'
import { freshStore, seededStore, newCaseInput, newLocationInput } from './test-utils'
import {
  selectCurrentCase,
  selectCurrentLocation,
  selectLocationsForCase,
  selectVisibleWizardScreens,
  selectDrawerItems,
  selectLocationMapStatus,
  aggregateMapStatus,
  type DrawerStatus,
} from '@/features/demo/engine/store/selectors'

describe('selectors', () => {
  it('select current case/location return the selected entities, else null', () => {
    expect(selectCurrentCase(freshStore().getState())).toBeNull()
    expect(selectCurrentLocation(freshStore().getState())).toBeNull()
    const s = seededStore().getState()
    expect(selectCurrentCase(s)?.id).toBe('seed-case')
    expect(selectCurrentLocation(s)?.id).toBe('seed-loc')
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

  it('a partly-filled location (the seed) reads as working', () => {
    expect(selectLocationMapStatus(selectCurrentLocation(seededStore().getState())!)).toBe('working')
  })
})
