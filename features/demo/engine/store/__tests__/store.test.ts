import { describe, it, expect } from 'vitest'
import { freshStore, newCaseInput, newLocationInput } from './test-utils'
import { blankCapture } from '@/features/demo/engine/store/create-store'
import { selectCurrentLocation } from '@/features/demo/engine/store/selectors'
import { CHAPTERS, TAB_VIEWS } from '@/features/demo/engine/content/screens'
import type { ScopeEntry } from '@/features/demo/engine/types'

const scope = (o: Partial<ScopeEntry> = {}): ScopeEntry => ({
  id: 's1',
  startDateTime: '2025-03-08 23:45:00',
  endDateTime: '2025-03-09 01:30:00',
  isActualTime: true,
  cameras: '3, 4, 7',
  ...o,
})

describe('boot state (the empty sandbox — there is no other mode)', () => {
  it('boots on the cases view with no data, no modal, no drawer', () => {
    const s = freshStore().getState()
    expect(s.view).toBe('cases')
    expect(s.currentChapter).toBe('cases')
    expect(s.cases).toHaveLength(0)
    expect(s.locations).toHaveLength(0)
    expect(s.currentCaseId).toBeNull()
    expect(s.currentLocationId).toBeNull()
    expect(s.modal).toBeNull()
    expect(s.drawerOpen).toBe(false)
  })

  it('reset() returns a dirtied store to the same empty boot state (start over)', () => {
    // Dirty EVERY mutable key — capture especially: leaking in-progress OCR/time-sync
    // data across a reset would resurrect the canned-data-persistence bug the deleted
    // isSeed machinery existed to fix (review M4).
    const store = freshStore()
    const c = store.getState().createCase(newCaseInput())
    store.getState().addLocation(c, newLocationInput())
    store.getState().setView('timeOffset')
    store.getState().setDrawerOpen(true)
    store.getState().openModal('newCase')
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    store.getState().updateField('capture.dvrAppliesDST', true)
    // The two P7.3 members. "EVERY mutable key" stopped being true the moment they landed, and
    // nothing failed — which is exactly the silent fixture drift this comment warns about.
    store.getState().applyFormProfile('canvas')
    store.getState().setFormStepVisible('exportInfo', false)
    store.getState().reset()
    const s = store.getState()
    expect(s.view).toBe('cases')
    expect(s.currentChapter).toBe('cases')
    expect(s.cases).toHaveLength(0)
    expect(s.locations).toHaveLength(0)
    expect(s.currentCaseId).toBeNull()
    expect(s.currentLocationId).toBeNull()
    expect(s.drawerOpen).toBe(false)
    expect(s.modal).toBeNull()
    expect(s.capture).toEqual(blankCapture())
    // …and the settings family SURVIVES, by one rule for all three (R-13 / A3). `userProfile`
    // is pinned separately in user-profile-state.test.ts; these two were unasserted in either
    // direction, so a reset that wiped them was as green as one that kept them.
    expect(s.profile).toBe('canvas')
    expect(s.formOverrides).toEqual({ steps: { exportInfo: false }, fields: {} })
  })

  it('the tour is gone: no seedGuided/setMode actions, no mode/auth state', () => {
    const s = freshStore().getState() as unknown as Record<string, unknown>
    for (const gone of ['seedGuided', 'setMode', 'mode', 'auth']) {
      expect(gone in s, `"${gone}" should no longer exist on the store`).toBe(false)
    }
  })
})

