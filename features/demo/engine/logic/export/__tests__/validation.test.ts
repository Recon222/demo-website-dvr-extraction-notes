import { describe, it, expect } from 'vitest'

import {
  CaseValidationError,
  PDF_VALIDATION_FIELDS,
  validateLocationForPdf,
  validateLocationSubsetForPdf,
  validateLocationsForPdf,
  type ValidatableLocation,
} from '@/features/demo/engine/logic/export/validation'
import type { DemoLocation } from '@/features/demo/engine/types'
import { blankLocationForm } from '@/features/demo/engine/content/seed'

const loc = (
  id: string,
  overrides: Partial<ValidatableLocation['form']> = {},
  locationName = `Location ${id}`,
): ValidatableLocation => ({
  id,
  locationName,
  form: {
    scopes: [{ startDateTime: '2026-03-01 08:00:00', endDateTime: '2026-03-01 09:00:00' }],
    dateTimeCompleted: '2026-03-01 12:00:00',
    completedBy: 'PC 1234 Reid',
    ...overrides,
  },
})

const CASE = { id: 'case-a', caseNumber: 'PR26-0001' }

describe('validateLocationForPdf — the phone\'s four rules', () => {
  it('passes a location with a case number, a bounded scope, and both completion fields', () => {
    expect(validateLocationForPdf(loc('l1'), 'PR26-0001')).toEqual({
      locationId: 'l1',
      locationName: 'Location l1',
      valid: true,
      errors: [],
    })
  })

  it('reports a blank case number — the rule reads the CASE, not the location', () => {
    const result = validateLocationForPdf(loc('l1'), '   ')
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(['Case number'])
  })

  it('reports a missing scope when there are none at all', () => {
    const result = validateLocationForPdf(loc('l1', { scopes: [] }), 'PR26-0001')
    expect(result.errors).toEqual(['At least one extraction scope with start and end times'])
  })

  it('requires BOTH bounds on the same scope — a half-filled row is not enough', () => {
    const halves = loc('l1', {
      scopes: [
        { startDateTime: '2026-03-01 08:00:00', endDateTime: '' },
        { startDateTime: '', endDateTime: '2026-03-01 09:00:00' },
      ],
    })
    expect(validateLocationForPdf(halves, 'PR26-0001').errors).toEqual([
      'At least one extraction scope with start and end times',
    ])
  })

  it('passes when ANY one scope is fully bounded', () => {
    const mixed = loc('l1', {
      scopes: [
        { startDateTime: '2026-03-01 08:00:00', endDateTime: '' },
        { startDateTime: '2026-03-01 10:00:00', endDateTime: '2026-03-01 11:00:00' },
      ],
    })
    expect(validateLocationForPdf(mixed, 'PR26-0001').valid).toBe(true)
  })

  it('treats whitespace-only bounds as unset', () => {
    const blankish = loc('l1', { scopes: [{ startDateTime: '  ', endDateTime: '\t' }] })
    expect(validateLocationForPdf(blankish, 'PR26-0001').valid).toBe(false)
  })

  it('reports the completion fields independently', () => {
    expect(validateLocationForPdf(loc('l1', { dateTimeCompleted: '' }), 'PR26-0001').errors).toEqual([
      'Completion date',
    ])
    expect(validateLocationForPdf(loc('l1', { completedBy: '  ' }), 'PR26-0001').errors).toEqual([
      'Completed by',
    ])
  })

  it('accumulates every failing rule in the phone\'s evaluation order', () => {
    const empty = loc('l1', { scopes: [], dateTimeCompleted: '', completedBy: '' })
    expect(validateLocationForPdf(empty, '').errors).toEqual([
      'Case number',
      'At least one extraction scope with start and end times',
      'Completion date',
      'Completed by',
    ])
  })

  it('emits FIELD NAMES, not sentences — the modal renders them as "- Missing: {error}"', () => {
    const empty = loc('l1', { scopes: [], dateTimeCompleted: '', completedBy: '' })
    for (const error of validateLocationForPdf(empty, '').errors) {
      expect(Object.values(PDF_VALIDATION_FIELDS)).toContain(error)
      expect(error).not.toMatch(/required|please/i)
    }
  })

  it('does NOT require cameras — the phone says so explicitly', () => {
    // A location with no cameras must still be PDF-valid; adding a fifth rule here would
    // block an export the phone allows.
    expect(validateLocationForPdf(loc('l1'), 'PR26-0001').valid).toBe(true)
  })

  it('accepts a real DemoLocation form — the store shape satisfies the reader structurally', () => {
    const form = blankLocationForm()
    form.scopes = [
      { id: 's1', startDateTime: '2026-03-01 08:00:00', endDateTime: '2026-03-01 09:00:00', isActualTime: true, cameras: '' },
    ]
    form.dateTimeCompleted = '2026-03-01 12:00:00'
    form.completedBy = 'PC 1234 Reid'
    const demoLocation: Pick<DemoLocation, 'id' | 'locationName' | 'form'> = {
      id: 'l1',
      locationName: 'Rear Door',
      form,
    }
    expect(validateLocationForPdf(demoLocation, 'PR26-0001').valid).toBe(true)
  })
})

