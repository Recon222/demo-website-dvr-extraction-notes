import { describe, it, expect } from 'vitest'
import { freshStore, seededStore, newCaseInput, newLocationInput } from './test-utils'
import {
  selectCurrentCase,
  selectCurrentLocation,
  selectLocationsForCase,
  selectVisibleWizardScreens,
  selectDrawerItems,
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