describe('visited tracking (the exploration manifest source)', () => {
  it('boots having seen nothing — the landing screen is marked by whoever lands on it (R-12)', () => {
    // Seeding `{ cases: true }` was true until P8.1 put a gate in front of the app, and then it
    // claimed a screen the visitor had not been shown yet. The bridge replays `setView` on the
    // current view once nothing is covering it, so the mark arrives with the pixels.
    expect(freshStore().getState().visited).toEqual({})
    const store = freshStore()
    store.getState().setView(store.getState().view)
    expect(store.getState().visited).toEqual({ cases: true })
  })

  it('setView records each view, idempotently', () => {
    const store = freshStore()
    store.getState().setView('dashboard')
    store.getState().setView('map')
    store.getState().setView('dashboard') // re-visit — no-op
    expect(store.getState().visited).toEqual({ dashboard: true, map: true })
  })

  it('launch records the launch-only screen; openModal records the modal', () => {
    const store = freshStore()
    store.getState().launch('ocr')
    store.getState().openModal('import')
    expect(store.getState().visited.ocr).toBe(true)
    expect(store.getState().visited.import).toBe(true)
  })

  it('a re-visit returns the SAME visited object — identity, not just value (render economy)', () => {
    // Pins the visit() identity guard by reference (review M2): an "equivalent"
    // rewrite that spreads unconditionally would pass toEqual but fail this.
    const store = freshStore()
    store.getState().setView('dashboard')
    store.getState().openModal('import')
    const before = store.getState().visited
    store.getState().setView('dashboard') // re-visit via setView
    store.getState().openModal('import') // re-visit via openModal
    store.getState().setView('dashboard')
    expect(store.getState().visited).toBe(before)
  })

  it('a first visit returns a NEW visited object (the guard works both ways)', () => {
    const store = freshStore()
    const before = store.getState().visited
    store.getState().launch('ocr')
    expect(store.getState().visited).not.toBe(before)
    expect(store.getState().visited.ocr).toBe(true)
  })

  it('reset() clears visited back to the boot record (nothing seen)', () => {
    const store = freshStore()
    store.getState().setView('dashboard')
    store.getState().openModal('import')
    store.getState().reset()
    expect(store.getState().visited).toEqual({})
  })
})

describe('createCase / addLocation', () => {
  it('createCase appends a case and returns its id', () => {
    const store = freshStore()
    const id = store.getState().createCase(newCaseInput({ caseNumber: 'PR25-1' }))
    expect(store.getState().cases.find((c) => c.id === id)?.caseNumber).toBe('PR25-1')
    expect(store.getState().currentCaseId).toBe(id)
  })

  it('addLocation links the location to the case (locationIds + caseId)', () => {
    const store = freshStore()
    const caseId = store.getState().createCase(newCaseInput())
    const locId = store.getState().addLocation(caseId, newLocationInput())
    expect(store.getState().locations.find((l) => l.id === locId)?.caseId).toBe(caseId)
    expect(store.getState().cases.find((c) => c.id === caseId)?.locationIds).toContain(locId)
    expect(store.getState().currentLocationId).toBe(locId)
  })

  it('supports multiple locations on one case', () => {
    const store = freshStore()
    const caseId = store.getState().createCase(newCaseInput())
    const a = store.getState().addLocation(caseId, newLocationInput({ locationName: 'A' }))
    const b = store.getState().addLocation(caseId, newLocationInput({ locationName: 'B' }))
    expect(a).not.toBe(b)
    expect(store.getState().cases.find((c) => c.id === caseId)?.locationIds).toEqual([a, b])
    expect(store.getState().locations.filter((l) => l.caseId === caseId)).toHaveLength(2)
  })
})