describe('validateLocationsForPdf — the case aggregate', () => {
  it('splits valid from invalid and counts both', () => {
    const result = validateLocationsForPdf(CASE, [
      loc('l1'),
      loc('l2', { completedBy: '' }),
      loc('l3'),
    ])
    expect(result).toMatchObject({
      caseId: 'case-a',
      caseNumber: 'PR26-0001',
      allValid: false,
      totalLocations: 3,
      validCount: 2,
      invalidCount: 1,
    })
    expect(result.validLocations.map((v) => v.locationId)).toEqual(['l1', 'l3'])
    expect(result.invalidLocations.map((v) => v.locationId)).toEqual(['l2'])
  })

  it('reports allValid when every location passes', () => {
    const result = validateLocationsForPdf(CASE, [loc('l1'), loc('l2')])
    expect(result.allValid).toBe(true)
    expect(result.invalidLocations).toEqual([])
  })

  it('fails EVERY location when the case number is blank — the rule is case-level', () => {
    const result = validateLocationsForPdf({ id: 'case-a', caseNumber: '' }, [loc('l1'), loc('l2')])
    expect(result.invalidCount).toBe(2)
    expect(result.invalidLocations.every((v) => v.errors.includes('Case number'))).toBe(true)
  })

  it('returns an allValid, zero-count result for a case with no locations', () => {
    expect(validateLocationsForPdf(CASE, [])).toEqual({
      caseId: 'case-a',
      caseNumber: 'PR26-0001',
      validLocations: [],
      invalidLocations: [],
      allValid: true,
      totalLocations: 0,
      validCount: 0,
      invalidCount: 0,
    })
  })

  it('preserves input order inside each bucket', () => {
    const result = validateLocationsForPdf(CASE, [
      loc('l3', { completedBy: '' }),
      loc('l1', { completedBy: '' }),
      loc('l2', { completedBy: '' }),
    ])
    expect(result.invalidLocations.map((v) => v.locationId)).toEqual(['l3', 'l1', 'l2'])
  })
})

describe('validateLocationSubsetForPdf — K-scoped, fail-loud', () => {
  const LOCATIONS = [loc('l1'), loc('l2', { completedBy: '' }), loc('l3')]

  it('validates only the selected rows', () => {
    const result = validateLocationSubsetForPdf(CASE, LOCATIONS, ['l1', 'l3'])
    expect(result.totalLocations).toBe(2)
    expect(result.allValid).toBe(true)
  })

  it('scopes totalLocations to K, never to the case — N comes from the selection', () => {
    const result = validateLocationSubsetForPdf(CASE, LOCATIONS, ['l2'])
    expect(result.totalLocations).toBe(1)
    expect(result.invalidCount).toBe(1)
  })

  it('takes the subset in the CASE\'s order, not the selection\'s', () => {
    const result = validateLocationSubsetForPdf(CASE, LOCATIONS, ['l3', 'l1'])
    expect(result.validLocations.map((v) => v.locationId)).toEqual(['l1', 'l3'])
  })

  it('throws on an empty selection rather than validating nothing', () => {
    expect(() => validateLocationSubsetForPdf(CASE, LOCATIONS, [])).toThrow(CaseValidationError)
    expect(() => validateLocationSubsetForPdf(CASE, LOCATIONS, [])).toThrow(
      'No locations selected for subset export',
    )
  })

  it('throws — never silently drops — an id the case does not own', () => {
    // The worst failure mode this feature has: a selected location missing from an evidence
    // package with nothing said about it.
    expect(() => validateLocationSubsetForPdf(CASE, LOCATIONS, ['l1', 'ghost'])).toThrow(
      'Selected locations not found in case: ghost',
    )
  })

  it('names every foreign id in the message', () => {
    expect(() => validateLocationSubsetForPdf(CASE, LOCATIONS, ['ghost', 'phantom'])).toThrow(
      'Selected locations not found in case: ghost, phantom',
    )
  })

  it('throws a named error the caller can narrow on', () => {
    try {
      validateLocationSubsetForPdf(CASE, LOCATIONS, ['ghost'])
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(CaseValidationError)
      expect((error as CaseValidationError).name).toBe('CaseValidationError')
    }
  })
})
