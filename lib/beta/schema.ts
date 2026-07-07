import { z } from 'zod'

/**
 * The beta-signup contract (architecture doc §7): normalised email, consent must
 * be literally true, honeypot must be empty. Validated server-side — the form is
 * a convenience, this boundary is the guarantee.
 */
export const betaSignupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  consent: z.literal(true),
  // Honeypot: hidden field named to attract bots; humans never fill it.
  website: z.literal('').optional(),
})

export type BetaSignupInput = z.infer<typeof betaSignupSchema>