describe('coordinates', () => {
  it('createCase persists incidentCoordinates when provided', () => {
    const store = freshStore()
    const id = store.getState().createCase({
      ...newCaseInput(),
      incidentCoordinates: { lat: 43.6087, lng: -79.6505, source: 'geocoded' },
    })
    expect(store.getState().cases.find((c) => c.id === id)?.incidentCoordinates).toEqual({
      lat: 43.6087,
      lng: -79.6505,
      source: 'geocoded',
    })
  })

  it('createCase leaves incidentCoordinates undefined when omitted', () => {
    const store = freshStore()
    const id = store.getState().createCase(newCaseInput())
    expect(store.getState().cases.find((c) => c.id === id)?.incidentCoordinates).toBeUndefined()
  })

  it('addLocation persists gps as given — no fabricated accuracy for a geocoded pick', () => {
    const store = freshStore()
    const caseId = store.getState().createCase(newCaseInput())
    const locId = store.getState().addLocation(caseId, {
      ...newLocationInput(),
      gps: { lat: 43.6087, lng: -79.6505, source: 'geocoded' },
    })
    expect(store.getState().locations.find((l) => l.id === locId)?.gps).toEqual({
      lat: 43.6087,
      lng: -79.6505,
      source: 'geocoded',
    })
  })

  it('addLocation leaves gps undefined when omitted', () => {
    const store = freshStore()
    const caseId = store.getState().createCase(newCaseInput())
    const locId = store.getState().addLocation(caseId, newLocationInput())
    expect(store.getState().locations.find((l) => l.id === locId)?.gps).toBeUndefined()
  })

  it('updateField("gps", …) persists coordinates on the current location', () => {
    const store = freshStore()
    const caseId = store.getState().createCase(newCaseInput())
    store.getState().addLocation(caseId, newLocationInput())
    store.getState().updateField('gps', { lat: 43.7, lng: -79.4, accuracyM: 8, source: 'gps' })
    expect(selectCurrentLocation(store.getState())?.gps).toEqual({
      lat: 43.7,
      lng: -79.4,
      accuracyM: 8,
      source: 'gps',
    })
  })
})

describe('completeCase (the arc payoff — G4, location-scoped gate — R-1)', () => {
  it('flips the case status draft → complete, leaving other cases untouched', () => {
    const store = freshStore()
    const a = store.getState().createCase(newCaseInput({ caseNumber: 'A' }))
    const b = store.getState().createCase(newCaseInput({ caseNumber: 'B' }))
    expect(store.getState().cases.find((c) => c.id === a)?.status).toBe('draft')
    store.getState().completeCase(a)
    expect(store.getState().cases.find((c) => c.id === a)?.status).toBe('complete')
    expect(store.getState().cases.find((c) => c.id === b)?.status).toBe('draft')
  })

  it('stamps form.completed on the CURRENT location only — siblings stay un-completed (R-1)', () => {
    const store = freshStore()
    const caseId = store.getState().createCase(newCaseInput())
    const l1 = store.getState().addLocation(caseId, newLocationInput({ locationName: 'First' }))
    const l2 = store.getState().addLocation(caseId, newLocationInput({ locationName: 'Second' }))
    store.getState().switchLocation(l1)
    store.getState().completeCase(caseId)
    expect(store.getState().locations.find((l) => l.id === l1)?.form.completed).toBe(true)
    expect(store.getState().locations.find((l) => l.id === l2)?.form.completed).toBe(false)
    expect(store.getState().cases.find((c) => c.id === caseId)?.status).toBe('complete')
  })

  it('never stamps a location belonging to a different case', () => {
    const store = freshStore()
    const caseA = store.getState().createCase(newCaseInput({ caseNumber: 'A' }))
    store.getState().addLocation(caseA, newLocationInput())
    const caseB = store.getState().createCase(newCaseInput({ caseNumber: 'B' }))
    // current location still belongs to caseA; completing caseB must not stamp it
    store.getState().completeCase(caseB)
    expect(store.getState().locations[0].form.completed).toBe(false)
    expect(store.getState().cases.find((c) => c.id === caseB)?.status).toBe('complete')
  })

  it('an unknown id changes no case and stamps no location', () => {
    const store = freshStore()
    const a = store.getState().createCase(newCaseInput())
    store.getState().addLocation(a, newLocationInput())
    store.getState().completeCase('nope')
    expect(store.getState().cases.find((c) => c.id === a)?.status).toBe('draft')
    expect(store.getState().locations[0].form.completed).toBe(false)
  })

  it('is idempotent — completing twice stays complete', () => {
    const store = freshStore()
    const a = store.getState().createCase(newCaseInput())
    store.getState().addLocation(a, newLocationInput())
    store.getState().completeCase(a)
    store.getState().completeCase(a)
    expect(store.getState().cases.find((c) => c.id === a)?.status).toBe('complete')
    expect(store.getState().locations[0].form.completed).toBe(true)
  })
})

