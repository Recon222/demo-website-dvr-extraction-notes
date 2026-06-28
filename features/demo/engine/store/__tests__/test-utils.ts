import { createDemoStore, type DemoStore } from '@/lib/demo/store/create-store'
import type { NewCaseInput, NewLocationInput } from '@/lib/demo/store/create-store'

/** A blank store (sandbox-style, no seed). */
export function freshStore(): DemoStore {
  return createDemoStore()
}

/** A store with the guided seed case/location loaded. */
export function seededStore(): DemoStore {
  const store = createDemoStore()
  store.getState().seedGuided()
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
