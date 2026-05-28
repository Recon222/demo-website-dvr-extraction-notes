import { describe, it, expect } from 'vitest'
import { normalizeEmail, isValidEmail } from '@/lib/beta/validation'

describe('normalizeEmail', () => {
  it('trims surrounding whitespace and lowercases', () => {
    expect(normalizeEmail('  Kris@Example.COM ')).toBe('kris@example.com')
  })
})

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('kris@example.com')).toBe(true)
  })

  it('accepts an address with mixed case and surrounding spaces', () => {
    expect(isValidEmail('  Kris@Example.com ')).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['no @', 'krisexample.com'],
    ['no domain', 'kris@'],
    ['no tld', 'kris@example'],
    ['internal space', 'kr is@example.com'],
    ['double @', 'kris@@example.com'],
  ])('rejects an invalid address (%s)', (_label, value) => {
    expect(isValidEmail(value)).toBe(false)
  })

  it('rejects an address longer than 254 characters', () => {
    const local = 'a'.repeat(250)
    expect(isValidEmail(`${local}@example.com`)).toBe(false)
  })
})
