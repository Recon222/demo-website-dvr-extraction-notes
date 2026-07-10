import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import type { NewCaseInput, NewLocationInput } from '@/features/demo/engine/store/create-store'

/** A blank store — the empty sandbox boot (there is no other kind of store anymore). */
export function freshStore(): DemoStore {
  return createDemoStore()
}

/** A store with one visitor-created case + location selected (blank form) —
 *  the common starting point for wizard/selector tests. */
export function storeWithLocation(): DemoStore {
  const store = createDemoStore()
  const c = store.getState().createCase(newCaseInput())
  store.getState().addLocation(c, newLocationInput())
  return store
}

export function newCaseInput(o: Partial<NewCaseInput> = {}): NewCaseInput {
  return { caseNumber: 'PR25-0098213', displayName: "Kim's Convenience — B&E", unit: 'Central Robbery', ...o }
}

export function newLocationInput(o: Partial<NewLocationInput> = {}): NewLocationInput {
  return {
    locationName: "Kim's Convenience",
    businessName: "Kim's Convenience",
    streetAddress: '1450 Eglinton Ave W',
    city: 'Mississauga',
    ...o,
  }
}