describe('setCaseStatus (the dashboard Case Actions Sheet — P3.2)', () => {
  it('moves a case through complete / archived / draft, leaving other cases alone', () => {
    const store = freshStore()
    const a = store.getState().createCase(newCaseInput({ caseNumber: 'A' }))
    const b = store.getState().createCase(newCaseInput({ caseNumber: 'B' }))
    const statusOf = (id: string) => store.getState().cases.find((c) => c.id === id)?.status

    store.getState().setCaseStatus(a, 'complete')
    expect(statusOf(a)).toBe('complete')
    store.getState().setCaseStatus(a, 'archived')
    expect(statusOf(a)).toBe('archived')
    store.getState().setCaseStatus(a, 'draft') // Reopen
    expect(statusOf(a)).toBe('draft')
    expect(statusOf(b)).toBe('draft')
  })

  it('NEVER stamps a location — the dashboard has no location context (unlike completeCase)', () => {
    const store = freshStore()
    const caseId = store.getState().createCase(newCaseInput())
    const locId = store.getState().addLocation(caseId, newLocationInput())
    store.getState().switchLocation(locId)
    store.getState().setCaseStatus(caseId, 'complete')
    expect(store.getState().cases.find((c) => c.id === caseId)?.status).toBe('complete')
    expect(store.getState().locations.find((l) => l.id === locId)?.form.completed).toBe(false)
  })

  it('an unknown id changes nothing', () => {
    const store = freshStore()
    const a = store.getState().createCase(newCaseInput())
    const before = store.getState().cases
    store.getState().setCaseStatus('nope', 'archived')
    expect(store.getState().cases).toBe(before) // same reference — no write happened
    expect(store.getState().cases.find((c) => c.id === a)?.status).toBe('draft')
  })

  it('a repeat of the current status performs no write (reference-preserving)', () => {
    const store = freshStore()
    const a = store.getState().createCase(newCaseInput())
    store.getState().setCaseStatus(a, 'complete')
    const after = store.getState().cases
    store.getState().setCaseStatus(a, 'complete')
    expect(store.getState().cases).toBe(after)
  })

  it('a no-op does not allocate a new STATE object either (no subscriber wake, no snapshot)', () => {
    // The assertion above pins `cases` only, and passed even while the updater returned `{}`
    // from inside `set` — which zustand `Object.assign`s onto a fresh state, waking every
    // selector and the persistence subscriber. P3.1's CRUD suite made the same assertion at
    // whole-state granularity and caught it at the P3 assembly merge; this is that guarantee
    // pinned at P3.2's own call site so neither package can lose it again.
    const store = freshStore()
    const a = store.getState().createCase(newCaseInput())
    store.getState().setCaseStatus(a, 'archived')
    const settled = store.getState()
    store.getState().setCaseStatus(a, 'archived') // same status
    store.getState().setCaseStatus('nope', 'draft') // unknown id
    expect(store.getState()).toBe(settled)
  })
})

describe('selection-pair coherence (R-19)', () => {
  it('createCase clears currentLocationId — a new case never keeps another case\'s location current', () => {
    const store = freshStore()
    const a = store.getState().createCase(newCaseInput({ caseNumber: 'A' }))
    store.getState().addLocation(a, newLocationInput())
    expect(store.getState().currentLocationId).not.toBeNull()
    store.getState().createCase(newCaseInput({ caseNumber: 'B' }))
    expect(store.getState().currentLocationId).toBeNull()
  })

  it('addLocation sets BOTH halves — adding to a non-current case moves the case selection with it', () => {
    const store = freshStore()
    const a = store.getState().createCase(newCaseInput({ caseNumber: 'A' }))
    const b = store.getState().createCase(newCaseInput({ caseNumber: 'B' })) // current case: B
    const locA = store.getState().addLocation(a, newLocationInput()) // "Add Location" on expanded A
    expect(store.getState().currentLocationId).toBe(locA)
    expect(store.getState().currentCaseId).toBe(a) // follows the location, not stale B
    expect(b).not.toBe(a)
  })
})

