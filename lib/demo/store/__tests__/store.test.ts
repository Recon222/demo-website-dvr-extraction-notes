import { describe, it, expect } from 'vitest'
import { freshStore, seededStore, newCaseInput, newLocationInput } from './test-utils'
import { selectCurrentLocation } from '@/lib/demo/store/selectors'
import type { ScopeEntry } from '@/lib/demo/types'

const scope = (o: Partial<ScopeEntry> = {}): ScopeEntry => ({
  id: 's1',
  startDateTime: '2025-03-08 23:45:00',
  endDateTime: '2025-03-09 01:30:00',
  isActualTime: true,
  cameras: '3, 4, 7',
  ...o,
})

describe('seedGuided / reset', () => {
  it('seedGuided loads the seed case+location flagged isSeed and selects them', () => {
    const s = seededStore().getState()
    expect(s.cases.some((c) => c.id === 'seed-case' && c.isSeed)).toBe(true)
    expect(s.locations.some((l) => l.id === 'seed-loc' && l.isSeed)).toBe(true)
    expect(s.currentCaseId).toBe('seed-case')
    expect(s.currentLocationId).toBe('seed-loc')
  })

  it('reset removes all isSeed records and clears the current ids', () => {
    const store = seededStore()
    store.getState().reset()
    const s = store.getState()
    expect(s.cases.filter((c) => c.isSeed)).toHaveLength(0)
    expect(s.locations.filter((l) => l.isSeed)).toHaveLength(0)
    expect(s.currentCaseId).toBeNull()
    expect(s.currentLocationId).toBeNull()
  })

  it('after reset, createCase yields a case with isSeed:false', () => {
    const store = seededStore()
    store.getState().reset()
    const id = store.getState().createCase(newCaseInput())
    expect(store.getState().cases.find((c) => c.id === id)?.isSeed).toBe(false)
  })

  it('reset keeps visitor-created (non-seed) records and only drops the seed', () => {
    const store = seededStore() // seed-case + seed-loc loaded
    const userCase = store.getState().createCase(newCaseInput({ caseNumber: 'USER-1' }))
    const userLoc = store.getState().addLocation(userCase, newLocationInput())
    store.getState().reset()
    const s = store.getState()
    expect(s.cases.some((c) => c.id === userCase)).toBe(true) // visitor data survives
    expect(s.locations.some((l) => l.id === userLoc)).toBe(true)
    expect(s.cases.some((c) => c.isSeed)).toBe(false) // seed gone
    expect(s.locations.some((l) => l.isSeed)).toBe(false)
  })

  it('reset switches to sandbox mode on the cases view', () => {
    const store = seededStore()
    store.getState().reset()
    expect(store.getState().mode).toBe('sandbox')
    expect(store.getState().view).toBe('cases')
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

describe('generateNotes', () => {
  it('assembles notes text containing the occurrence number and a scope line', () => {
    const store = freshStore()
    const c = store.getState().createCase(newCaseInput({ caseNumber: 'PR25-0098213' }))
    store.getState().addLocation(c, newLocationInput())
    store.getState().updateField('form.scopes', [scope()])
    store.getState().generateNotes()
    const notes = selectCurrentLocation(store.getState())?.form.notesText ?? ''
    expect(notes).toContain('PR25-0098213')
    expect(notes.toLowerCase()).toContain('scope')
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

  it('launching again from a launch screen preserves the original return view', () => {
    const store = freshStore()
    store.getState().setView('timeOffset')
    store.getState().launch('ocr') // returnView = timeOffset
    store.getState().launch('mediaCapture') // already on a launchable → returnView preserved
    store.getState().closeLaunch()
    expect(store.getState().view).toBe('timeOffset')
  })
})
