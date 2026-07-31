import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import type { NewCaseInput, NewLocationInput } from '@/features/demo/engine/store/create-store'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import type { DemoCase, DemoLocation } from '@/features/demo/engine/types'

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

// ---- entity factories (review R-15) -----------------------------------------------------
//
// The factories above build store INPUTS. These build the stored ENTITIES, which P3 turned into
// a widely-fixtured shape: `DemoCase` went from 2 suites to 7, fifteen fields each, every one
// hand-rolled. Its growth direction is OPTIONAL fields — `incidentCoordinates` arrived that way
// — and `tsc` will not flag a stale fixture that simply omits a new optional key, so seven
// copies drift silently and independently. That is the phone repo's documented
// `createMockCase`/BUG-007 pattern arriving here; CLAUDE.md's own rule for it is "update the
// factory FIRST, then prefer it over inline literals so a future field add is a one-file change".
//
// Defaults are the shape most suites already used, so folding a site is usually a delete.

/** A stored case. Override only what the test is about. */
export function demoCase(over: Partial<DemoCase> = {}): DemoCase {
  return {
    id: 'c1',
    caseNumber: 'PR25-0001',
    displayName: "Kim's — B&E",
    unit: 'Robbery',
    oicName: 'L. McHugh',
    oicBadge: '4471',
    vcName: '',
    vcBadge: '',
    incidentBusinessName: '',
    incidentStreetAddress: '',
    incidentCity: '',
    notes: '',
    status: 'draft',
    createdLabel: 'Just now',
    locationIds: ['l1'],
    ...over,
  }
}

/** A stored location. `form` defaults to the blank wizard form, as `addLocation` builds it. */
export function demoLocation(over: Partial<DemoLocation> = {}): DemoLocation {
  return {
    id: 'l1',
    caseId: 'c1',
    locationName: "Kim's Convenience",
    businessName: '',
    streetAddress: '1450 Eglinton Ave W',
    city: 'Mississauga',
    locationContact: '',
    locationPhone: '',
    requesterName: '',
    requesterBadge: '',
    requesterUnit: '',
    requesterPhone: '',
    requesterEmail: '',
    form: blankLocationForm(),
    ...over,
  }
}
