import { describe, it, expect, vi, afterEach } from 'vitest'
import { submitBetaSignup } from '@/lib/beta/submit-signup'

// The action is a validated STUB in this PR (persist = server log); the Firestore
// waitlist .set() lands in the follow-up swap PR — the BetaResult contract and
// these input-validation behaviors are final now. No mocks needed.
function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value)
  }
  return data
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('submitBetaSignup (stub persist)', () => {
  it('returns {ok:true} for a valid email + consent + empty honeypot', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const result = await submitBetaSignup(null, form({ email: 'a@agency.gov', consent: 'on' }))
    expect(result).toEqual({ ok: true })
  })

  it('returns {ok:false, error:"invalid"} on a bad email', async () => {
    const result = await submitBetaSignup(null, form({ email: 'nope', consent: 'on' }))
    expect(result).toEqual({ ok: false, error: 'invalid' })
  })

  it('returns {ok:false, error:"invalid"} when consent is unchecked', async () => {
    const result = await submitBetaSignup(null, form({ email: 'a@agency.gov' }))
    expect(result).toEqual({ ok: false, error: 'invalid' })
  })

  it('returns {ok:false, error:"invalid"} when the honeypot is filled', async () => {
    const result = await submitBetaSignup(
      null,
      form({ email: 'a@agency.gov', consent: 'on', website: 'http://spam' }),
    )
    expect(result).toEqual({ ok: false, error: 'invalid' })
  })

  it('normalises the email before persisting (lowercase/trim reaches the stub)', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    await submitBetaSignup(null, form({ email: '  Analyst@Agency.GOV ', consent: 'on' }))
    expect(info).toHaveBeenCalledWith('[beta] signup', 'analyst@agency.gov')
  })

  it('treats a re-submit of the same email as success (idempotent, no enumeration)', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const fields = { email: 'a@agency.gov', consent: 'on' }
    expect(await submitBetaSignup(null, form(fields))).toEqual({ ok: true })
    expect(await submitBetaSignup(null, form(fields))).toEqual({ ok: true })
  })
})
