import { describe, it, expect } from 'vitest'
import { createSignup } from '@/lib/beta/signup-service'
import { createMemoryWaitlistStore } from '@/lib/beta/memory-store'

const FIXED_NOW = '2026-05-28T12:00:00.000Z'

function deps() {
  const store = createMemoryWaitlistStore()
  return { store, now: () => FIXED_NOW }
}

describe('createSignup', () => {
  it('stores a valid, consented signup with a normalized email', async () => {
    const d = deps()
    const result = await createSignup(
      { email: '  Kris@Example.COM ', consent: true },
      d,
    )

    expect(result).toEqual({ ok: true, deduped: false })
    expect(d.store.records).toEqual([
      { email: 'kris@example.com', consent: true, source: 'website', createdAt: FIXED_NOW },
    ])
  })

  it('passes through a provided source', async () => {
    const d = deps()
    await createSignup({ email: 'a@b.com', consent: true, source: 'conference' }, d)
    expect(d.store.records[0].source).toBe('conference')
  })

  it('rejects when the honeypot field is filled, without storing', async () => {
    const d = deps()
    const result = await createSignup(
      { email: 'bot@spam.com', consent: true, company: 'definitely a bot' },
      d,
    )

    expect(result).toEqual({ ok: false, error: 'spam_detected' })
    expect(d.store.records).toHaveLength(0)
  })

  it('rejects an invalid email', async () => {
    const d = deps()
    const result = await createSignup({ email: 'not-an-email', consent: true }, d)
    expect(result).toEqual({ ok: false, error: 'invalid_email' })
    expect(d.store.records).toHaveLength(0)
  })

  it('rejects when consent is not given', async () => {
    const d = deps()
    const result = await createSignup({ email: 'a@b.com', consent: false }, d)
    expect(result).toEqual({ ok: false, error: 'consent_required' })
    expect(d.store.records).toHaveLength(0)
  })

  it('treats a duplicate email (case-insensitively) as deduped, not a second write', async () => {
    const d = deps()
    await createSignup({ email: 'dupe@example.com', consent: true }, d)
    const result = await createSignup({ email: 'DUPE@example.com', consent: true }, d)

    expect(result).toEqual({ ok: true, deduped: true })
    expect(d.store.records).toHaveLength(1)
  })

  it('returns a store_error when the store throws', async () => {
    const failingDeps = {
      now: () => FIXED_NOW,
      store: {
        has: async () => false,
        add: async () => {
          throw new Error('boom')
        },
      },
    }
    const result = await createSignup({ email: 'a@b.com', consent: true }, failingDeps)
    expect(result).toEqual({ ok: false, error: 'store_error' })
  })
})
