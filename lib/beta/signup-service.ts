import type { SignupInput, SignupResult, WaitlistStore } from './types'
import { isValidEmail, normalizeEmail } from './validation'

export interface CreateSignupDeps {
  store: WaitlistStore
  /** Injected clock — returns an ISO timestamp. Keeps the service deterministic/testable. */
  now: () => string
}

/**
 * Validate and persist a beta waitlist signup.
 *
 * Order is deliberate: reject bots (honeypot) first so we never run further logic
 * on spam, then validate the email, then require consent, then de-duplicate by
 * normalized email. Store failures are caught and surfaced as `store_error` rather
 * than thrown, so the calling Server Action can render a friendly message.
 */
export async function createSignup(
  input: SignupInput,
  deps: CreateSignupDeps,
): Promise<SignupResult> {
  if (input.company && input.company.trim() !== '') {
    return { ok: false, error: 'spam_detected' }
  }

  if (!isValidEmail(input.email)) {
    return { ok: false, error: 'invalid_email' }
  }

  if (!input.consent) {
    return { ok: false, error: 'consent_required' }
  }

  const email = normalizeEmail(input.email)

  try {
    if (await deps.store.has(email)) {
      return { ok: true, deduped: true }
    }

    await deps.store.add({
      email,
      consent: true,
      source: input.source?.trim() || 'website',
      createdAt: deps.now(),
    })

    return { ok: true, deduped: false }
  } catch {
    return { ok: false, error: 'store_error' }
  }
}
