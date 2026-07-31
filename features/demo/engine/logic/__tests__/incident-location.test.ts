import { describe, it, expect } from 'vitest'
import {
  caseToIncidentValues,
  incidentValuesToPatch,
  type IncidentLocationValues,
} from '@/features/demo/engine/logic/incident-location'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import type { DemoCase } from '@/features/demo/engine/types'

function makeCase(o: Partial<DemoCase> = {}): DemoCase {
  return {
    id: 'c1',
    caseNumber: 'PR25-1',
    displayName: 'Kim B&E',
    unit: 'Central Robbery',
    oicName: 'Liam McHugh',
    oicBadge: '4471',
    vcName: 'Ana Ruiz',
    vcBadge: '2210',
    incidentBusinessName: 'Kim Convenience',
    incidentStreetAddress: '1450 Eglinton Ave W',
    incidentCity: 'Mississauga',
    incidentCoordinates: { lat: 43.5, lng: -79.5, source: 'geocoded' },
    notes: 'Case notes',
    status: 'draft',
    createdLabel: 'Just now',
    locationIds: [],
    ...o,
  }
}

const blank: IncidentLocationValues = {
  businessName: '',
  streetAddress: '',
  city: '',
  latitude: '',
  longitude: '',
  coordinateSource: '',
}

describe('caseToIncidentValues', () => {
  it('seeds every incident field, stringifying the stored coordinate pair', () => {
    expect(caseToIncidentValues(makeCase())).toEqual({
      businessName: 'Kim Convenience',
      streetAddress: '1450 Eglinton Ave W',
      city: 'Mississauga',
      latitude: '43.5',
      longitude: '-79.5',
      coordinateSource: 'geocoded',
    })
  })

  it('yields empty coordinate strings and no source when the case has no coordinates', () => {
    const v = caseToIncidentValues(makeCase({ incidentCoordinates: undefined }))
    expect(v.latitude).toBe('')
    expect(v.longitude).toBe('')
    expect(v.coordinateSource).toBe('')
  })

  it('round-trips a manual pair without drifting precision', () => {
    const c = makeCase({ incidentCoordinates: { lat: 43.608701, lng: -79.650502, source: 'manual' } })
    const patch = incidentValuesToPatch(caseToIncidentValues(c))
    expect(patch.incidentCoordinates).toEqual({ lat: 43.608701, lng: -79.650502, source: 'manual' })
  })
})

describe('incidentValuesToPatch', () => {
  it('trims the text fields', () => {
    const patch = incidentValuesToPatch({ ...blank, businessName: '  Kim  ', streetAddress: ' 1450 Eglinton ', city: ' Mississauga ' })
    expect(patch.incidentBusinessName).toBe('Kim')
    expect(patch.incidentStreetAddress).toBe('1450 Eglinton')
    expect(patch.incidentCity).toBe('Mississauga')
  })

  it('builds coordinates only when BOTH values parse in range', () => {
    expect(incidentValuesToPatch({ ...blank, latitude: '43.5', longitude: '' }).incidentCoordinates).toBeUndefined()
    expect(incidentValuesToPatch({ ...blank, latitude: '', longitude: '-79.5' }).incidentCoordinates).toBeUndefined()
    expect(incidentValuesToPatch({ ...blank, latitude: '43.5', longitude: '-79.5' }).incidentCoordinates).toEqual({
      lat: 43.5,
      lng: -79.5,
      source: 'manual',
    })
  })

  it('rejects out-of-range and partially-numeric input rather than truncating it', () => {
    // parseFloat('43.6abc') === 43.6 — the forensic-precision trap parseCoordinate exists to close.
    expect(incidentValuesToPatch({ ...blank, latitude: '43.6abc', longitude: '-79.5' }).incidentCoordinates).toBeUndefined()
    expect(incidentValuesToPatch({ ...blank, latitude: '91', longitude: '-79.5' }).incidentCoordinates).toBeUndefined()
    expect(incidentValuesToPatch({ ...blank, latitude: '43.5', longitude: '-181' }).incidentCoordinates).toBeUndefined()
  })

  it('keeps a geocoded stamp, and coerces anything else to manual', () => {
    expect(incidentValuesToPatch({ ...blank, latitude: '1', longitude: '2', coordinateSource: 'geocoded' }).incidentCoordinates?.source).toBe('geocoded')
    expect(incidentValuesToPatch({ ...blank, latitude: '1', longitude: '2', coordinateSource: 'manual' }).incidentCoordinates?.source).toBe('manual')
    expect(incidentValuesToPatch({ ...blank, latitude: '1', longitude: '2', coordinateSource: '' }).incidentCoordinates?.source).toBe('manual')
  })

  it('emits exactly the four incident keys — nothing that could clobber the rest of the case', () => {
    expect(Object.keys(incidentValuesToPatch(blank)).sort()).toEqual([
      'incidentBusinessName',
      'incidentCity',
      'incidentCoordinates',
      'incidentStreetAddress',
    ])
  })
})