describe('switchLocation', () => {
  it('sets currentLocationId and the matching caseId', () => {
    const store = freshStore()
    const c1 = store.getState().createCase(newCaseInput({ caseNumber: 'C1' }))
    const l1 = store.getState().addLocation(c1, newLocationInput())
    const c2 = store.getState().createCase(newCaseInput({ caseNumber: 'C2' }))
    store.getState().addLocation(c2, newLocationInput())
    store.getState().switchLocation(l1)
    expect(store.getState().currentLocationId).toBe(l1)
    expect(store.getState().currentCaseId).toBe(c1)
  })
})

describe('updateField', () => {
  const withLocation = () => {
    const store = freshStore()
    const c = store.getState().createCase(newCaseInput())
    store.getState().addLocation(c, newLocationInput())
    return store
  }

  it('updates a nested form path on the current location', () => {
    const store = withLocation()
    store.getState().updateField('form.dvr.dvrTypeBrand', 'Hikvision DS-7608')
    expect(selectCurrentLocation(store.getState())?.form.dvr.dvrTypeBrand).toBe('Hikvision DS-7608')
  })

  it('updates a top-level identity field on the current location', () => {
    const store = withLocation()
    store.getState().updateField('businessName', "Mike's Variety")
    expect(selectCurrentLocation(store.getState())?.businessName).toBe("Mike's Variety")
  })

  it('routes capture.* paths to the transient time-offset capture', () => {
    const store = freshStore()
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    expect(store.getState().capture.dvrDateTime).toBe('2025-03-08 12:05:30')
  })
})

describe('calculateOffset', () => {
  it('writes timeOffset on the current location using the real time logic', () => {
    const store = freshStore()
    const c = store.getState().createCase(newCaseInput())
    store.getState().addLocation(c, newLocationInput())
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    store.getState().updateField('capture.actualDateTime', '2025-03-08 12:00:00')
    store.getState().calculateOffset()
    const off = selectCurrentLocation(store.getState())?.form.timeOffset
    expect(off?.formattedDifference).toBe('00:05:30')
    expect(off?.direction).toBe('AHEAD OF')
    expect(off?.isCorrect).toBe(false)
  })
})

describe('generateExtractedScopes', () => {
  it('produces DVR-time scopes rounded to 5-min from the offset', () => {
    const store = freshStore()
    const c = store.getState().createCase(newCaseInput())
    store.getState().addLocation(c, newLocationInput())
    store.getState().updateField('form.scopes', [scope()])
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    store.getState().updateField('capture.actualDateTime', '2025-03-08 12:00:00')
    store.getState().calculateOffset()
    store.getState().generateExtractedScopes()
    const ex = selectCurrentLocation(store.getState())?.form.extractedScopes ?? []
    expect(ex).toHaveLength(1)
    expect(ex[0].isActualTime).toBe(false)
    expect(ex[0].startDateTime).toBe('2025-03-08 23:50:00') // 23:45:00 + 5:30 → floor 5min
    expect(ex[0].endDateTime).toBe('2025-03-09 01:40:00') // 01:30:00 + 5:30 → ceil 5min
  })

  it('handles a DVR-behind offset (subtracts for actual→DVR)', () => {
    const store = freshStore()
    const c = store.getState().createCase(newCaseInput())
    store.getState().addLocation(c, newLocationInput())
    store.getState().updateField('form.scopes', [scope()])
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 11:55:00') // DVR behind 5:00
    store.getState().updateField('capture.actualDateTime', '2025-03-08 12:00:00')
    store.getState().calculateOffset()
    store.getState().generateExtractedScopes()
    const ex = selectCurrentLocation(store.getState())?.form.extractedScopes ?? []
    expect(ex).toHaveLength(1)
    expect(ex[0].startDateTime).toBe('2025-03-08 23:40:00')
    expect(ex[0].endDateTime).toBe('2025-03-09 01:25:00')
  })

  it('is a no-op when there is no offset yet', () => {
    const store = freshStore()
    const c = store.getState().createCase(newCaseInput())
    store.getState().addLocation(c, newLocationInput())
    store.getState().updateField('form.scopes', [scope()])
    store.getState().generateExtractedScopes()
    expect(selectCurrentLocation(store.getState())?.form.extractedScopes).toHaveLength(0)
    // early-return guard, not the per-scope catch: nothing was dropped (non-vacuous)
    expect(selectCurrentLocation(store.getState())?.form.extractedScopesPartial).toBe(false)
  })
})

