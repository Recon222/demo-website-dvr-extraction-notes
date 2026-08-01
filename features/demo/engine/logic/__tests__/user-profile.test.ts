import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  DEFAULT_USER_PROFILE,
  computeCareerDuration,
  hasProfileName,
  hasProfileText,
  trimProfile,
} from '@/features/demo/engine/logic/user-profile'
import type { UserProfile } from '@/features/demo/engine/types'

/**
 * The profile's pure half (P7.2).
 *
 * The duration table is the phone's OWN test file ported case for case
 * (`src/features/settings/user-profile/__tests__/compute-duration.test.ts`) — same anchor date
 * (2024-07-15), same inputs, same expected strings. Two implementations of one displayed value
 * only stay in step if they answer the same questions identically, and this is the cheapest
 * place to prove that.
 */

/** The injected clock, pinned to the phone suite's own "today". */
const at = (iso: string) => () => new Date(iso)
const NOW = at('2024-07-15T12:00:00')

const profile = (o: Partial<UserProfile> = {}): UserProfile => ({ ...DEFAULT_USER_PROFILE, ...o })

afterEach(() => vi.restoreAllMocks())

describe('DEFAULT_USER_PROFILE', () => {
  it('is seven empty strings — and carries no agencyLogoUri (matrix row 86)', () => {
    expect(DEFAULT_USER_PROFILE).toEqual({
      name: '',
      badgeNumber: '',
      timeInFieldStart: '',
      timeAtAgencyStart: '',
      currentAgency: '',
      unitName: '',
      qualifications: '',
    })
    expect(Object.keys(DEFAULT_USER_PROFILE)).toHaveLength(7)
    expect('agencyLogoUri' in DEFAULT_USER_PROFILE).toBe(false)
  })

  it('is frozen — it is only ever spread, never mutated into', () => {
    expect(Object.isFrozen(DEFAULT_USER_PROFILE)).toBe(true)
  })
})

describe('hasProfileText / hasProfileName', () => {
  it('counts non-whitespace content only', () => {
    expect(hasProfileText('')).toBe(false)
    expect(hasProfileText('   ')).toBe(false)
    expect(hasProfileText('\n\t')).toBe(false)
    expect(hasProfileText(' K ')).toBe(true)
  })

  it('discriminates on the NAME alone, whatever else is filled in', () => {
    expect(hasProfileName(DEFAULT_USER_PROFILE)).toBe(false)
    // The phone's rule: a badge, an agency and a unit with no name is still unconfigured.
    expect(hasProfileName(profile({ badgeNumber: '4471', currentAgency: 'PRP', unitName: 'FVU' }))).toBe(false)
    expect(hasProfileName(profile({ name: '  ' }))).toBe(false)
    expect(hasProfileName(profile({ name: 'K. Vasilyev' }))).toBe(true)
  })
})

describe('trimProfile (what Save commits)', () => {
  it('trims every free-text field and leaves the two dates byte-identical', () => {
    expect(
      trimProfile({
        name: '  K. Vasilyev  ',
        badgeNumber: ' 4471 ',
        timeInFieldStart: '2016-03-01 00:00:00',
        timeAtAgencyStart: '2019-11-04 00:00:00',
        currentAgency: '  Peel Regional Police ',
        unitName: ' Forensic Video Unit ',
        qualifications: '  Adobe certified\n ',
      }),
    ).toEqual({
      name: 'K. Vasilyev',
      badgeNumber: '4471',
      timeInFieldStart: '2016-03-01 00:00:00',
      timeAtAgencyStart: '2019-11-04 00:00:00',
      currentAgency: 'Peel Regional Police',
      unitName: 'Forensic Video Unit',
      qualifications: 'Adobe certified',
    })
  })

  it('turns a whitespace-only name into the unconfigured state, not a phantom profile', () => {
    expect(hasProfileName(trimProfile(profile({ name: '   ' })))).toBe(false)
  })
})

describe('computeCareerDuration — multi-year (phone suite, ported)', () => {
  it.each([
    ['2023-01-15 00:00:00', '1 year, 6 months'],
    ['2022-07-15 00:00:00', '2 years'],
    ['2019-04-15 00:00:00', '5 years, 3 months'],
    ['2014-07-15 00:00:00', '10 years'],
    ['2021-07-15 00:00:00', '3 years'],
    ['2023-07-15 00:00:00', '1 year'],
    ['2022-06-15 00:00:00', '2 years, 1 month'],
  ])('%s → %s', (start, expected) => {
    expect(computeCareerDuration(start, NOW)).toBe(expected)
  })
})

describe('computeCareerDuration — under a year', () => {
  it.each([
    ['2024-04-15 00:00:00', '3 months'],
    ['2024-06-15 00:00:00', '1 month'],
    ['2023-08-15 00:00:00', '11 months'],
  ])('%s → %s', (start, expected) => {
    expect(computeCareerDuration(start, NOW)).toBe(expected)
  })
})

describe('computeCareerDuration — the same-month tie', () => {
  it('reads "Less than 1 month" earlier in the current month', () => {
    expect(computeCareerDuration('2024-07-01 00:00:00', NOW)).toBe('Less than 1 month')
  })

  it('reads "Less than 1 month" earlier TODAY', () => {
    expect(computeCareerDuration('2024-07-15 00:00:00', NOW)).toBe('Less than 1 month')
  })

  it('breaks the tie on the clock, not just the date — a start later today is still the future', () => {
    expect(computeCareerDuration('2024-07-15 18:30:00', NOW)).toBeNull()
  })
})

describe('computeCareerDuration — nothing to show', () => {
  it.each([
    ['a month in the future', '2024-08-15 00:00:00'],
    ['a year in the future', '2025-01-15 00:00:00'],
    ['a later day this month', '2024-07-20 00:00:00'],
    ['unset', ''],
  ])('%s → null', (_label, start) => {
    expect(computeCareerDuration(start, NOW)).toBeNull()
  })

  it('an unset date asks the clock nothing at all', () => {
    const now = vi.fn(() => new Date('2024-07-15T12:00:00'))
    expect(computeCareerDuration('', now)).toBeNull()
    expect(now).not.toHaveBeenCalled()
  })

  it.each([
    ['malformed', 'not-a-date'],
    ['out of range', '2024-13-45 00:00:00'],
    ['date only, no time', '2024-01-15'],
  ])('%s → null (parse refuses; the dev breadcrumb still fires)', (_label, start) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(computeCareerDuration(start, NOW)).toBeNull()
    expect(warn).toHaveBeenCalled()
  })

  it('accepts the ISO "T" separator the phone stores, not only the canonical space form', () => {
    expect(computeCareerDuration('2023-01-15T00:00:00', NOW)).toBe('1 year, 6 months')
  })
})

describe('computeCareerDuration — calendar-month arithmetic (phone parity, not elapsed time)', () => {
  it('counts the month boundary, not 30 days: the 31st → the 1st is one month', () => {
    expect(computeCareerDuration('2024-05-31 00:00:00', at('2024-06-01T00:00:00'))).toBe('1 month')
  })

  it('reads the clock through the injected seam, never an ambient Date', () => {
    const now = vi.fn(() => new Date('2030-07-15T12:00:00'))
    expect(computeCareerDuration('2024-07-15 00:00:00', now)).toBe('6 years')
    expect(now).toHaveBeenCalled()
  })
})
