import { describe, it, expect } from 'vitest'
import {
  DuplicateCaseNumberError,
  assertCaseNumberFree,
  isCaseNumberTaken,
  normalizeCaseNumber,
} from '@/features/demo/engine/logic/case-number'

const cases = (...numbers: string[]) => numbers.map((caseNumber) => ({ caseNumber }))

describe('normalizeCaseNumber', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeCaseNumber('  PR25-1 ')).toBe('PR25-1')
  })

  it('preserves case — SQLite BINARY parity, NOT the location-name rule', () => {
    expect(normalizeCaseNumber('pr25-1')).toBe('pr25-1')
  })
})

describe('isCaseNumberTaken', () => {
  it('is false against an empty library', () => {
    expect(isCaseNumberTaken([], 'PR25-1')).toBe(false)
  })

  it('matches an existing number exactly', () => {
    expect(isCaseNumberTaken(cases('PR25-1', 'PR25-2'), 'PR25-2')).toBe(true)
  })

  it('matches across surrounding whitespace on either side', () => {
    expect(isCaseNumberTaken(cases('PR25-1'), '  PR25-1  ')).toBe(true)
    expect(isCaseNumberTaken(cases(' PR25-1 '), 'PR25-1')).toBe(true)
  })

  it('does NOT match a different case fold (the phone declares no COLLATE NOCASE)', () => {
    expect(isCaseNumberTaken(cases('PR25-1'), 'pr25-1')).toBe(false)
  })

  it('does not match a mere substring', () => {
    expect(isCaseNumberTaken(cases('PR25-100'), 'PR25-1')).toBe(false)
  })
})

describe('assertCaseNumberFree', () => {
  it('returns silently when the number is free', () => {
    expect(() => assertCaseNumberFree(cases('PR25-1'), 'PR25-2')).not.toThrow()
  })

  it('throws DuplicateCaseNumberError with the phone message verbatim', () => {
    expect(() => assertCaseNumberFree(cases('PR25-1'), 'PR25-1')).toThrow(DuplicateCaseNumberError)
    expect(() => assertCaseNumberFree(cases('PR25-1'), 'PR25-1')).toThrow(
      'A case with number "PR25-1" already exists',
    )
  })

  it('reports the TRIMMED number, so the banner quotes what would have been saved', () => {
    try {
      assertCaseNumberFree(cases('PR25-1'), '  PR25-1  ')
      expect.unreachable('expected a DuplicateCaseNumberError')
    } catch (err) {
      expect(err).toBeInstanceOf(DuplicateCaseNumberError)
      expect((err as DuplicateCaseNumberError).caseNumber).toBe('PR25-1')
      expect((err as DuplicateCaseNumberError).name).toBe('DuplicateCaseNumberError')
    }
  })

  it('treats two blank numbers as a collision (no special case — the modal gate handles blanks)', () => {
    expect(() => assertCaseNumberFree(cases(''), '   ')).toThrow(DuplicateCaseNumberError)
  })
})
