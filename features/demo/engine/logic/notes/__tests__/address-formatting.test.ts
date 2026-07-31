import { describe, it, expect } from 'vitest'
import {
  abbreviateStreetTypes,
  formatAddress,
} from '@/features/demo/engine/logic/notes/address-formatting'

// Ported behavior contract: phone `src/lib/utils/address-formatting.ts` JSDoc examples.
describe('abbreviateStreetTypes', () => {
  it('abbreviates full-word street types (Canada-Post style, no trailing period)', () => {
    expect(abbreviateStreetTypes('348 Langford Boulevard')).toBe('348 Langford Blvd')
    expect(abbreviateStreetTypes('123 Main Street')).toBe('123 Main St')
    expect(abbreviateStreetTypes('1450 Eglinton Avenue West')).toBe('1450 Eglinton Ave West')
  })

  it('is idempotent — already-abbreviated forms pass through', () => {
    expect(abbreviateStreetTypes('456 Oak Ave')).toBe('456 Oak Ave')
    expect(abbreviateStreetTypes(abbreviateStreetTypes('348 Langford Boulevard'))).toBe('348 Langford Blvd')
  })

  it('matches case-insensitively and preserves digits/punctuation/whitespace exactly', () => {
    expect(abbreviateStreetTypes('9 kings HIGHWAY,  Unit 2')).toBe('9 kings Hwy,  Unit 2')
  })

  it('handles null/undefined/empty', () => {
    expect(abbreviateStreetTypes(null)).toBe('')
    expect(abbreviateStreetTypes(undefined)).toBe('')
    expect(abbreviateStreetTypes('')).toBe('')
  })
})

describe('formatAddress', () => {
  it('joins businessName, streetAddress (abbreviated), city with ", "', () => {
    expect(formatAddress('ABC Store', '123 Main Street', 'Springfield')).toBe(
      'ABC Store, 123 Main St, Springfield',
    )
  })

  it('drops empty/whitespace components', () => {
    expect(formatAddress('', '123 Main St', 'Springfield')).toBe('123 Main St, Springfield')
    expect(formatAddress('  ', '', 'Springfield')).toBe('Springfield')
    expect(formatAddress('', '', '')).toBe('')
  })

  it('abbreviates only the street portion — business and city stay untouched', () => {
    expect(formatAddress('Street Style Barbers', '10 Queen Street', 'Streetsville')).toBe(
      'Street Style Barbers, 10 Queen St, Streetsville',
    )
  })

  it('trims each component', () => {
    expect(formatAddress(' Kim’s ', ' 1450 Eglinton Ave W ', ' Mississauga ')).toBe(
      'Kim’s, 1450 Eglinton Ave W, Mississauga',
    )
  })
})
