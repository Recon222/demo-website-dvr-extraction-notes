/**
 * Abuse guards for the /api/extract proxy (kept out of route.ts so the rate-limit reset can
 * be exported for tests — Next forbids non-route exports from a route module).
 */

/** Reject bodies larger than this before parsing (8000 chars + envelope ≪ 50KB). */
export const MAX_BODY_BYTES = 50_000

/** Same-origin allowlist. Requests without an Origin header (server tools) are allowed. */
export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  const allow = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (allow.includes(origin)) return true
  const host = req.headers.get('host')
  try {
    return !!host && new URL(origin).host === host
  } catch {
    return false
  }
}

// In-memory per-IP token bucket (per server instance; resets on cold start — best-effort).
const buckets = new Map<string, { n: number; reset: number }>()

/** Test-only: clear the rate-limit buckets between cases. */
export function __resetRateLimit(): void {
  buckets.clear()
}

export function isRateLimited(req: Request): boolean {
  const max = Number(process.env.RATE_LIMIT_MAX) || 20
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const entry = buckets.get(ip)
  if (!entry || now > entry.reset) {
    buckets.set(ip, { n: 1, reset: now + windowMs })
    return false
  }
  entry.n += 1
  return entry.n > max
}
