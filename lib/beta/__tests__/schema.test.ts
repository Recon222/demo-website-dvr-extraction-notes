import { describe, it, expect } from 'vitest'
import { betaSignupSchema } from '@/lib/beta/schema'

describe('betaSignupSchema', () => {
  it('accepts a valid email + consent:true + empty honeypot', () => {
    const result = betaSignupSchema.safeParse({
      email: 'analyst@agency.gov',
      consent: true,
      website: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a malformed email', () => {
    expect(
      betaSignupSchema.safeParse({ email: 'not-an-email', consent: true, website: '' }).success,
    ).toBe(false)
  })

  it('rejects consent !== true (the checkbox must be checked)', () => {
    expect(
      betaSignupSchema.safeParse({ email: 'a@b.gov', consent: false, website: '' }).success,
    ).toBe(false)
  })

  it('rejects a filled honeypot (bot signal)', () => {
    expect(
      betaSignupSchema.safeParse({ email: 'a@b.gov', consent: true, website: 'http://spam' })
        .success,
    ).toBe(false)
  })

  it('normalises the email: trims and lowercases', () => {
    const result = betaSignupSchema.safeParse({
      email: '  Analyst@Agency.GOV ',
      consent: true,
      website: '',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('analyst@agency.gov')
    }
  })
})
