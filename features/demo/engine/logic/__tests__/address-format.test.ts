import { describe, it, expect } from 'vitest'

import { abbreviateStreetTypes, formatAddress } from '@/features/demo/engine/logic/address-format'

describe('abbreviateStreetTypes', () => {
  // The whole abbreviation table, pinned entry by entry — the phone's map is the contract
  // (phone src/lib/utils/address-formatting.ts:20-34); a dropped or renamed row is a
  // silent output change in the PDF header, the notes body and every list row at once.
  const TABLE: ReadonlyArray<readonly [string, string]> = [
    ['Boulevard', 'Blvd'],
    ['Avenue', 'Ave'],
    ['Drive', 'Dr'],
    ['Street', 'St'],
    ['Road', 'Rd'],
    ['Court', 'Ct'],
    ['Crescent', 'Cres'],
    ['Lane', 'Ln'],
    ['Place', 'Pl'],
    ['Highway', 'Hwy'],
    ['Terrace', 'Ter'],
    ['Circle', 'Cir'],
    ['Parkway', 'Pkwy'],
  ]

  it.each(TABLE)('abbreviates %s to %s', (full, abbreviated) => {
    expect(abbreviateStreetTypes(`123 Oak ${full}`)).toBe(`123 Oak ${abbreviated}`)
  })

  it('matches case-insensitively and emits the canonical capitalisation', () => {
    expect(abbreviateStreetTypes('348 Langford BOULEVARD')).toBe('348 Langford Blvd')
    // Only the MATCHED word is rewritten — the rest of the string keeps the caller's casing.
    expect(abbreviateStreetTypes('348 langford boulevard')).toBe('348 langford Blvd')
  })

  it('leaves already-abbreviated forms alone (the transform is idempotent)', () => {
    expect(abbreviateStreetTypes('456 Oak Ave')).toBe('456 Oak Ave')
    const once = abbreviateStreetTypes('456 Oak Avenue')
    expect(abbreviateStreetTypes(once)).toBe(once)
  })

  it('leaves unlisted words alone', () => {
    expect(abbreviateStreetTypes('12 Rue Sainte-Catherine Ouest')).toBe('12 Rue Sainte-Catherine Ouest')
  })

  it('preserves digits, punctuation and repeated whitespace exactly', () => {
    expect(abbreviateStreetTypes('  1-405  Belsize   Drive, Unit 2B. ')).toBe(
      '  1-405  Belsize   Dr, Unit 2B. ',
    )
  })

  it('abbreviates every matching word, not just the last', () => {
    // Hyphens split letter runs, so both halves are matched independently.
    expect(abbreviateStreetTypes('Lane End Road')).toBe('Ln End Rd')
  })

  it('returns "" for empty, null and undefined', () => {
    expect(abbreviateStreetTypes('')).toBe('')
    expect(abbreviateStreetTypes(null)).toBe('')
    expect(abbreviateStreetTypes(undefined)).toBe('')
  })
})

describe('formatAddress', () => {
  it('joins business, street and city with ", " in that order', () => {
    expect(formatAddress('ABC Store', '123 Main St', 'Springfield')).toBe('ABC Store, 123 Main St, Springfield')
  })

  it('abbreviates the street component only', () => {
    // "Lane Bryant" must survive intact even though "lane" is in the table — the business
    // name and the city are never passed through abbreviateStreetTypes.
    expect(formatAddress('Lane Bryant', '9 Sunset Boulevard', 'Circle Junction')).toBe(
      'Lane Bryant, 9 Sunset Blvd, Circle Junction',
    )
  })

  it('drops empty and whitespace-only components', () => {
    expect(formatAddress('', '123 Main Street', 'Springfield')).toBe('123 Main St, Springfield')
    expect(formatAddress('   ', '123 Main Street', '')).toBe('123 Main St')
    expect(formatAddress('', '', 'Springfield')).toBe('Springfield')
  })

  it('trims surrounding whitespace on every component', () => {
    expect(formatAddress('  ABC  ', '  123 Main Street  ', '  Springfield  ')).toBe(
      'ABC, 123 Main St, Springfield',
    )
  })

  it('returns "" when nothing is supplied', () => {
    expect(formatAddress('', '', '')).toBe('')
    expect(formatAddress(null, undefined, null)).toBe('')
  })
})