describe('reconcileNotes (smoke — full flow coverage in notes-actions.test.ts)', () => {
  it('fills all seven registry sections; the address section covers the location', () => {
    const store = freshStore()
    const c = store.getState().createCase(newCaseInput({ caseNumber: 'PR25-0098213' }))
    store.getState().addLocation(c, newLocationInput())
    store.getState().updateField('form.scopes', [scope()])
    store.getState().reconcileNotes()
    const sections = selectCurrentLocation(store.getState())?.form.notesSections ?? []
    expect(sections).toHaveLength(7)
    expect(sections.find((s) => s.id === 'address')?.content).toContain("Kim's Convenience")
  })
})

describe('launch / closeLaunch', () => {
  it('launch("ocr") sets view to ocr and closeLaunch restores the prior screen', () => {
    const store = freshStore()
    store.getState().setView('timeOffset')
    store.getState().launch('ocr')
    expect(store.getState().view).toBe('ocr')
    store.getState().closeLaunch()
    expect(store.getState().view).toBe('timeOffset')
  })

  it('launching again from a launch screen returns to the current chapter', () => {
    const store = freshStore()
    store.getState().setView('timeOffset')
    store.getState().launch('ocr')
    store.getState().launch('mediaCapture') // still launch-only; currentChapter unchanged
    store.getState().closeLaunch()
    expect(store.getState().view).toBe('timeOffset')
  })

  it('setView updates currentChapter; launch/closeLaunch leave it intact', () => {
    const store = freshStore()
    store.getState().setView('timeOffset')
    expect(store.getState().currentChapter).toBe('timeOffset')
    store.getState().launch('ocr')
    expect(store.getState().view).toBe('ocr')
    expect(store.getState().currentChapter).toBe('timeOffset') // a launch never moves the chapter
    store.getState().closeLaunch()
    expect(store.getState().view).toBe('timeOffset') // restored to currentChapter
  })
})

describe('setView — tab-only views', () => {
  it('leaves currentChapter alone for EVERY tab-only destination, present and future', () => {
    // The guard asks the CHAPTERS registry rather than excluding the tab views it knows about
    // by name: the old negative check (`v !== 'map' && !LAUNCHABLE.includes(v)`) silently
    // promoted each newly added tab to `currentChapter` — which is what `closeLaunch()`
    // returns to and what the rail's chapter narration is keyed by.
    for (const tabOnly of TAB_VIEWS.filter((v) => !(CHAPTERS as readonly string[]).includes(v))) {
      const store = freshStore()
      store.getState().setView('cases')
      store.getState().setView(tabOnly)
      expect(store.getState().view).toBe(tabOnly)
      expect(store.getState().currentChapter, `setView("${tabOnly}") moved the chapter`).toBe('cases')
      // …and it is still recorded as visited, like any other destination.
      expect(store.getState().visited[tabOnly]).toBe(true)
    }
  })

  it('setView("map") sets the view but leaves currentChapter unchanged (map is not a chapter)', () => {
    const store = freshStore()
    store.getState().setView('cases')
    store.getState().setView('map')
    expect(store.getState().view).toBe('map')
    expect(store.getState().currentChapter).toBe('cases')
  })

  it('a chapter setView after the map still updates currentChapter', () => {
    const store = freshStore()
    store.getState().setView('map')
    store.getState().setView('submission')
    expect(store.getState().currentChapter).toBe('submission')
  })
})