describe('store.updateIncidentLocation', () => {
  it('writes the incident fields and leaves the rest of the case untouched', () => {
    const store = createDemoStore()
    const id = store.getState().createCase({
      caseNumber: 'PR25-1',
      displayName: 'Kim B&E',
      unit: 'Central Robbery',
      oicName: 'Liam McHugh',
      notes: 'do not touch',
      incidentBusinessName: 'Old name',
      incidentCoordinates: { lat: 1, lng: 2, source: 'manual' },
    })
    store.getState().updateIncidentLocation(id, {
      incidentBusinessName: 'Kim Convenience',
      incidentStreetAddress: '1450 Eglinton Ave W',
      incidentCity: 'Mississauga',
      incidentCoordinates: { lat: 43.5, lng: -79.5, source: 'geocoded' },
    })
    const c = store.getState().cases.find((x) => x.id === id)!
    expect(c.incidentBusinessName).toBe('Kim Convenience')
    expect(c.incidentStreetAddress).toBe('1450 Eglinton Ave W')
    expect(c.incidentCity).toBe('Mississauga')
    expect(c.incidentCoordinates).toEqual({ lat: 43.5, lng: -79.5, source: 'geocoded' })
    expect(c.caseNumber).toBe('PR25-1')
    expect(c.oicName).toBe('Liam McHugh')
    expect(c.notes).toBe('do not touch')
    expect(c.status).toBe('draft')
  })

  it('clears the stored pair when the patch carries no coordinates', () => {
    const store = createDemoStore()
    const id = store.getState().createCase({ caseNumber: 'PR25-1', displayName: 'A', unit: 'R', incidentCoordinates: { lat: 1, lng: 2, source: 'manual' } })
    store.getState().updateIncidentLocation(id, incidentValuesToPatch(blank))
    expect(store.getState().cases.find((x) => x.id === id)!.incidentCoordinates).toBeUndefined()
  })

  it('touches only the named case, and no-ops on an unknown id', () => {
    const store = createDemoStore()
    const a = store.getState().createCase({ caseNumber: 'PR25-A', displayName: 'A', unit: 'R' })
    const b = store.getState().createCase({ caseNumber: 'PR25-B', displayName: 'B', unit: 'R' })
    store.getState().updateIncidentLocation(a, { incidentBusinessName: 'A scene', incidentStreetAddress: '', incidentCity: '', incidentCoordinates: undefined })
    store.getState().updateIncidentLocation('c-nope', { incidentBusinessName: 'ghost', incidentStreetAddress: '', incidentCity: '', incidentCoordinates: undefined })
    expect(store.getState().cases.find((x) => x.id === a)!.incidentBusinessName).toBe('A scene')
    expect(store.getState().cases.find((x) => x.id === b)!.incidentBusinessName).toBe('')
    expect(store.getState().cases.some((x) => x.incidentBusinessName === 'ghost')).toBe(false)
  })

  it('produces a new cases array, so the map projection recomputes (the reload-token analogue)', () => {
    const store = createDemoStore()
    const id = store.getState().createCase({ caseNumber: 'PR25-1', displayName: 'A', unit: 'R' })
    const before = store.getState().cases
    store.getState().updateIncidentLocation(id, incidentValuesToPatch({ ...blank, city: 'Mississauga' }))
    expect(store.getState().cases).not.toBe(before)
  })
})
