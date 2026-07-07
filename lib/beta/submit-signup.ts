'use server'

import { betaSignupSchema } from './schema'

export type BetaResult = { ok: true } | { ok: false; error: 'invalid' | 'rate_limited' | 'server' }

/**
 * The beta-signup Server Action (shape matches React's useActionState).
 *
 * This PR ships the full contract with a STUB persist — validate → log → success.
 * TODO(follow-up PR): replace the log with the Firestore write —
 *   db.collection('waitlist').doc(email).set({ email, createdAt, source, consent, userAgent })
 * per docs/features/case-file-redesign/01-case-file-redesign-architecture.md §7
 * (email-keyed .set() = idempotent dedupe, no enumeration; creds are Q-BETA-3).
 * The BetaResult contract and the form are final now, so the swap touches one file.
 */
export async function submitBetaSignup(
  _prev: BetaResult | null,
  form: FormData,
): Promise<BetaResult> {
  const parsed = betaSignupSchema.safeParse({
    email: form.get('email'),
    consent: form.get('consent') === 'on' || form.get('consent') === 'true',
    website: (form.get('website') ?? '') as string,
  })

  if (!parsed.success) {
    return { ok: false, error: 'invalid' }
  }

  // ponytail: stub persist — the follow-up PR swaps this single line for Firestore.
  console.info('[beta] signup', parsed.data.email)
  return { ok: true }
}
