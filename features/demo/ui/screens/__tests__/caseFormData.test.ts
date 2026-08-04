import { describe, it, expect } from 'vitest'
import type { DemoCase } from '@/features/demo/engine/types'
import {
  blankCaseForm,
  caseFormToEdits,
  caseFormToInput,
  caseToCaseForm,
  type NewCaseFields,
} from '@/features/demo/ui/screens/caseFormData'
import { demoCase as sharedCase } from '@/features/demo/engine/store/__tests__/test-utils'

/**
 * P3.3 / matrix row 12 — the create/edit round trip. `caseToCaseForm` seeds the edit sheet;
 * `caseFormToInput` / `caseFormToEdits` write it back. They are inverses over everything the
 * form can express, and these tests are what catch a field that only one of them learns about.
 */

/** Delegates to the shared entity factory (R-21) — only the fields these round-trip
 *  assertions actually read are named here. */
function demoCase(over: Partial<DemoCase> = {}): DemoCase {
  return sharedCase({
    caseNumber: 'PR25-0098213',
    displayName: "Kim's Convenience — B&E",
    unit: 'Central Robbery',
    oicName: 'Det. Liam McHugh',
    oicBadge: '2015',
    vcName: 'M. Reyes',
    vcBadge: '4477',
    incidentBusinessName: "Kim's Convenience",
    incidentStreetAddress: '1450 Eglinton Ave W',
    incidentCity: 'Mississauga',
    incidentCoordinates: { lat: 43.6087, lng: -79.6505, source: 'geocoded' },
    notes: 'Rear camera covers the loading bay.',
    ...over,
  })
}

describe('caseToCaseForm', () => {
  it('seeds every editable field from the case', () => {
    const form = caseToCaseForm(demoCase())
    expect(form).toEqual({
      caseNumber: 'PR25-0098213',
      displayName: "Kim's Convenience — B&E",
      unit: 'Central Robbery',
      oicName: 'Det. Liam McHugh',
      oicBadge: '2015',
      vcName: 'M. Reyes',
      vcBadge: '4477',
      incidentBusinessName: "Kim's Convenience",
      incidentStreetAddress: '1450 Eglinton Ave W',
      incidentCity: 'Mississauga',
      incidentLatitude: '43.6087',
      incidentLongitude: '-79.6505',
      incidentCoordinateSource: 'geocoded',
      notes: 'Rear camera covers the loading bay.',
    })
  })

  it('leaves the coordinate fields blank when the case has none', () => {
    const form = caseToCaseForm(demoCase({ incidentCoordinates: undefined }))
    expect(form.incidentLatitude).toBe('')
    expect(form.incidentLongitude).toBe('')
    expect(form.incidentCoordinateSource).toBe('')
  })

  it('carries the stored source through, so a save-unchanged does not restamp geocoded as manual', () => {
    const form = caseToCaseForm(demoCase())
    expect(caseFormToEdits(form).incidentCoordinates).toEqual({
      lat: 43.6087,
      lng: -79.6505,
      source: 'geocoded',
    })
  })

  it('round-trips a case through the form back to the same edit payload', () => {
    const c = demoCase()
    const edits = caseFormToEdits(caseToCaseForm(c))
    expect(edits).toEqual({
      displayName: c.displayName,
      unit: c.unit,
      oicName: c.oicName,
      oicBadge: c.oicBadge,
      vcName: c.vcName,
      vcBadge: c.vcBadge,
      incidentBusinessName: c.incidentBusinessName,
      incidentStreetAddress: c.incidentStreetAddress,
      incidentCity: c.incidentCity,
      incidentCoordinates: c.incidentCoordinates,
      notes: c.notes,
    })
  })
})

describe('caseFormToInput', () => {
  const filled = (over: Partial<NewCaseFields> = {}): NewCaseFields => ({
    ...blankCaseForm,
    caseNumber: 'PR25-1',
    unit: 'Robbery',
    ...over,
  })

  it('trims every string field (phone handleSubmit parity)', () => {
    const input = caseFormToInput(
      filled({ caseNumber: '  PR25-1  ', displayName: ' Kim ', unit: ' Robbery ', oicName: ' L. McHugh ', notes: ' rear cam ' }),
    )
    expect(input.caseNumber).toBe('PR25-1')
    expect(input.displayName).toBe('Kim')
    expect(input.unit).toBe('Robbery')
    expect(input.oicName).toBe('L. McHugh')
    expect(input.notes).toBe('rear cam')
  })

  it('builds coordinates only when both values parse and are in range', () => {
    expect(caseFormToInput(filled({ incidentLatitude: '43.6087', incidentLongitude: '-79.6505' })).incidentCoordinates).toEqual({
      lat: 43.6087,
      lng: -79.6505,
      source: 'manual',
    })
    // half a pair
    expect(caseFormToInput(filled({ incidentLatitude: '43.6087' })).incidentCoordinates).toBeUndefined()
    // out of range
    expect(caseFormToInput(filled({ incidentLatitude: '95', incidentLongitude: '-79.6505' })).incidentCoordinates).toBeUndefined()
    // strict parse — parseFloat would truncate this to 43.6 (matrix B4)
    expect(caseFormToInput(filled({ incidentLatitude: '43.6abc', incidentLongitude: '-79.6505' })).incidentCoordinates).toBeUndefined()
  })

  it('stamps a hand-typed pair manual and an address-picked pair geocoded', () => {
    const coords = { incidentLatitude: '43.6087', incidentLongitude: '-79.6505' }
    expect(caseFormToInput(filled(coords)).incidentCoordinates?.source).toBe('manual')
    expect(caseFormToInput(filled({ ...coords, incidentCoordinateSource: 'geocoded' })).incidentCoordinates?.source).toBe('geocoded')
  })

  it('differs from caseFormToEdits only by the case number', () => {
    const form = filled({ displayName: 'Kim' })
    const { caseNumber, ...rest } = caseFormToInput(form)
    expect(caseNumber).toBe('PR25-1')
    expect(rest).toEqual(caseFormToEdits(form))
  })
})
