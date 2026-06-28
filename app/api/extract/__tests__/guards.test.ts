import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isAllowedOrigin, isRateLimited, __resetRateLimit } from '@/app/api/extract/guards'

function req(headers: Record<string, string> = {}): Request {
  return { headers: new Headers(headers) } as unknown as Request
}

beforeEach(() => __resetRateLimit())
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('isAllowedOrigin', () => {
  it('allows a request with no Origin header (server tools / same-origin)', () => {
    expect(isAllowedOrigin(req())).toBe(true)
  })
  it('allows same-origin (origin host === host)', () => {
    expect(isAllowedOrigin(req({ origin: 'https://demo.app', host: 'demo.app' }))).toBe(true)
  })
  it('allows an explicitly allow-listed origin (N1)', () => {
    vi.stubEnv('ALLOWED_ORIGINS', 'https://partner.example, https://other.example')
    expect(isAllowedOrigin(req({ origin: 'https://partner.example', host: 'demo.app' }))).toBe(true)
  })
  it('rejects a cross-origin request', () => {
    expect(isAllowedOrigin(req({ origin: 'https://evil.example', host: 'demo.app' }))).toBe(false)
  })
  it('rejects a malformed Origin header (N3)', () => {
    expect(isAllowedOrigin(req({ origin: 'not-a-url', host: 'demo.app' }))).toBe(false)
  })
})

describe('isRateLimited', () => {
  it('permits up to the limit then blocks', () => {
    vi.stubEnv('RATE_LIMIT_MAX', '2')
    const r = req({ 'x-forwarded-for': '1.1.1.1' })
    expect(isRateLimited(r)).toBe(false) // n=1
    expect(isRateLimited(r)).toBe(false) // n=2
    expect(isRateLimited(r)).toBe(true) // n=3 > 2
  })

  it('resets the bucket after the window elapses (N2)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    vi.stubEnv('RATE_LIMIT_MAX', '1')
    vi.stubEnv('RATE_LIMIT_WINDOW_MS', '1000')
    const r = req({ 'x-forwarded-for': '2.2.2.2' })
    expect(isRateLimited(r)).toBe(false) // n=1 (window ends at 1000)
    expect(isRateLimited(r)).toBe(true) // n=2 > 1
    vi.setSystemTime(2000) // past the window
    expect(isRateLimited(r)).toBe(false) // bucket reset → n=1
  })

  it('tracks limits per IP independently', () => {
    vi.stubEnv('RATE_LIMIT_MAX', '1')
    expect(isRateLimited(req({ 'x-forwarded-for': '3.3.3.3' }))).toBe(false)
    expect(isRateLimited(req({ 'x-forwarded-for': '4.4.4.4' }))).toBe(false) // different IP, own bucket
  })
})
